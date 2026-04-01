import { PrismaClient, StockMethod } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create default user
  const hashedPassword = await bcrypt.hash("password123", 10);
  const user = await prisma.user.upsert({
    where: { email: "admin@bizterimbere.rw" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@bizterimbere.rw",
      password: hashedPassword,
      businessName: "BIZTerimbere Supermarket",
      role: "OWNER",
    },
  });
  console.log("✅ User created:", user.email);

  // Create categories
  const categories = [
    { name: "Beverages", description: "Drinks, juices, water, sodas" },
    { name: "Dairy & Eggs", description: "Milk, cheese, yogurt, eggs" },
    { name: "Bakery & Bread", description: "Bread, cakes, pastries, biscuits" },
    { name: "Meat & Poultry", description: "Beef, chicken, pork, fish" },
    { name: "Fruits & Vegetables", description: "Fresh produce" },
    { name: "Grains & Cereals", description: "Rice, maize, wheat flour, sorghum" },
    { name: "Oils & Fats", description: "Cooking oil, butter, margarine" },
    { name: "Condiments & Spices", description: "Salt, sugar, spices, sauces" },
    { name: "Personal Care", description: "Soap, shampoo, toothpaste, lotion" },
    { name: "Household Cleaning", description: "Detergents, disinfectants, bleach" },
    { name: "Snacks & Confectionery", description: "Chips, sweets, chocolates" },
    { name: "Baby Products", description: "Baby food, diapers, formula" },
  ];

  const createdCategories: Record<string, string> = {};
  for (const cat of categories) {
    const c = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    createdCategories[cat.name] = c.id;
  }
  console.log("✅ Categories created:", Object.keys(createdCategories).length);

  // Create products with realistic Rwanda supermarket data
  const now = new Date();
  const products = [
    // Beverages
    {
      name: "Inyange Water 500ml",
      barcode: "6001100000001",
      sku: "BEV-001",
      categoryId: createdCategories["Beverages"],
      costPrice: 250, quantity: 200, sellingPrice: 350,
      lowStockThreshold: 30, unit: "bottle",
      manufacturingDate: new Date(now.getTime() - 30 * 86400000),
      expiryDate: new Date(now.getTime() + 365 * 86400000),
      supplier: "Inyange Industries",
    },
    {
      name: "Coca-Cola 500ml",
      barcode: "6001100000002",
      sku: "BEV-002",
      categoryId: createdCategories["Beverages"],
      costPrice: 400, quantity: 150, sellingPrice: 600,
      lowStockThreshold: 24, unit: "bottle",
      manufacturingDate: new Date(now.getTime() - 14 * 86400000),
      expiryDate: new Date(now.getTime() + 180 * 86400000),
      supplier: "BRALIRWA",
    },
    {
      name: "Fanta Orange 500ml",
      barcode: "6001100000003",
      sku: "BEV-003",
      categoryId: createdCategories["Beverages"],
      costPrice: 400, quantity: 7, sellingPrice: 600,
      lowStockThreshold: 24, unit: "bottle",
      manufacturingDate: new Date(now.getTime() - 20 * 86400000),
      expiryDate: new Date(now.getTime() + 160 * 86400000),
      supplier: "BRALIRWA",
    },
    {
      name: "Azam Juice 1L Mango",
      barcode: "6001100000004",
      sku: "BEV-004",
      categoryId: createdCategories["Beverages"],
      costPrice: 800, quantity: 60, sellingPrice: 1200,
      lowStockThreshold: 12, unit: "pack",
      manufacturingDate: new Date(now.getTime() - 10 * 86400000),
      expiryDate: new Date(now.getTime() + 90 * 86400000),
      supplier: "Azam Tanzania",
    },
    {
      name: "Primus Beer 500ml",
      barcode: "6001100000005",
      sku: "BEV-005",
      categoryId: createdCategories["Beverages"],
      costPrice: 600, quantity: 120, sellingPrice: 900,
      lowStockThreshold: 24, unit: "bottle",
      manufacturingDate: new Date(now.getTime() - 7 * 86400000),
      expiryDate: new Date(now.getTime() + 120 * 86400000),
      supplier: "BRALIRWA",
    },

    // Dairy & Eggs
    {
      name: "Inyange Fresh Milk 1L",
      barcode: "6001200000001",
      sku: "DAI-001",
      categoryId: createdCategories["Dairy & Eggs"],
      costPrice: 900, quantity: 45, sellingPrice: 1200,
      lowStockThreshold: 20, unit: "litre",
      manufacturingDate: new Date(now.getTime() - 2 * 86400000),
      expiryDate: new Date(now.getTime() + 5 * 86400000),
      supplier: "Inyange Industries",
    },
    {
      name: "Eggs (Tray of 30)",
      barcode: "6001200000002",
      sku: "DAI-002",
      categoryId: createdCategories["Dairy & Eggs"],
      costPrice: 3000, quantity: 25, sellingPrice: 4000,
      lowStockThreshold: 10, unit: "tray",
      manufacturingDate: new Date(now.getTime() - 3 * 86400000),
      expiryDate: new Date(now.getTime() + 21 * 86400000),
      supplier: "Local Farm",
    },
    {
      name: "Inyange Yogurt 500g Strawberry",
      barcode: "6001200000003",
      sku: "DAI-003",
      categoryId: createdCategories["Dairy & Eggs"],
      costPrice: 1200, quantity: 8, sellingPrice: 1800,
      lowStockThreshold: 15, unit: "cup",
      manufacturingDate: new Date(now.getTime() - 4 * 86400000),
      expiryDate: new Date(now.getTime() + 14 * 86400000),
      supplier: "Inyange Industries",
    },
    {
      name: "Butter 250g",
      barcode: "6001200000004",
      sku: "DAI-004",
      categoryId: createdCategories["Dairy & Eggs"],
      costPrice: 1800, quantity: 30, sellingPrice: 2500,
      lowStockThreshold: 10, unit: "piece",
      manufacturingDate: new Date(now.getTime() - 15 * 86400000),
      expiryDate: new Date(now.getTime() + 60 * 86400000),
      supplier: "Inyange Industries",
    },

    // Bakery
    {
      name: "White Bread Loaf 400g",
      barcode: "6001300000001",
      sku: "BAK-001",
      categoryId: createdCategories["Bakery & Bread"],
      costPrice: 800, quantity: 35, sellingPrice: 1200,
      lowStockThreshold: 15, unit: "loaf",
      manufacturingDate: new Date(now.getTime() - 1 * 86400000),
      expiryDate: new Date(now.getTime() + 3 * 86400000),
      supplier: "Kigali Bakery",
    },
    {
      name: "Biscuits Assorted 200g",
      barcode: "6001300000002",
      sku: "BAK-002",
      categoryId: createdCategories["Bakery & Bread"],
      costPrice: 600, quantity: 80, sellingPrice: 900,
      lowStockThreshold: 20, unit: "pack",
      manufacturingDate: new Date(now.getTime() - 30 * 86400000),
      expiryDate: new Date(now.getTime() + 120 * 86400000),
      supplier: "Azam",
    },

    // Grains & Cereals
    {
      name: "Rice 5kg (Akabanga)",
      barcode: "6001600000001",
      sku: "GRA-001",
      categoryId: createdCategories["Grains & Cereals"],
      costPrice: 5500, quantity: 100, sellingPrice: 7000,
      lowStockThreshold: 20, unit: "bag",
      manufacturingDate: new Date(now.getTime() - 60 * 86400000),
      expiryDate: new Date(now.getTime() + 300 * 86400000),
      supplier: "MINICOM Rwanda",
    },
    {
      name: "Maize Flour 2kg",
      barcode: "6001600000002",
      sku: "GRA-002",
      categoryId: createdCategories["Grains & Cereals"],
      costPrice: 1200, quantity: 5, sellingPrice: 1800,
      lowStockThreshold: 15, unit: "bag",
      manufacturingDate: new Date(now.getTime() - 45 * 86400000),
      expiryDate: new Date(now.getTime() + 180 * 86400000),
      supplier: "Minimex Rwanda",
    },
    {
      name: "Wheat Flour 1kg",
      barcode: "6001600000003",
      sku: "GRA-003",
      categoryId: createdCategories["Grains & Cereals"],
      costPrice: 900, quantity: 70, sellingPrice: 1300,
      lowStockThreshold: 15, unit: "bag",
      manufacturingDate: new Date(now.getTime() - 30 * 86400000),
      expiryDate: new Date(now.getTime() + 240 * 86400000),
      supplier: "Minimex Rwanda",
    },
    {
      name: "Sorghum 2kg",
      barcode: "6001600000004",
      sku: "GRA-004",
      categoryId: createdCategories["Grains & Cereals"],
      costPrice: 1400, quantity: 40, sellingPrice: 2000,
      lowStockThreshold: 10, unit: "bag",
      manufacturingDate: new Date(now.getTime() - 40 * 86400000),
      expiryDate: new Date(now.getTime() + 270 * 86400000),
      supplier: "Local Cooperative",
    },

    // Oils & Fats
    {
      name: "Cooking Oil 2L (Golden Fry)",
      barcode: "6001700000001",
      sku: "OIL-001",
      categoryId: createdCategories["Oils & Fats"],
      costPrice: 3500, quantity: 55, sellingPrice: 4800,
      lowStockThreshold: 12, unit: "bottle",
      manufacturingDate: new Date(now.getTime() - 60 * 86400000),
      expiryDate: new Date(now.getTime() + 545 * 86400000),
      supplier: "UFAC Rwanda",
    },
    {
      name: "Sunflower Oil 1L",
      barcode: "6001700000002",
      sku: "OIL-002",
      categoryId: createdCategories["Oils & Fats"],
      costPrice: 2000, quantity: 3, sellingPrice: 2800,
      lowStockThreshold: 10, unit: "bottle",
      manufacturingDate: new Date(now.getTime() - 30 * 86400000),
      expiryDate: new Date(now.getTime() + 365 * 86400000),
      supplier: "UFAC Rwanda",
    },

    // Condiments & Spices
    {
      name: "Sugar 1kg",
      barcode: "6001800000001",
      sku: "CON-001",
      categoryId: createdCategories["Condiments & Spices"],
      costPrice: 700, quantity: 120, sellingPrice: 1000,
      lowStockThreshold: 20, unit: "packet",
      manufacturingDate: new Date(now.getTime() - 90 * 86400000),
      expiryDate: new Date(now.getTime() + 730 * 86400000),
      supplier: "KABUYE Sugar Works",
    },
    {
      name: "Salt 500g (Kuku)",
      barcode: "6001800000002",
      sku: "CON-002",
      categoryId: createdCategories["Condiments & Spices"],
      costPrice: 200, quantity: 150, sellingPrice: 350,
      lowStockThreshold: 25, unit: "packet",
      manufacturingDate: new Date(now.getTime() - 120 * 86400000),
      expiryDate: new Date(now.getTime() + 1095 * 86400000),
      supplier: "MAGERWA",
    },
    {
      name: "Tomato Paste 70g",
      barcode: "6001800000003",
      sku: "CON-003",
      categoryId: createdCategories["Condiments & Spices"],
      costPrice: 250, quantity: 200, sellingPrice: 400,
      lowStockThreshold: 30, unit: "tin",
      manufacturingDate: new Date(now.getTime() - 50 * 86400000),
      expiryDate: new Date(now.getTime() + 547 * 86400000),
      supplier: "Ceres Rwanda",
    },
    {
      name: "Royco Seasoning 100g",
      barcode: "6001800000004",
      sku: "CON-004",
      categoryId: createdCategories["Condiments & Spices"],
      costPrice: 500, quantity: 90, sellingPrice: 750,
      lowStockThreshold: 15, unit: "pack",
      manufacturingDate: new Date(now.getTime() - 40 * 86400000),
      expiryDate: new Date(now.getTime() + 365 * 86400000),
      supplier: "Unilever EA",
    },

    // Personal Care
    {
      name: "Lifebuoy Soap 100g",
      barcode: "6001900000001",
      sku: "PER-001",
      categoryId: createdCategories["Personal Care"],
      costPrice: 400, quantity: 100, sellingPrice: 600,
      lowStockThreshold: 20, unit: "bar",
      manufacturingDate: new Date(now.getTime() - 180 * 86400000),
      expiryDate: new Date(now.getTime() + 730 * 86400000),
      supplier: "Unilever EA",
    },
    {
      name: "Colgate Toothpaste 100ml",
      barcode: "6001900000002",
      sku: "PER-002",
      categoryId: createdCategories["Personal Care"],
      costPrice: 1500, quantity: 45, sellingPrice: 2200,
      lowStockThreshold: 10, unit: "tube",
      manufacturingDate: new Date(now.getTime() - 90 * 86400000),
      expiryDate: new Date(now.getTime() + 1095 * 86400000),
      supplier: "Colgate Palmolive",
    },
    {
      name: "Vaseline Lotion 200ml",
      barcode: "6001900000003",
      sku: "PER-003",
      categoryId: createdCategories["Personal Care"],
      costPrice: 1800, quantity: 35, sellingPrice: 2500,
      lowStockThreshold: 10, unit: "bottle",
      manufacturingDate: new Date(now.getTime() - 120 * 86400000),
      expiryDate: new Date(now.getTime() + 730 * 86400000),
      supplier: "Unilever EA",
    },

    // Household Cleaning
    {
      name: "Omo Detergent 1kg",
      barcode: "6002000000001",
      sku: "HOU-001",
      categoryId: createdCategories["Household Cleaning"],
      costPrice: 2500, quantity: 60, sellingPrice: 3500,
      lowStockThreshold: 15, unit: "packet",
      manufacturingDate: new Date(now.getTime() - 150 * 86400000),
      expiryDate: new Date(now.getTime() + 730 * 86400000),
      supplier: "Unilever EA",
    },
    {
      name: "Jik Bleach 500ml",
      barcode: "6002000000002",
      sku: "HOU-002",
      categoryId: createdCategories["Household Cleaning"],
      costPrice: 700, quantity: 40, sellingPrice: 1100,
      lowStockThreshold: 10, unit: "bottle",
      manufacturingDate: new Date(now.getTime() - 60 * 86400000),
      expiryDate: new Date(now.getTime() + 365 * 86400000),
      supplier: "Reckitt Benckiser",
    },

    // Snacks
    {
      name: "Pringles Crisps 165g",
      barcode: "6002100000001",
      sku: "SNK-001",
      categoryId: createdCategories["Snacks & Confectionery"],
      costPrice: 2000, quantity: 50, sellingPrice: 3000,
      lowStockThreshold: 12, unit: "can",
      manufacturingDate: new Date(now.getTime() - 60 * 86400000),
      expiryDate: new Date(now.getTime() + 270 * 86400000),
      supplier: "Import Kigali",
    },
    {
      name: "Cadbury Chocolate 90g",
      barcode: "6002100000002",
      sku: "SNK-002",
      categoryId: createdCategories["Snacks & Confectionery"],
      costPrice: 1500, quantity: 60, sellingPrice: 2200,
      lowStockThreshold: 12, unit: "bar",
      manufacturingDate: new Date(now.getTime() - 30 * 86400000),
      expiryDate: new Date(now.getTime() + 365 * 86400000),
      supplier: "Import Kigali",
    },
    {
      name: "Britannia Biscuits 100g",
      barcode: "6002100000003",
      sku: "SNK-003",
      categoryId: createdCategories["Snacks & Confectionery"],
      costPrice: 400, quantity: 120, sellingPrice: 650,
      lowStockThreshold: 20, unit: "pack",
      manufacturingDate: new Date(now.getTime() - 45 * 86400000),
      expiryDate: new Date(now.getTime() + 180 * 86400000),
      supplier: "Import",
    },
    // EXPIRING SOON products (within 30 days)
    {
      name: "Inyange Cheese 200g",
      barcode: "6001200000010",
      sku: "DAI-010",
      categoryId: createdCategories["Dairy & Eggs"],
      costPrice: 2500, quantity: 12, sellingPrice: 3500,
      lowStockThreshold: 5, unit: "pack",
      manufacturingDate: new Date(now.getTime() - 25 * 86400000),
      expiryDate: new Date(now.getTime() + 7 * 86400000),
      supplier: "Inyange Industries",
    },
    {
      name: "Pasteurized Cream 250ml",
      barcode: "6001200000011",
      sku: "DAI-011",
      categoryId: createdCategories["Dairy & Eggs"],
      costPrice: 1500, quantity: 8, sellingPrice: 2200,
      lowStockThreshold: 5, unit: "bottle",
      manufacturingDate: new Date(now.getTime() - 10 * 86400000),
      expiryDate: new Date(now.getTime() + 15 * 86400000),
      supplier: "Inyange Industries",
    },
    {
      name: "Yogurt Banana 200g",
      barcode: "6001200000012",
      sku: "DAI-012",
      categoryId: createdCategories["Dairy & Eggs"],
      costPrice: 900, quantity: 18, sellingPrice: 1400,
      lowStockThreshold: 8, unit: "cup",
      manufacturingDate: new Date(now.getTime() - 8 * 86400000),
      expiryDate: new Date(now.getTime() + 25 * 86400000),
      supplier: "Inyange Industries",
    },
    {
      name: "Fresh Orange Juice 1L",
      barcode: "6001100000020",
      sku: "BEV-020",
      categoryId: createdCategories["Beverages"],
      costPrice: 1500, quantity: 15, sellingPrice: 2200,
      lowStockThreshold: 8, unit: "bottle",
      manufacturingDate: new Date(now.getTime() - 5 * 86400000),
      expiryDate: new Date(now.getTime() + 20 * 86400000),
      supplier: "Local Processor",
    },
    // BABY PRODUCTS
    {
      name: "Pampers Diapers NB 24pcs",
      barcode: "6002200000001",
      sku: "BAB-001",
      categoryId: createdCategories["Baby Products"],
      costPrice: 8000, quantity: 25, sellingPrice: 11000,
      lowStockThreshold: 8, unit: "pack",
      manufacturingDate: new Date(now.getTime() - 200 * 86400000),
      expiryDate: new Date(now.getTime() + 1825 * 86400000),
      supplier: "Import",
    },
    {
      name: "Cerelac Wheat 500g",
      barcode: "6002200000002",
      sku: "BAB-002",
      categoryId: createdCategories["Baby Products"],
      costPrice: 4500, quantity: 18, sellingPrice: 6500,
      lowStockThreshold: 8, unit: "tin",
      manufacturingDate: new Date(now.getTime() - 90 * 86400000),
      expiryDate: new Date(now.getTime() + 545 * 86400000),
      supplier: "Nestle EA",
    },
  ];

  let productCount = 0;
  const createdProducts: { id: string; name: string }[] = [];
  for (const p of products) {
    const prod = await prisma.product.upsert({
      where: { barcode: p.barcode },
      update: {},
      create: {
        ...p,
        userId: user.id,
        stockMethod: "FIFO" as StockMethod,
        batchNumber: `BATCH-${Math.floor(Math.random() * 10000)}`,
      },
    });
    createdProducts.push({ id: prod.id, name: prod.name });
    productCount++;
  }
  console.log("✅ Products created:", productCount);

  // Create historical sales (past 30 days)
  const paymentModes = ["CASH", "MOBILE_MONEY", "CARD"] as const;
  let salesCount = 0;

  for (let day = 29; day >= 0; day--) {
    const saleDate = new Date(now.getTime() - day * 86400000);
    const dailySales = Math.floor(Math.random() * 5) + 3;

    for (let s = 0; s < dailySales; s++) {
      const itemsInSale = Math.floor(Math.random() * 4) + 1;
      const selectedProducts = [...createdProducts]
        .sort(() => 0.5 - Math.random())
        .slice(0, itemsInSale);

      let totalAmount = 0;
      let totalProfit = 0;
      const saleItemsData = [];

      for (const prod of selectedProducts) {
        const fullProd = await prisma.product.findUnique({ where: { id: prod.id } });
        if (!fullProd) continue;
        const qty = Math.min(Math.floor(Math.random() * 3) + 1, Math.max(0, fullProd.quantity));
        if (qty <= 0) continue;
        const unitPrice = fullProd.sellingPrice;
        const costPrice = fullProd.costPrice;
        const totalPrice = qty * unitPrice;
        const profit = (unitPrice - costPrice) * qty;
        totalAmount += totalPrice;
        totalProfit += profit;
        saleItemsData.push({ productId: prod.id, quantity: qty, unitPrice, costPrice, totalPrice, profit });
      }

      const sale = await prisma.sale.create({
        data: {
          userId: user.id,
          totalAmount,
          totalProfit,
          paymentMode: paymentModes[Math.floor(Math.random() * paymentModes.length)],
          createdAt: saleDate,
          saleItems: {
            create: saleItemsData,
          },
        },
      });

      // Update product quantities
      for (const item of saleItemsData) {
        const productBefore = await prisma.product.findUnique({ where: { id: item.productId } });
        if (!productBefore) continue;
        const previousQty = productBefore.quantity;
        const newQty = Math.max(0, previousQty - item.quantity);

        await prisma.product.update({
          where: { id: item.productId },
          data: { quantity: newQty },
        });
        await prisma.stockLog.create({
          data: {
            productId: item.productId,
            type: "SALE",
            quantity: item.quantity,
            reason: `Sale #${sale.id.slice(0, 8)}`,
            previousQty,
            newQty,
            createdAt: saleDate,
          },
        });
      }
      salesCount++;
    }
  }
  console.log("✅ Historical sales created:", salesCount);

  // Seed initial economic data
  await prisma.economicData.upsert({
    where: { country_indicator_year: { country: "RW", indicator: "inflation_rate", year: 2024 } },
    update: {},
    create: { country: "RW", indicator: "inflation_rate", value: 14.9, year: 2024, source: "World Bank" },
  });
  await prisma.economicData.upsert({
    where: { country_indicator_year: { country: "RW", indicator: "inflation_rate", year: 2023 } },
    update: {},
    create: { country: "RW", indicator: "inflation_rate", value: 17.0, year: 2023, source: "World Bank" },
  });
  await prisma.exchangeRate.create({
    data: { fromCurrency: "USD", toCurrency: "RWF", rate: 1320.0 },
  });
  console.log("✅ Economic data seeded");

  console.log("\n🎉 Seed completed successfully!");
  console.log("📧 Login: admin@bizterimbere.rw");
  console.log("🔑 Password: password123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
