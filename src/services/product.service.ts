import prisma from "../config/database";
import { getPagination } from "../utils/response";

export class ProductService {
  private normalizeQuantityField(data: Record<string, unknown>): Record<string, unknown> {
    const normalized = { ...data };
    if (Object.prototype.hasOwnProperty.call(normalized, "quantity")) {
      const raw = normalized.quantity;
      const q = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(q) || q < 0) {
        throw new Error("Quantity cannot be negative");
      }
      normalized.quantity = Math.floor(q);
    }
    return normalized;
  }

  private normalizeDateFields(data: Record<string, unknown>): Record<string, unknown> {
    const normalized = { ...data };

    const toDateTime = (value: unknown): Date | null | undefined => {
      if (value === undefined) return undefined;
      if (value === null || value === "") return null;
      if (value instanceof Date) return value;
      if (typeof value !== "string") return value as Date;

      // Accept date-only strings from frontend date inputs.
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return new Date(`${value}T00:00:00.000Z`);
      }

      return new Date(value);
    };

    if (Object.prototype.hasOwnProperty.call(normalized, "manufacturingDate")) {
      normalized.manufacturingDate = toDateTime(normalized.manufacturingDate);
    }
    if (Object.prototype.hasOwnProperty.call(normalized, "expiryDate")) {
      normalized.expiryDate = toDateTime(normalized.expiryDate);
    }

    return normalized;
  }

  async getAll(userId: string, query: Record<string, string>) {
    const { skip, take, page, limit } = getPagination(query.page, query.limit);
    const search = query.search;
    const categoryId = query.categoryId;
    const stockStatus = query.stockStatus;
    const sortBy = query.sortBy;
    const sortDir = query.sortDir === "asc" ? "asc" : "desc";

    const now = new Date();
    const expiryAlertDate = new Date(now.getTime() + 30 * 86400000);

    // Build where clause
    const where: Record<string, unknown> = { userId, isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { supplier: { contains: search, mode: "insensitive" } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    // low stock filter is handled post-query (threshold is per-product)
    if (stockStatus === "out") where.quantity = { equals: 0 };
    if (stockStatus === "expiring") {
      where.expiryDate = { lte: expiryAlertDate, gt: now };
    }
    if (stockStatus === "expired") {
      where.expiryDate = { lt: now };
    }

    const allowedSortFields = ["updatedAt", "name", "quantity", "sellingPrice", "expiryDate"];
    const sortField = allowedSortFields.includes(sortBy || "") ? sortBy : "updatedAt";

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: { select: { id: true, name: true } } },
        orderBy: { [sortField as string]: sortDir },
        skip,
        take,
      }),
      prisma.product.count({ where }),
    ]);

    // Annotate each product
    let annotated = products.map((p) => ({
      ...p,
      isLowStock: p.quantity <= p.lowStockThreshold && p.quantity > 0,
      isOutOfStock: p.quantity === 0,
      isExpired: p.expiryDate ? p.expiryDate < now : false,
      isExpiringSoon: p.expiryDate ? p.expiryDate <= expiryAlertDate && p.expiryDate > now : false,
      daysUntilExpiry: p.expiryDate
        ? Math.ceil((p.expiryDate.getTime() - now.getTime()) / 86400000)
        : null,
      profitMargin: p.sellingPrice > 0
        ? (((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100).toFixed(2)
        : "0.00",
      inventoryValue: p.quantity * p.costPrice,
    }));

    // low stock threshold is per-product, so filter post-query
    if (stockStatus === "low") annotated = annotated.filter((p) => p.isLowStock);

    return {
      products: annotated,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string, userId: string) {
    const product = await prisma.product.findFirst({
      where: { id, userId, isActive: true },
      include: {
        category: true,
        saleItems: {
          take: 10,
          orderBy: { sale: { createdAt: "desc" } },
          include: { sale: { select: { createdAt: true, totalAmount: true } } },
        },
        stockLogs: { take: 10, orderBy: { createdAt: "desc" } },
        alerts: { where: { isRead: false }, take: 5 },
      },
    });
    if (!product) throw new Error("Product not found");
    return product;
  }

  async create(userId: string, data: Record<string, unknown>) {
    // Check barcode uniqueness
    if (data.barcode) {
      const existing = await prisma.product.findFirst({ where: { barcode: data.barcode as string } });
      if (existing) throw new Error("Barcode already exists");
    }
    if (data.sku) {
      const existing = await prisma.product.findFirst({ where: { sku: data.sku as string } });
      if (existing) throw new Error("SKU already exists");
    }

    const normalizedData = this.normalizeQuantityField(this.normalizeDateFields(data));

    const product = await prisma.product.create({
      data: { ...(normalizedData as object), userId } as never,
      include: { category: { select: { id: true, name: true } } },
    });

    // Log initial stock
    if ((product.quantity as number) > 0) {
      await prisma.stockLog.create({
        data: {
          productId: product.id,
          type: "IN",
          quantity: product.quantity,
          reason: "Initial stock entry",
          previousQty: 0,
          newQty: product.quantity,
        },
      });
    }

    return product;
  }

  async update(id: string, userId: string, data: Record<string, unknown>) {
    const product = await prisma.product.findFirst({ where: { id, userId, isActive: true } });
    if (!product) throw new Error("Product not found");

    if (data.barcode && data.barcode !== product.barcode) {
      const existing = await prisma.product.findFirst({
        where: { barcode: data.barcode as string, id: { not: id } },
      });
      if (existing) throw new Error("Barcode already exists");
    }

    const normalizedData = this.normalizeQuantityField(this.normalizeDateFields(data));

    return prisma.product.update({
      where: { id },
      data: normalizedData as never,
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async delete(id: string, userId: string) {
    const product = await prisma.product.findFirst({ where: { id, userId, isActive: true } });
    if (!product) throw new Error("Product not found");
    return prisma.product.update({ where: { id }, data: { isActive: false } });
  }

  async adjustStock(
    id: string,
    userId: string,
    type: "IN" | "OUT" | "ADJUSTMENT",
    quantity: number,
    reason?: string
  ) {
    const product = await prisma.product.findFirst({ where: { id, userId, isActive: true } });
    if (!product) throw new Error("Product not found");

    let newQty = product.quantity;
    if (type === "IN") newQty += quantity;
    else if (type === "OUT") {
      if (quantity > product.quantity) throw new Error("Insufficient stock");
      newQty -= quantity;
    } else {
      if (quantity < 0) throw new Error("Quantity cannot be negative");
      newQty = quantity; // ADJUSTMENT sets absolute value
    }

    if (newQty < 0) throw new Error("Quantity cannot be negative");

    const [updated] = await Promise.all([
      prisma.product.update({ where: { id }, data: { quantity: newQty } }),
      prisma.stockLog.create({
        data: {
          productId: id,
          type,
          quantity,
          reason: reason || `Manual ${type.toLowerCase()} adjustment`,
          previousQty: product.quantity,
          newQty,
        },
      }),
    ]);

    return updated;
  }

  async getLowStock(userId: string) {
    const products = await prisma.product.findMany({
      where: {
        userId,
        isActive: true,
        quantity: { gt: 0 },
      },
      include: { category: { select: { name: true } } },
    });
    return products
      .filter((p) => p.quantity <= p.lowStockThreshold)
      .map((p) => ({
        ...p,
        urgency: p.quantity === 0 ? "critical" : p.quantity <= p.lowStockThreshold / 2 ? "high" : "medium",
      }));
  }

  async getExpiringProducts(userId: string, days = 30) {
    const now = new Date();
    const alertDate = new Date(now.getTime() + days * 86400000);

    return prisma.product.findMany({
      where: {
        userId,
        isActive: true,
        expiryDate: { lte: alertDate },
      },
      include: { category: { select: { name: true } } },
      orderBy: { expiryDate: "asc" },
    });
  }

  async getStockLogs(productId: string, userId: string) {
    const product = await prisma.product.findFirst({ where: { id: productId, userId } });
    if (!product) throw new Error("Product not found");

    return prisma.stockLog.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async getByBarcode(barcode: string, userId: string) {
    const product = await prisma.product.findFirst({
      where: { barcode, userId, isActive: true },
      include: { category: { select: { id: true, name: true } } },
    });
    if (!product) throw new Error("Product not found");
    return product;
  }
}

export default new ProductService();
