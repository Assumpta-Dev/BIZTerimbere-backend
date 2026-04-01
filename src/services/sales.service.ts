import prisma from "../config/database";
import { getPagination } from "../utils/response";

interface SaleItemInput {
  productId: string;
  quantity: number;
  unitPrice?: number;
}

interface SaleItemData {
  productId: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  totalPrice: number;
  profit: number;
}

export class SalesService {
  async createSale(userId: string, items: SaleItemInput[], paymentMode: string, notes?: string) {
    // Validate and fetch all products
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, userId, isActive: true },
    });

    if (products.length !== items.length) {
      throw new Error("One or more products not found or do not belong to you");
    }

    let totalAmount = 0;
    let totalProfit = 0;
    const saleItemsData: SaleItemData[] = [];

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);
      if (product.quantity < item.quantity) {
        throw new Error(`Insufficient stock for "${product.name}". Available: ${product.quantity}`);
      }

      const unitPrice = item.unitPrice ?? product.sellingPrice;
      const totalPrice = item.quantity * unitPrice;
      const profit = (unitPrice - product.costPrice) * item.quantity;

      totalAmount += totalPrice;
      totalProfit += profit;

      saleItemsData.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice,
        costPrice: product.costPrice,
        totalPrice,
        profit,
      });
    }

    // Create sale and update stock in a transaction
    const sale = await prisma.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          userId,
          totalAmount,
          totalProfit,
          paymentMode: paymentMode as never,
          notes,
          saleItems: { create: saleItemsData },
        },
        include: {
          saleItems: {
            include: { product: { select: { id: true, name: true, unit: true } } },
          },
        },
      });

      // Update product quantities and log stock movement
      for (const item of saleItemsData) {
        const product = products.find((p) => p.id === item.productId)!;
        const newQty = product.quantity - item.quantity;

        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: newQty },
        });

        await tx.stockLog.create({
          data: {
            productId: item.productId,
            type: "SALE",
            quantity: item.quantity,
            reason: `Sale #${newSale.id.slice(0, 8)}`,
            previousQty: product.quantity,
            newQty,
          },
        });

        // Create alert if now low/out of stock
        if (newQty === 0) {
          await tx.alert.create({
            data: {
              userId,
              productId: item.productId,
              type: "OUT_OF_STOCK",
              message: `"${product.name}" is now OUT OF STOCK`,
            },
          });
        } else if (newQty <= product.lowStockThreshold) {
          await tx.alert.create({
            data: {
              userId,
              productId: item.productId,
              type: "LOW_STOCK",
              message: `"${product.name}" is running low. Only ${newQty} ${product.unit}(s) remaining`,
            },
          });
        }
      }

      return newSale;
    });

    return sale;
  }

  async getSales(userId: string, query: Record<string, string>) {
    const { skip, take, page, limit } = getPagination(query.page, query.limit);
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    const where: Record<string, unknown> = { userId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, unknown>).gte = startDate;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        (where.createdAt as Record<string, unknown>).lte = end;
      }
    }
    if (query.paymentMode) where.paymentMode = query.paymentMode;

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          saleItems: {
            include: { product: { select: { id: true, name: true, unit: true, category: { select: { name: true } } } } },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.sale.count({ where }),
    ]);

    return { sales, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getSaleById(id: string, userId: string) {
    const sale = await prisma.sale.findFirst({
      where: { id, userId },
      include: {
        saleItems: {
          include: { product: { select: { id: true, name: true, unit: true, barcode: true } } },
        },
      },
    });
    if (!sale) throw new Error("Sale not found");
    return sale;
  }

  async getTodaySummary(userId: string) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 86400000);

    const sales = await prisma.sale.findMany({
      where: { userId, createdAt: { gte: startOfDay, lt: endOfDay } },
      include: { saleItems: true },
    });

    const totalRevenue = sales.reduce((s, sale) => s + sale.totalAmount, 0);
    const totalProfit = sales.reduce((s, sale) => s + sale.totalProfit, 0);
    const totalTransactions = sales.length;
    const totalItemsSold = sales.reduce(
      (s, sale) => s + sale.saleItems.reduce((si, item) => si + item.quantity, 0),
      0
    );

    // Hourly breakdown
    const hourlyMap: Record<number, { revenue: number; count: number }> = {};
    for (const sale of sales) {
      const hour = new Date(sale.createdAt).getHours();
      if (!hourlyMap[hour]) hourlyMap[hour] = { revenue: 0, count: 0 };
      hourlyMap[hour].revenue += sale.totalAmount;
      hourlyMap[hour].count += 1;
    }
    const hourlyBreakdown = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      revenue: hourlyMap[h]?.revenue || 0,
      transactions: hourlyMap[h]?.count || 0,
    }));

    return { totalRevenue, totalProfit, totalTransactions, totalItemsSold, hourlyBreakdown };
  }

  async deleteSale(id: string, userId: string) {
    const sale = await prisma.sale.findFirst({
      where: { id, userId },
      include: { saleItems: true },
    });
    if (!sale) throw new Error("Sale not found");

    // Restore stock
    await prisma.$transaction(async (tx) => {
      for (const item of sale.saleItems) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) continue;
        const newQty = product.quantity + item.quantity;
        await tx.product.update({ where: { id: item.productId }, data: { quantity: newQty } });
        await tx.stockLog.create({
          data: {
            productId: item.productId,
            type: "RETURN",
            quantity: item.quantity,
            reason: `Sale #${id.slice(0, 8)} deleted/refunded`,
            previousQty: product.quantity,
            newQty,
          },
        });
      }
      await tx.sale.delete({ where: { id } });
    });

    return { message: "Sale deleted and stock restored" };
  }
}

export default new SalesService();
