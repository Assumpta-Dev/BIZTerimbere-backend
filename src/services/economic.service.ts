import axios from "axios";
import prisma from "../config/database";
import logger from "../config/logger";

export class EconomicService {
  private readonly WORLD_BANK_BASE = "https://api.worldbank.org/v2";
  private readonly EXCHANGE_RATE_BASE = "https://api.exchangerate-api.com/v4/latest";

  // Fetch Rwanda CPI / Inflation from World Bank
  async fetchInflationData(): Promise<{ value: number | null; year: number; source: string }> {
    try {
      const url = `${this.WORLD_BANK_BASE}/country/RW/indicator/FP.CPI.TOTL.ZG?format=json&mrv=3`;
      const { data } = await axios.get(url, { timeout: 8000 });
      const entries: Array<{ value: number | null; date: string }> = data[1] || [];
      const latest = entries.find((e) => e.value !== null);

      if (latest?.value !== null && latest) {
        // Upsert into DB
        await prisma.economicData.upsert({
          where: {
            country_indicator_year: {
              country: "RW",
              indicator: "inflation_rate",
              year: parseInt(latest.date),
            },
          },
          update: { value: latest.value as number, fetchedAt: new Date() },
          create: {
            country: "RW",
            indicator: "inflation_rate",
            value: latest.value as number,
            year: parseInt(latest.date),
            source: "World Bank",
          },
        });
        return { value: latest.value as number, year: parseInt(latest.date), source: "World Bank" };
      }
    } catch (err) {
      logger.warn("World Bank API unavailable, using cached data");
    }

    // Fallback to DB
    const cached = await prisma.economicData.findFirst({
      where: { country: "RW", indicator: "inflation_rate" },
      orderBy: { year: "desc" },
    });
    return {
      value: cached?.value ?? 14.9,
      year: cached?.year ?? 2024,
      source: cached ? "Cached (World Bank)" : "Default fallback",
    };
  }

  // Fetch USD/RWF exchange rate
  async fetchExchangeRate(): Promise<{ rate: number; source: string }> {
    try {
      const url = `${this.EXCHANGE_RATE_BASE}/USD`;
      const { data } = await axios.get(url, { timeout: 8000 });
      const rate: number = data.rates?.RWF || data.rates?.rwf;

      if (rate) {
        await prisma.exchangeRate.create({
          data: { fromCurrency: "USD", toCurrency: "RWF", rate },
        });
        return { rate, source: "ExchangeRate-API" };
      }
    } catch (err) {
      logger.warn("Exchange Rate API unavailable, using cached data");
    }

    const cached = await prisma.exchangeRate.findFirst({
      where: { fromCurrency: "USD", toCurrency: "RWF" },
      orderBy: { fetchedAt: "desc" },
    });
    return { rate: cached?.rate ?? 1320, source: "Cached" };
  }

  // Get combined economic indicators
  async getEconomicIndicators() {
    const [inflation, exchange] = await Promise.all([
      this.fetchInflationData(),
      this.fetchExchangeRate(),
    ]);

    let recommendation: string;
    let adjustmentFactor: number;
    const rate = inflation.value ?? 14.9;

    if (rate > 15) {
      recommendation = "HIGH INFLATION: Increase selling prices by 12–18% to protect margins.";
      adjustmentFactor = 1.15;
    } else if (rate > 8) {
      recommendation = "MODERATE INFLATION: Consider a 5–10% price increase on cost-sensitive products.";
      adjustmentFactor = 1.07;
    } else if (rate > 0) {
      recommendation = "LOW INFLATION: Minor price adjustments (2–4%) recommended.";
      adjustmentFactor = 1.03;
    } else {
      recommendation = "DEFLATION: Review pricing carefully; aggressive discounts may hurt margins.";
      adjustmentFactor = 0.98;
    }

    return {
      inflationRate: inflation.value,
      inflationYear: inflation.year,
      inflationSource: inflation.source,
      exchangeRate: exchange.rate,
      exchangeSource: exchange.source,
      currency: "RWF",
      country: "Rwanda",
      recommendation,
      priceAdjustmentFactor: adjustmentFactor,
      fetchedAt: new Date(),
    };
  }

  // Generate price suggestions for all products of a user
  async getPriceSuggestions(userId: string) {
    const [products, indicators] = await Promise.all([
      prisma.product.findMany({
        where: { userId, isActive: true },
        include: { category: { select: { name: true } } },
      }),
      this.getEconomicIndicators(),
    ]);

    const { priceAdjustmentFactor, inflationRate } = indicators;

    const suggestions = products.map((p) => {
      const currentMargin = p.sellingPrice > 0
        ? ((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100
        : 0;

      const suggestedMin = Math.ceil(p.costPrice * 1.1); // at least 10% margin
      const suggestedMax = Math.ceil(p.costPrice * priceAdjustmentFactor * 1.35); // adjusted for inflation + 35% margin

      const suggestedIdeal = Math.ceil(p.costPrice * priceAdjustmentFactor * 1.25);
      const suggestedMargin = suggestedIdeal > 0
        ? ((suggestedIdeal - p.costPrice) / suggestedIdeal) * 100
        : 0;

      let status: string;
      let urgency: "low" | "medium" | "high";
      if (p.sellingPrice < suggestedMin) {
        status = "UNDERPRICED — selling below minimum recommended price";
        urgency = "high";
      } else if (p.sellingPrice > suggestedMax) {
        status = "OVERPRICED — may reduce sales volume";
        urgency = "medium";
      } else {
        status = "WITHIN optimal price range";
        urgency = "low";
      }

      return {
        productId: p.id,
        productName: p.name,
        category: p.category.name,
        currentCostPrice: p.costPrice,
        currentSellingPrice: p.sellingPrice,
        suggestedMinPrice: suggestedMin,
        suggestedMaxPrice: suggestedMax,
        suggestedIdealPrice: suggestedIdeal,
        currentMargin: parseFloat(currentMargin.toFixed(2)),
        suggestedMargin: parseFloat(suggestedMargin.toFixed(2)),
        status,
        urgency,
        adjustmentFactor: priceAdjustmentFactor,
        inflationRate,
      };
    });

    // Save suggestions to products
    await Promise.all(
      suggestions.map((s) =>
        prisma.product.update({
          where: { id: s.productId },
          data: {
            suggestedMinPrice: s.suggestedMinPrice,
            suggestedMaxPrice: s.suggestedMaxPrice,
          },
        })
      )
    );

    const highUrgency = suggestions.filter((s) => s.urgency === "high");
    if (highUrgency.length > 0) {
      await Promise.all(
        highUrgency.slice(0, 5).map((s) =>
          prisma.alert.create({
            data: {
              userId,
              productId: s.productId,
              type: "PRICE_SUGGESTION",
              message: `"${s.productName}" is ${s.status}. Suggested range: ${s.suggestedMinPrice.toLocaleString()} – ${s.suggestedMaxPrice.toLocaleString()} RWF`,
            },
          })
        )
      );
    }

    return {
      indicators,
      suggestions: suggestions.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.urgency] - order[b.urgency];
      }),
      summary: {
        total: suggestions.length,
        underpriced: suggestions.filter((s) => s.urgency === "high").length,
        overpriced: suggestions.filter((s) => s.urgency === "medium").length,
        optimal: suggestions.filter((s) => s.urgency === "low").length,
      },
    };
  }

  async getHistoricalRates(country = "RW", years = 5) {
    try {
      const url = `${this.WORLD_BANK_BASE}/country/${country}/indicator/FP.CPI.TOTL.ZG?format=json&mrv=${years}`;
      const { data } = await axios.get(url, { timeout: 8000 });
      const entries: Array<{ value: number | null; date: string }> = data[1] || [];
      return entries
        .filter((e) => e.value !== null)
        .map((e) => ({ year: e.date, inflationRate: e.value }))
        .sort((a, b) => parseInt(a.year) - parseInt(b.year));
    } catch {
      const cached = await prisma.economicData.findMany({
        where: { country, indicator: "inflation_rate" },
        orderBy: { year: "asc" },
        take: years,
      });
      return cached.map((e) => ({ year: String(e.year), inflationRate: e.value }));
    }
  }
}

export default new EconomicService();
