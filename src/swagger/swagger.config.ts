import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "BIZTerimbere API",
      version: "1.0.0",
      description: `
## BIZTerimbere – Smart Inventory & Profit Optimization System

A complete backend API for Rwanda SME inventory management.

### Frontend Pages & Their API Endpoints

| Page | Endpoints Used |
|------|---------------|
| **Dashboard** | \`GET /api/analytics/dashboard\`, \`GET /api/analytics/sales-chart\`, \`GET /api/economic/indicators\`, \`GET /api/alerts\` |
| **Inventory** | \`GET /api/products\`, \`GET /api/categories\`, \`GET /api/products/low-stock\`, \`GET /api/products/expiring\` |
| **Stock Movement** | \`PATCH /api/products/{id}/stock\`, \`GET /api/products/{id}/stock-logs\`, \`GET /api/categories\`, \`GET /api/products\` |
| **Analytics** | \`GET /api/analytics/sales-chart\`, \`GET /api/analytics/top-products\`, \`GET /api/analytics/categories\`, \`GET /api/economic/indicators\`, \`GET /api/economic/price-suggestions\` |
| **Reports** | \`GET /api/analytics/profit\`, \`GET /api/analytics/inventory-status\`, \`GET /api/sales\`, \`GET /api/analytics/top-products\` |
| **Settings** | \`GET /api/auth/profile\`, \`PUT /api/auth/profile\`, \`PUT /api/auth/change-password\` |

### Authentication
All protected endpoints require a **Bearer JWT token**.
Login at \`POST /api/auth/login\` to get your token.

**Demo credentials:** \`admin@bizterimbere.rw\` / \`password123\`
      `,
      contact: {
        name: "BIZTerimbere Support",
        email: "support@bizterimbere.rw",
      },
      license: { name: "MIT" },
    },
    servers: [
      { url: "http://localhost:5000", description: "Development Server" },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter JWT token from login response",
        },
      },
      schemas: {
        // ── Generic wrapper ──────────────────────────────────────────────────
        ApiResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Operation successful" },
            data: { type: "object" },
          },
        },
        PaginationMeta: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 20 },
            total: { type: "integer", example: 100 },
            totalPages: { type: "integer", example: 5 },
          },
        },

        // ── Auth ─────────────────────────────────────────────────────────────
        RegisterRequest: {
          type: "object",
          required: ["name", "email", "password", "businessName"],
          properties: {
            name: { type: "string", example: "Jean Pierre" },
            email: { type: "string", format: "email", example: "jean@bizterimbere.rw" },
            password: { type: "string", minLength: 6, example: "securePass123" },
            businessName: { type: "string", example: "JP Supermarket" },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "admin@bizterimbere.rw" },
            password: { type: "string", example: "password123" },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Login successful" },
            data: {
              type: "object",
              properties: {
                token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
                user: { $ref: "#/components/schemas/User" },
              },
            },
          },
        },
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", example: "Jean Pierre" },
            email: { type: "string", example: "jean@bizterimbere.rw" },
            businessName: { type: "string", example: "JP Supermarket" },
            role: { type: "string", enum: ["OWNER", "MANAGER", "STAFF"], example: "OWNER" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        UpdateProfileRequest: {
          type: "object",
          properties: {
            name: { type: "string", example: "Jean Pierre Updated" },
            businessName: { type: "string", example: "JP Supermarket Ltd" },
          },
        },
        ChangePasswordRequest: {
          type: "object",
          required: ["currentPassword", "newPassword"],
          properties: {
            currentPassword: { type: "string", example: "oldPassword123" },
            newPassword: { type: "string", minLength: 6, example: "newSecurePass456" },
          },
        },

        // ── Category ─────────────────────────────────────────────────────────
        Category: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", example: "Dairy" },
            description: { type: "string", nullable: true, example: "Milk, yogurt, cheese" },
            createdAt: { type: "string", format: "date-time" },
            _count: {
              type: "object",
              properties: {
                products: { type: "integer", example: 3 },
              },
            },
          },
        },
        CreateCategoryRequest: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", example: "Frozen Foods" },
            description: { type: "string", example: "Frozen meats and vegetables" },
          },
        },

        // ── Product ──────────────────────────────────────────────────────────
        // Matches frontend ProductInventoryItem type
        Product: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", example: "Fresh Milk 1L" },
            barcode: { type: "string", nullable: true, example: "6001100000001" },
            sku: { type: "string", nullable: true, example: "DAR-001" },
            categoryId: { type: "string", format: "uuid" },
            category: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string", example: "Dairy" },
              },
            },
            costPrice: { type: "number", example: 760 },
            sellingPrice: { type: "number", example: 1000 },
            suggestedMinPrice: { type: "number", nullable: true, example: 1080 },
            suggestedMaxPrice: { type: "number", nullable: true, example: 1350 },
            quantity: { type: "integer", example: 64 },
            lowStockThreshold: { type: "integer", example: 20, description: "Maps to frontend 'threshold'" },
            unit: { type: "string", example: "litre" },
            manufacturingDate: { type: "string", format: "date-time", nullable: true, description: "Maps to frontend 'manufacturedDate'" },
            expiryDate: { type: "string", format: "date-time", nullable: true },
            batchNumber: { type: "string", nullable: true },
            supplier: { type: "string", nullable: true },
            stockMethod: { type: "string", enum: ["FIFO", "LIFO"], example: "FIFO" },
            isActive: { type: "boolean", example: true },
            // Computed fields (annotated by backend)
            isLowStock: { type: "boolean", example: false },
            isOutOfStock: { type: "boolean", example: false },
            isExpired: { type: "boolean", example: false },
            isExpiringSoon: { type: "boolean", example: true, description: "Maps to frontend status 'expiring'" },
            daysUntilExpiry: { type: "integer", nullable: true, example: 5 },
            profitMargin: { type: "string", example: "24.00", description: "Percentage string" },
            inventoryValue: { type: "number", example: 48640 },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateProductRequest: {
          type: "object",
          required: ["name", "categoryId", "costPrice", "sellingPrice"],
          properties: {
            name: { type: "string", example: "Fresh Milk 1L" },
            barcode: { type: "string", example: "6001100000001" },
            sku: { type: "string", example: "DAR-001" },
            categoryId: { type: "string", format: "uuid" },
            costPrice: { type: "number", example: 760 },
            sellingPrice: { type: "number", example: 1000 },
            quantity: { type: "integer", example: 64, default: 0 },
            lowStockThreshold: { type: "integer", example: 20, default: 10 },
            unit: { type: "string", example: "litre", default: "piece" },
            manufacturingDate: { type: "string", format: "date", example: "2026-03-18" },
            expiryDate: { type: "string", format: "date", example: "2026-04-05" },
            batchNumber: { type: "string", example: "BATCH-2026-001" },
            supplier: { type: "string", example: "Inyange Industries" },
            stockMethod: { type: "string", enum: ["FIFO", "LIFO"], default: "FIFO" },
          },
        },
        StockAdjustRequest: {
          type: "object",
          required: ["type", "quantity"],
          properties: {
            type: {
              type: "string",
              enum: ["IN", "OUT", "ADJUSTMENT"],
              example: "IN",
              description: "IN = stock received, OUT = stock dispatched, ADJUSTMENT = set absolute value",
            },
            quantity: { type: "integer", minimum: 1, example: 50 },
            reason: { type: "string", example: "New delivery from Inyange Industries" },
          },
        },
        StockLog: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            productId: { type: "string", format: "uuid" },
            type: { type: "string", enum: ["IN", "OUT", "ADJUSTMENT", "SALE", "RETURN", "EXPIRED"] },
            quantity: { type: "integer", example: 50 },
            reason: { type: "string", nullable: true },
            previousQty: { type: "integer", example: 14 },
            newQty: { type: "integer", example: 64 },
            createdAt: { type: "string", format: "date-time" },
          },
        },

        // ── Sales ────────────────────────────────────────────────────────────
        CreateSaleRequest: {
          type: "object",
          required: ["items"],
          properties: {
            items: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                required: ["productId", "quantity"],
                properties: {
                  productId: { type: "string", format: "uuid" },
                  quantity: { type: "integer", minimum: 1, example: 2 },
                  unitPrice: { type: "number", description: "Override price (optional, defaults to product sellingPrice)", example: 1000 },
                },
              },
            },
            paymentMode: {
              type: "string",
              enum: ["CASH", "MOBILE_MONEY", "CARD", "CREDIT"],
              default: "CASH",
            },
            notes: { type: "string", example: "Kigali Fresh Mart order" },
          },
        },
        Sale: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            userId: { type: "string", format: "uuid" },
            totalAmount: { type: "number", example: 2000 },
            totalProfit: { type: "number", example: 480 },
            paymentMode: { type: "string", enum: ["CASH", "MOBILE_MONEY", "CARD", "CREDIT"] },
            notes: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            saleItems: {
              type: "array",
              items: { $ref: "#/components/schemas/SaleItem" },
            },
          },
        },
        SaleItem: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            productId: { type: "string", format: "uuid" },
            quantity: { type: "integer", example: 2 },
            unitPrice: { type: "number", example: 1000 },
            costPrice: { type: "number", example: 760 },
            totalPrice: { type: "number", example: 2000 },
            profit: { type: "number", example: 480 },
            product: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string", example: "Fresh Milk 1L" },
                unit: { type: "string", example: "litre" },
              },
            },
          },
        },
        TodaySummary: {
          type: "object",
          description: "Maps to frontend Dashboard 'Today's Movement' metric",
          properties: {
            totalRevenue: { type: "number", example: 420000 },
            totalProfit: { type: "number", example: 98000 },
            totalTransactions: { type: "integer", example: 18 },
            totalItemsSold: { type: "integer", example: 1248, description: "Maps to frontend 'Today's Movement' value" },
            hourlyBreakdown: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  hour: { type: "integer", example: 9 },
                  revenue: { type: "number", example: 45000 },
                  transactions: { type: "integer", example: 3 },
                },
              },
            },
          },
        },

        // ── Analytics ────────────────────────────────────────────────────────
        DashboardStats: {
          type: "object",
          description: "Powers the Dashboard page metric cards and live stock snapshot",
          properties: {
            totalProducts: { type: "integer", example: 48 },
            lowStockProducts: { type: "integer", example: 12, description: "Maps to frontend 'Low Stock Alerts'" },
            outOfStockProducts: { type: "integer", example: 3 },
            expiringSoonProducts: { type: "integer", example: 5 },
            expiredProducts: { type: "integer", example: 1 },
            todayRevenue: { type: "number", example: 420000 },
            todayProfit: { type: "number", example: 98000 },
            todaySalesCount: { type: "integer", example: 18 },
            monthRevenue: { type: "number", example: 8400000 },
            monthProfit: { type: "number", example: 1960000 },
            monthSalesCount: { type: "integer", example: 312 },
            totalInventoryValue: { type: "number", example: 2400000 },
            totalInventoryRetailValue: { type: "number", example: 3200000 },
            potentialProfit: { type: "number", example: 800000 },
          },
        },
        SalesChartPoint: {
          type: "object",
          description: "One data point for the Dashboard/Analytics sales trend chart",
          properties: {
            date: { type: "string", example: "2026-03-25", description: "ISO date or YYYY-MM for monthly" },
            revenue: { type: "number", example: 240000, description: "Maps to frontend TrendPoint 'value'" },
            profit: { type: "number", example: 56000 },
            count: { type: "integer", example: 12 },
          },
        },
        TopProduct: {
          type: "object",
          description: "Used in Analytics top-products and Reports pages",
          properties: {
            productId: { type: "string", format: "uuid" },
            productName: { type: "string", example: "Bananas" },
            category: { type: "string", example: "Produce" },
            totalQuantitySold: { type: "integer", example: 252, description: "Maps to frontend dailySales * period" },
            totalRevenue: { type: "number", example: 126000 },
            totalProfit: { type: "number", example: 58800 },
            transactionCount: { type: "integer", example: 36 },
            currentStock: { type: "integer", example: 120 },
          },
        },
        CategoryBreakdown: {
          type: "object",
          description: "Revenue breakdown by category for Analytics page",
          properties: {
            categoryId: { type: "string", format: "uuid" },
            name: { type: "string", example: "Dairy" },
            revenue: { type: "number", example: 840000 },
            profit: { type: "number", example: 196000 },
            quantity: { type: "integer", example: 840 },
            percentage: { type: "string", example: "32.5" },
          },
        },
        InventoryStatus: {
          type: "object",
          description: "Full inventory health — powers Inventory page summary cards",
          properties: {
            summary: {
              type: "object",
              properties: {
                healthy: { type: "integer", example: 38 },
                low: { type: "integer", example: 6, description: "Maps to frontend status 'low'" },
                outOfStock: { type: "integer", example: 2 },
                expiringSoon: { type: "integer", example: 4, description: "Maps to frontend status 'expiring'" },
                expired: { type: "integer", example: 1, description: "Maps to frontend status 'critical'" },
                total: { type: "integer", example: 48 },
              },
            },
            lowStockProducts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string", example: "Chicken" },
                  category: { type: "string", example: "Meat" },
                  quantity: { type: "integer", example: 12 },
                  threshold: { type: "integer", example: 15 },
                  unit: { type: "string", example: "kg" },
                },
              },
            },
            outOfStockProducts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  category: { type: "string" },
                  unit: { type: "string" },
                },
              },
            },
            expiringSoonProducts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string", example: "Fresh Milk 1L" },
                  category: { type: "string", example: "Dairy" },
                  expiryDate: { type: "string", format: "date-time" },
                  daysLeft: { type: "integer", example: 5 },
                  quantity: { type: "integer", example: 64 },
                },
              },
            },
            expiredProducts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  category: { type: "string" },
                  expiryDate: { type: "string", format: "date-time" },
                  daysExpired: { type: "integer", example: 2 },
                  quantity: { type: "integer", example: 5 },
                  estimatedLoss: { type: "number", example: 3800 },
                },
              },
            },
          },
        },
        ProfitAnalysis: {
          type: "object",
          description: "Powers the Reports page report cards",
          properties: {
            period: { type: "string", example: "30d" },
            totalRevenue: { type: "number", example: 8400000 },
            totalCost: { type: "number", example: 6440000 },
            totalProfit: { type: "number", example: 1960000, description: "Maps to frontend 'Potential margin uplift'" },
            profitMargin: { type: "string", example: "23.33" },
            totalTransactions: { type: "integer", example: 312 },
            avgTransactionValue: { type: "number", example: 26923 },
            avgDailyRevenue: { type: "number", example: 280000 },
            paymentBreakdown: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  mode: { type: "string", enum: ["CASH", "MOBILE_MONEY", "CARD", "CREDIT"] },
                  count: { type: "integer", example: 180 },
                  revenue: { type: "number", example: 5040000 },
                },
              },
            },
          },
        },

        // ── Economic Intelligence ─────────────────────────────────────────────
        EconomicIndicators: {
          type: "object",
          description: "Powers Analytics page header and Dashboard 'Inflation Watch' card. Maps to frontend EconomySignal type.",
          properties: {
            inflationRate: { type: "number", nullable: true, example: 5.4, description: "Maps to frontend EconomySignal.inflation" },
            inflationYear: { type: "integer", example: 2024 },
            inflationSource: { type: "string", example: "World Bank" },
            exchangeRate: { type: "number", example: 1318, description: "Maps to frontend EconomySignal.exchangeRate (1 USD = X RWF)" },
            exchangeSource: { type: "string", example: "ExchangeRate-API" },
            currency: { type: "string", example: "RWF" },
            country: { type: "string", example: "Rwanda" },
            recommendation: { type: "string", example: "Protect margins on fast movers with a 3–6% price floor.", description: "Maps to frontend EconomySignal.recommendation" },
            priceAdjustmentFactor: { type: "number", example: 1.03 },
            fetchedAt: { type: "string", format: "date-time" },
          },
        },
        PriceSuggestion: {
          type: "object",
          description: "Maps to frontend PriceComparison type used in Analytics price table",
          properties: {
            productId: { type: "string", format: "uuid" },
            productName: { type: "string", example: "Fresh Milk 1L", description: "Maps to PriceComparison.product" },
            category: { type: "string", example: "Dairy" },
            currentCostPrice: { type: "number", example: 760 },
            currentSellingPrice: { type: "number", example: 1000, description: "Maps to PriceComparison.currentPrice" },
            suggestedMinPrice: { type: "number", example: 836, description: "Maps to PriceComparison.minRecommended" },
            suggestedMaxPrice: { type: "number", example: 1296 },
            suggestedIdealPrice: { type: "number", example: 1080, description: "Maps to PriceComparison.marketAverage" },
            currentMargin: { type: "number", example: 24.0 },
            suggestedMargin: { type: "number", example: 29.6 },
            status: { type: "string", example: "WITHIN optimal price range", description: "Maps to PriceComparison.condition" },
            urgency: { type: "string", enum: ["low", "medium", "high"] },
            adjustmentFactor: { type: "number", example: 1.03 },
            inflationRate: { type: "number", example: 5.4 },
          },
        },
        HistoricalInflation: {
          type: "array",
          items: {
            type: "object",
            properties: {
              year: { type: "string", example: "2023" },
              inflationRate: { type: "number", example: 14.9 },
            },
          },
        },

        // ── Alerts ───────────────────────────────────────────────────────────
        Alert: {
          type: "object",
          description: "Smart notification — maps to frontend Dashboard action queue and Inventory expiry watch",
          properties: {
            id: { type: "string", format: "uuid" },
            userId: { type: "string", format: "uuid" },
            productId: { type: "string", format: "uuid", nullable: true },
            type: {
              type: "string",
              enum: ["LOW_STOCK", "OUT_OF_STOCK", "EXPIRY_SOON", "EXPIRED", "PRICE_SUGGESTION", "INFLATION_ALERT"],
            },
            message: { type: "string", example: "\"Chicken\" is running low. Only 12 kg(s) remaining" },
            isRead: { type: "boolean", example: false },
            createdAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
    tags: [
      { name: "Auth", description: "Authentication & user management (Settings page)" },
      { name: "Categories", description: "Product categories (Inventory & StockMovement pages)" },
      { name: "Products", description: "Inventory & stock management (Inventory & StockMovement pages)" },
      { name: "Sales", description: "Sales recording & history (StockMovement & Reports pages)" },
      { name: "Analytics", description: "Charts, stats & reports (Dashboard, Analytics & Reports pages)" },
      { name: "Economic Intelligence", description: "Inflation, exchange rates & price suggestions (Analytics page)" },
      { name: "Alerts", description: "Smart notifications (Dashboard action queue)" },
    ],
  },
  apis: ["./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
