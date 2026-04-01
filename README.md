# 🏪 BIZTerimbere Backend API

**Smart Inventory & Profit Optimization System for Rwanda SMEs**

A full-featured REST API built with Node.js, Express, TypeScript, and PostgreSQL (Prisma ORM).

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + TypeScript |
| Framework | Express.js |
| Database | PostgreSQL via Prisma ORM |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Docs | Swagger UI (swagger-jsdoc) |
| Scheduling | node-cron |
| HTTP Client | Axios (for external APIs) |
| Logging | Winston |

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js >= 18
- PostgreSQL running locally (or a cloud DB)

### 2. Install & Setup

```bash
# Clone or unzip the project
cd bizterimbere

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Create & migrate the database (creates all tables)
npx prisma migrate dev --name init

# Seed with sample Rwanda supermarket products
npm run prisma:seed
```

### 3. Configure Environment

Copy `.env.example` to `.env` and set your values:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL="postgresql://postgres:password@localhost:5432/bizterimbere"
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
JWT_EXPIRES_IN=7d
```

### 4. Run the Server

```bash
# Development (hot reload)
npm run dev

# Production
npm run build && npm start
```

---

## 📖 API Documentation

Once running, visit:

```
http://localhost:5000/api/docs
```

Swagger UI with all endpoints, request bodies, and response schemas.

**Demo login credentials (after seed):**
- Email: `admin@bizterimbere.rw`
- Password: `password123`

---

## 🗂️ Project Structure

```
bizterimbere/
├── prisma/
│   ├── schema.prisma          # Database schema (all models)
│   └── seed.ts                # Seed: categories + 35 supermarket products + 30d sales history
├── src/
│   ├── index.ts               # App entry point, cron jobs, server
│   ├── config/
│   │   ├── database.ts        # Prisma client singleton
│   │   └── logger.ts          # Winston logger
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── product.controller.ts
│   │   ├── sales.controller.ts
│   │   ├── analytics.controller.ts
│   │   ├── economic.controller.ts
│   │   └── misc.controller.ts  # Alerts + Categories
│   ├── middleware/
│   │   ├── auth.ts            # JWT authentication guard
│   │   ├── errorHandler.ts    # Global error + 404 handler
│   │   └── validate.ts        # express-validator result handler
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── product.routes.ts
│   │   ├── sales.routes.ts
│   │   └── other.routes.ts    # Analytics, Economic, Alerts, Categories
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── product.service.ts
│   │   ├── sales.service.ts
│   │   ├── analytics.service.ts
│   │   ├── economic.service.ts # World Bank + ExchangeRate-API integration
│   │   ├── alert.service.ts
│   │   └── category.service.ts
│   ├── swagger/
│   │   └── swagger.config.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       └── response.ts        # Standardized API response helpers
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 🔌 API Endpoints Summary

### Auth `/api/auth`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register new business account |
| POST | `/login` | Login → returns JWT token |
| GET | `/profile` | Get own profile |
| PUT | `/profile` | Update name/businessName |
| PUT | `/change-password` | Change password |

### Products `/api/products`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all products (search, filter, paginate) |
| POST | `/` | Create product |
| GET | `/:id` | Get product by ID |
| PUT | `/:id` | Update product |
| DELETE | `/:id` | Soft-delete product |
| POST | `/:id/stock` | Adjust stock (IN / OUT / ADJUSTMENT) |
| GET | `/barcode/:barcode` | Lookup product by barcode |
| GET | `/status/low-stock` | Products at or below threshold |
| GET | `/status/expiring` | Products expiring within N days |
| GET | `/:id/stock-logs` | Full stock movement history |

### Sales `/api/sales`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Record a new sale (multi-item, auto stock deduction) |
| GET | `/` | List sales (filter by date, payment mode) |
| GET | `/today/summary` | Today's revenue, profit, hourly breakdown |
| GET | `/:id` | Get sale detail |
| DELETE | `/:id` | Delete sale & restore stock |

### Analytics `/api/analytics`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Full dashboard stats |
| GET | `/sales-chart` | Sales + profit chart data (7d/30d/90d/12m) |
| GET | `/top-products` | Best-selling products by quantity |
| GET | `/categories` | Revenue breakdown by category |
| GET | `/inventory-status` | Low stock, expiring, expired lists |
| GET | `/profit` | Profit analysis with payment mode breakdown |

### Economic Intelligence `/api/economic`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/indicators` | Live Rwanda inflation + USD/RWF rate |
| GET | `/price-suggestions` | AI price suggestions for all products |
| GET | `/historical-inflation` | Rwanda inflation history (World Bank) |
| GET | `/exchange-rate` | Current USD → RWF rate |

### Alerts `/api/alerts`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all alerts |
| GET | `/unread-count` | Count of unread alerts |
| POST | `/run-checks` | Manually trigger alert scan |
| PATCH | `/mark-all-read` | Mark all alerts read |
| PATCH | `/:id/read` | Mark one alert read |
| DELETE | `/:id` | Delete alert |

### Categories `/api/categories`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all categories |
| POST | `/` | Create category |
| GET | `/:id` | Get category + its products |
| PUT | `/:id` | Update category |
| DELETE | `/:id` | Delete category (only if empty) |

---

## 💡 Smart Features

### 🌍 Economic Intelligence
- Fetches live **Rwanda inflation data** from World Bank API
- Fetches live **USD/RWF exchange rate** from ExchangeRate-API
- Falls back to cached DB values if APIs are unavailable
- Automatically refreshed daily at 8am via cron job

### 💰 Price Suggestions
Based on current inflation rate, each product gets:
- `suggestedMinPrice` — minimum to maintain 10% margin
- `suggestedMaxPrice` — inflation-adjusted maximum (protects margins)
- `suggestedIdealPrice` — optimal price with ~25% margin
- `urgency` — `high` (underpriced) / `medium` (overpriced) / `low` (optimal)

### 🔔 Smart Alerts (auto-generated)
- **LOW_STOCK** — quantity ≤ threshold
- **OUT_OF_STOCK** — quantity = 0
- **EXPIRY_SOON** — expires within 30 days
- **EXPIRED** — already expired
- **PRICE_SUGGESTION** — products priced below recommended minimum
- **INFLATION_ALERT** — macro economic changes detected

Alert checks run every 6 hours automatically via cron.

### 📦 FIFO / LIFO Stock Method
Each product can be set to use FIFO or LIFO inventory costing method.

---

## 🌱 Seed Data

The seed creates:
- 1 demo user (admin@bizterimbere.rw / password123)
- 12 product categories (Beverages, Dairy, Bakery, Grains, Oils, etc.)
- 35 realistic Rwanda supermarket products with barcodes, prices, expiry dates
- 30 days of historical sales data
- Rwanda inflation data from World Bank (cached)
- USD/RWF exchange rate (cached)

---

## ⏰ Cron Jobs

| Schedule | Job |
|----------|-----|
| Every 6 hours | Run alert checks for all users |
| Daily at 8am | Refresh World Bank + ExchangeRate data |

---

## 🔐 Authentication

All protected endpoints require:
```
Authorization: Bearer <your_jwt_token>
```

Get your token from `POST /api/auth/login`.

---

## 📊 External APIs Used

| API | Purpose | Fallback |
|-----|---------|---------|
| `api.worldbank.org/v2/country/RW/indicator/FP.CPI.TOTL.ZG` | Rwanda CPI/Inflation | Cached DB value |
| `api.exchangerate-api.com/v4/latest/USD` | USD/RWF rate | Cached DB value |

---

## 🛠️ Available Scripts

```bash
npm run dev           # Start dev server with hot reload
npm run build         # Compile TypeScript to dist/
npm run start         # Run compiled production server
npm run prisma:seed   # Seed database with demo data
npm run prisma:studio # Open Prisma Studio (DB GUI)
npx prisma migrate dev --name <name>  # Create new migration
```

---

## 📝 Response Format

All API responses follow this structure:

```json
{
  "success": true,
  "message": "Products fetched",
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 35,
    "totalPages": 2
  }
}
```

Error responses:
```json
{
  "success": false,
  "message": "Insufficient stock for \"Coca-Cola 500ml\". Available: 2",
  "error": "..."
}
```
