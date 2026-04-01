import prisma from "../config/database";

export class AlertService {
  async getAlerts(userId: string, unreadOnly = false) {
    return prisma.alert.findMany({
      where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
      include: { product: { select: { id: true, name: true, unit: true, quantity: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async markAsRead(id: string, userId: string) {
    const alert = await prisma.alert.findFirst({ where: { id, userId } });
    if (!alert) throw new Error("Alert not found");
    return prisma.alert.update({ where: { id }, data: { isRead: true } });
  }

  async markAllAsRead(userId: string) {
    return prisma.alert.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  }

  async getUnreadCount(userId: string) {
    return prisma.alert.count({ where: { userId, isRead: false } });
  }

  // Run scheduled checks and generate alerts
  async runAlertChecks(userId: string) {
    const now = new Date();
    const expiryAlert = new Date(now.getTime() + 30 * 86400000);
    const generated: string[] = [];

    const products = await prisma.product.findMany({
      where: { userId, isActive: true },
    });

    for (const p of products) {
      // Low stock check
      if (p.quantity > 0 && p.quantity <= p.lowStockThreshold) {
        const existing = await prisma.alert.findFirst({
          where: { userId, productId: p.id, type: "LOW_STOCK", isRead: false },
        });
        if (!existing) {
          await prisma.alert.create({
            data: {
              userId,
              productId: p.id,
              type: "LOW_STOCK",
              message: `"${p.name}" is running low: ${p.quantity} ${p.unit}(s) remaining (threshold: ${p.lowStockThreshold})`,
            },
          });
          generated.push(`LOW_STOCK: ${p.name}`);
        }
      }

      // Out of stock
      if (p.quantity === 0) {
        const existing = await prisma.alert.findFirst({
          where: { userId, productId: p.id, type: "OUT_OF_STOCK", isRead: false },
        });
        if (!existing) {
          await prisma.alert.create({
            data: {
              userId,
              productId: p.id,
              type: "OUT_OF_STOCK",
              message: `"${p.name}" is OUT OF STOCK. Reorder immediately.`,
            },
          });
          generated.push(`OUT_OF_STOCK: ${p.name}`);
        }
      }

      // Expiry checks
      if (p.expiryDate) {
        if (p.expiryDate < now) {
          const existing = await prisma.alert.findFirst({
            where: { userId, productId: p.id, type: "EXPIRED", isRead: false },
          });
          if (!existing) {
            await prisma.alert.create({
              data: {
                userId,
                productId: p.id,
                type: "EXPIRED",
                message: `"${p.name}" EXPIRED on ${p.expiryDate.toDateString()}. Remove from shelves.`,
              },
            });
            generated.push(`EXPIRED: ${p.name}`);
          }
        } else if (p.expiryDate <= expiryAlert) {
          const daysLeft = Math.ceil((p.expiryDate.getTime() - now.getTime()) / 86400000);
          const existing = await prisma.alert.findFirst({
            where: { userId, productId: p.id, type: "EXPIRY_SOON", isRead: false },
          });
          if (!existing) {
            await prisma.alert.create({
              data: {
                userId,
                productId: p.id,
                type: "EXPIRY_SOON",
                message: `"${p.name}" expires in ${daysLeft} day(s) on ${p.expiryDate.toDateString()}. Consider discounting.`,
              },
            });
            generated.push(`EXPIRY_SOON: ${p.name} (${daysLeft}d)`);
          }
        }
      }
    }

    return { generated, count: generated.length };
  }

  async deleteAlert(id: string, userId: string) {
    const alert = await prisma.alert.findFirst({ where: { id, userId } });
    if (!alert) throw new Error("Alert not found");
    return prisma.alert.delete({ where: { id } });
  }
}

export default new AlertService();
