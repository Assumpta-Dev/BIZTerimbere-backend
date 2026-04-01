import prisma from "../config/database";

export class CategoryService {
  async getAll() {
    return prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });
  }

  async getById(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          where: { isActive: true },
          select: { id: true, name: true, quantity: true, sellingPrice: true, unit: true },
        },
        _count: { select: { products: true } },
      },
    });
    if (!category) throw new Error("Category not found");
    return category;
  }

  async create(name: string, description?: string) {
    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing) throw new Error("Category already exists");
    return prisma.category.create({ data: { name, description } });
  }

  async update(id: string, data: { name?: string; description?: string }) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) throw new Error("Category not found");
    if (data.name && data.name !== category.name) {
      const dup = await prisma.category.findUnique({ where: { name: data.name } });
      if (dup) throw new Error("Category name already in use");
    }
    return prisma.category.update({ where: { id }, data });
  }

  async delete(id: string) {
    const count = await prisma.product.count({ where: { categoryId: id, isActive: true } });
    if (count > 0) throw new Error(`Cannot delete: ${count} active product(s) in this category`);
    return prisma.category.delete({ where: { id } });
  }
}

export default new CategoryService();
