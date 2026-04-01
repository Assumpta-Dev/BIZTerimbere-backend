import prisma from "../config/database";

export class AnalyticsService {
  async getDashboardStats(userId: string) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 86400000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const expiryAlert = new Date(now.getTime() + 30 * 86400000);

    const [
      totalProducts,
      outOfStockCount,
      expiredCount,
      expiringSoonCount,
      todaySales,
      monthSales,
      allActiveProducts,
    ] = await Promise.all([
      prisma.product.count({ where: { userId, isActive: true } }),
      prisma.product.count({ where: { userId, isActive: true, quantity: 0 } }),
      prisma.product.count({ where: { userId, isActive: true, expiryDate: { lt: now } } }),
      prisma.product.count({
        where: { userId, isActive: true, expiryDate: { lte: expiryAlert, gt: now } },
      }),
      prisma.sale.aggregate({
        where: { userId, createdAt: { gte: startOfDay, lt: endOfDay } },
        _sum: { totalAmount: true, totalProfit: true },
        _count: true,
      }),
      prisma.sale.aggregate({
        where: { userId, createdAt: { gte: startOfMonth } },
        _sum: { totalAmount: true, totalProfit: true },
        _count: true,
      }),
      prisma.product.findMany({
        where: { userId, isActive: true },
        select: { quantity: true, costPrice: true, sellingPrice: true, lowStockThreshold: true },
      }),
    ]);

    const lowStockCount = allActiveProducts.filter(
      (p) => p.quantity > 0 && p.quantity <= p.lowStockThreshold
    ).length;

    const totalInventoryValue = allActiveProducts.reduce(
      (sum, p) => sum + p.quantity * p.costPrice,
      0
    );
    const totalInventoryRetailValue = allActiveProducts.reduce(
      (sum, p) => sum + p.quantity * p.sellingPrice,
      0
    );

    return {
      totalProducts,
      lowStockProducts: lowStockCount,
      outOfStockProducts: outOfStockCount,
      expiringSoonProducts: expiringSoonCount,
      expiredProducts: expiredCount,
      todayRevenue: todaySales._sum.totalAmount || 0,
      todayProfit: todaySales._sum.totalProfit || 0,
      todaySalesCount: todaySales._count,
      monthRevenue: monthSales._sum.totalAmount || 0,
      monthProfit: monthSales._sum.totalProfit || 0,
      monthSalesCount: monthSales._count,
      totalInventoryValue,
      totalInventoryRetailValue,
      potentialProfit: totalInventoryRetailValue - totalInventoryValue,
    };
  }

  async getSalesChart(userId: string, period: "7d" | "30d" | "90d" | "12m" = "30d") {
    const now = new Date();
    let startDate: Date;
    let groupBy: "day" | "month";

    switch (period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 86400000);
        groupBy = "day";
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 86400000);
        groupBy = "day";
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 86400000);
        groupBy = "day";
        break;
      case "12m":
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        groupBy = "month";
        break;
    }

    const sales = await prisma.sale.findMany({
      where: { userId, createdAt: { gte: startDate } },
      select: { totalAmount: true, totalProfit: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    if (groupBy === "day") {
      const map: Record<string, { revenue: number; profit: number; count: number }> = {};
      const dayCount = period === "7d" ? 7 : period === "30d" ? 30 : 90;

      for (let i = dayCount - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000);
        const key = d.toISOString().split("T")[0];
        map[key] = { revenue: 0, profit: 0, count: 0 };
      }

      for (const sale of sales) {
        const key = sale.createdAt.toISOString().split("T")[0];
        if (map[key]) {
          map[key].revenue += sale.totalAmount;
          map[key].profit += sale.totalProfit;
          map[key].count += 1;
        }
      }
      return Object.entries(map).map(([date, v]) => ({ date, ...v }));
    } else {
      const map: Record<string, { revenue: number; profit: number; count: number }> = {};
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        map[key] = { revenue: 0, profit: 0, count: 0 };
      }
      for (const sale of sales) {
        const key = `${sale.createdAt.getFullYear()}-${String(sale.createdAt.getMonth() + 1).padStart(2, "0")}`;
        if (map[key]) {
          map[key].revenue += sale.totalAmount;
          map[key].profit += sale.totalProfit;
          map[key].count += 1;
        }
      }
      return Object.entries(map).map(([month, v]) => ({ date: month, ...v }));
    }
  }

  async getTopProducts(userId: string, limit = 10, period = "30d") {
    const now = new Date();
    const startDate = period === "7d"
      ? new Date(now.getTime() - 7 * 86400000)
      : period === "90d"
      ? new Date(now.getTime() - 90 * 86400000)
      : new Date(now.getTime() - 30 * 86400000);

    const items = await prisma.saleItem.groupBy({
      by: ["productId"],
      where: {
        sale: { userId, createdAt: { gte: startDate } },
      },
      _sum: { quantity: true, totalPrice: true, profit: true },
      _count: { productId: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: limit,
    });

    const productDetails = await prisma.product.findMany({
      where: { id: { in: items.map((i) => i.productId) } },
      include: { category: { select: { name: true } } },
    });

    return items.map((item) => {
      const product = productDetails.find((p) => p.id === item.productId);
      return {
        productId: item.productId,
        productName: product?.name || "Unknown",
        category: product?.category?.name || "Unknown",
        totalQuantitySold: item._sum.quantity || 0,
        totalRevenue: item._sum.totalPrice || 0,
        totalProfit: item._sum.profit || 0,
        transactionCount: item._count.productId,
        currentStock: product?.quantity || 0,
      };
    });
  }

  async getCategoryBreakdown(userId: string, period = "30d") {
    const now = new Date();
    const startDate = period === "7d"
      ? new Date(now.getTime() - 7 * 86400000)
      : new Date(now.getTime() - 30 * 86400000);

    const items = await prisma.saleItem.findMany({
      where: { sale: { userId, createdAt: { gte: startDate } } },
      include: {
        product: { include: { category: { select: { id: true, name: true } } } },
      },
    });

    const map: Record<string, { name: string; revenue: number; profit: number; quantity: number }> = {};
    for (const item of items) {
      const catId = item.product.category.id;
      const catName = item.product.category.name;
      if (!map[catId]) map[catId] = { name: catName, revenue: 0, profit: 0, quantity: 0 };
      map[catId].revenue += item.totalPrice;
      map[catId].profit += item.profit;
      map[catId].quantity += item.quantity;
    }

    const total = Object.values(map).reduce((s, v) => s + v.revenue, 0);
    return Object.entries(map)
      .map(([id, v]) => ({ categoryId: id, ...v, percentage: total > 0 ? ((v.revenue / total) * 100).toFixed(1) : "0" }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  async getInventoryStatus(userId: string) {
    const now = new Date();
    const expiryAlert = new Date(now.getTime() + 30 * 86400000);

    const products = await prisma.product.findMany({
      where: { userId, isActive: true },
      include: { category: { select: { name: true } } },
    });

    const healthy = products.filter((p) => p.quantity > p.lowStockThreshold);
    const low = products.filter((p) => p.quantity > 0 && p.quantity <= p.lowStockThreshold);
    const out = products.filter((p) => p.quantity === 0);
    const expiringSoon = products.filter(
      (p) => p.expiryDate && p.expiryDate <= expiryAlert && p.expiryDate > now
    );
    const expired = products.filter((p) => p.expiryDate && p.expiryDate < now);

    return {
      summary: {
        healthy: healthy.length,
        low: low.length,
        outOfStock: out.length,
        expiringSoon: expiringSoon.length,
        expired: expired.length,
        total: products.length,
      },
      lowStockProducts: low.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category.name,
        quantity: p.quantity,
        threshold: p.lowStockThreshold,
        unit: p.unit,
      })),
      outOfStockProducts: out.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category.name,
        unit: p.unit,
      })),
      expiringSoonProducts: expiringSoon.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category.name,
        expiryDate: p.expiryDate,
        daysLeft: p.expiryDate
          ? Math.ceil((p.expiryDate.getTime() - now.getTime()) / 86400000)
          : null,
        quantity: p.quantity,
      })),
      expiredProducts: expired.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category.name,
        expiryDate: p.expiryDate,
        daysExpired: p.expiryDate
          ? Math.ceil((now.getTime() - p.expiryDate.getTime()) / 86400000)
          : null,
        quantity: p.quantity,
        estimatedLoss: p.quantity * p.costPrice,
      })),
    };
  }

  async getProfitAnalysis(userId: string, period = "30d") {
    const now = new Date();
    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const startDate = new Date(now.getTime() - days * 86400000);

    const sales = await prisma.sale.findMany({
      where: { userId, createdAt: { gte: startDate } },
      include: { saleItems: { include: { product: { select: { name: true, category: { select: { name: true } } } } } } },
    });

    const totalRevenue = sales.reduce((s, sale) => s + sale.totalAmount, 0);
    const totalProfit = sales.reduce((s, sale) => s + sale.totalProfit, 0);
    const totalCost = totalRevenue - totalProfit;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Payment mode breakdown
    const paymentBreakdown: Record<string, { count: number; revenue: number }> = {};
    for (const sale of sales) {
      const mode = sale.paymentMode;
      if (!paymentBreakdown[mode]) paymentBreakdown[mode] = { count: 0, revenue: 0 };
      paymentBreakdown[mode].count++;
      paymentBreakdown[mode].revenue += sale.totalAmount;
    }

    return {
      period,
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin: profitMargin.toFixed(2),
      totalTransactions: sales.length,
      avgTransactionValue: sales.length > 0 ? totalRevenue / sales.length : 0,
      avgDailyRevenue: totalRevenue / days,
      paymentBreakdown: Object.entries(paymentBreakdown).map(([mode, v]) => ({ mode, ...v })),
    };
  }
}

export default new AnalyticsService();
