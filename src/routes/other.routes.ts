import { Router } from "express";
import { body } from "express-validator";
import {
  getDashboardStats, getSalesChart, getTopProducts,
  getCategoryBreakdown, getInventoryStatus, getProfitAnalysis,
} from "../controllers/analytics.controller";
import {
  getEconomicIndicators, getPriceSuggestions,
  getHistoricalInflation, getExchangeRate,
} from "../controllers/economic.controller";
import {
  getAlerts, markAlertRead, markAllAlertsRead,
  getUnreadCount, runAlertChecks, deleteAlert,
  getCategories, getCategory, createCategory, updateCategory, deleteCategory,
} from "../controllers/misc.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";

// ─── Analytics Router ────────────────────────────────────────────────────────
export const analyticsRouter = Router();
analyticsRouter.use(authenticate);

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     tags: [Analytics]
 *     summary: Get full dashboard statistics
 *     description: |
 *       Returns all metrics needed to populate the **Dashboard** page.
 *
 *       **Frontend Dashboard metric cards mapping:**
 *       - `lowStockProducts` → "Low Stock Alerts" card value
 *       - `todaySalesCount` (inbound) + stock OUT logs → "Today's Movement" (use `/api/sales/today` for full detail)
 *       - `inflationRate` from economic indicators → "Inflation Watch" card (call `/api/economic/indicators` separately)
 *       - Stock accuracy → computed from `GET /api/analytics/inventory-status` systemStock vs physicalStock
 *
 *       **Frontend Dashboard live stock snapshot:**
 *       - Use `GET /api/products?limit=5` for the snapshot table
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/DashboardStats'
 */
analyticsRouter.get("/dashboard", getDashboardStats);

/**
 * @swagger
 * /api/analytics/sales-chart:
 *   get:
 *     tags: [Analytics]
 *     summary: Get sales & profit chart data
 *     description: |
 *       Returns time-series data for the sales trend chart.
 *       Used by the **Dashboard** "Weekly revenue vs forecast" area chart
 *       and the **Analytics** "Weekly sales vs baseline" bar chart.
 *
 *       **Frontend TrendPoint mapping:**
 *       - `date` → TrendPoint.name (day label like "Mon", "Tue")
 *       - `revenue` → TrendPoint.value (actual sales)
 *       - Backend does not provide forecast — frontend can compute a rolling average as forecast
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 12m]
 *           default: 30d
 *         description: |
 *           - `7d` → last 7 days (Dashboard weekly chart)
 *           - `30d` → last 30 days (Analytics monthly view)
 *           - `90d` → last 90 days (Reports quarterly)
 *           - `12m` → last 12 months (Reports annual)
 *     responses:
 *       200:
 *         description: Sales chart data points
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SalesChartPoint'
 */
analyticsRouter.get("/sales-chart", getSalesChart);

/**
 * @swagger
 * /api/analytics/top-products:
 *   get:
 *     tags: [Analytics]
 *     summary: Get best-selling products
 *     description: |
 *       Returns top products ranked by quantity sold.
 *       Used by the **Inventory** "Top sellers" panel and **Reports** page.
 *
 *       **Frontend Inventory top sellers mapping:**
 *       - `productName` → item.name
 *       - `totalQuantitySold` → item.dailySales (divide by period days for daily rate)
 *       - `currentStock` → item.quantity
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, minimum: 1, maximum: 50 }
 *         description: Number of top products to return (use 3 for Inventory top sellers panel)
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d]
 *           default: 30d
 *     responses:
 *       200:
 *         description: Top products by sales volume
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/TopProduct'
 */
analyticsRouter.get("/top-products", getTopProducts);

/**
 * @swagger
 * /api/analytics/categories:
 *   get:
 *     tags: [Analytics]
 *     summary: Get revenue breakdown by category
 *     description: |
 *       Returns revenue, profit, and quantity sold per category.
 *       Used by the **Analytics** page and **Reports** category breakdown section.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d]
 *           default: 30d
 *     responses:
 *       200:
 *         description: Category revenue breakdown, sorted by revenue descending
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CategoryBreakdown'
 */
analyticsRouter.get("/categories", getCategoryBreakdown);

/**
 * @swagger
 * /api/analytics/inventory-status:
 *   get:
 *     tags: [Analytics]
 *     summary: Get full inventory health status
 *     description: |
 *       Returns a complete inventory health report with summary counts and product lists.
 *       Used by the **Inventory** page summary cards and **Reports** page.
 *
 *       **Frontend Inventory summary cards mapping:**
 *       - `summary.low` + `summary.outOfStock` → "Low & critical" card
 *       - `expiringSoonProducts` (filtered to ≤5 days) → "Expiring in 5 days" card
 *       - `summary.total` → "Total units" (sum quantities)
 *
 *       **Frontend Reports page mapping:**
 *       - `expiredProducts[].estimatedLoss` → "Waste prevented" card
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Full inventory health status
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/InventoryStatus'
 */
analyticsRouter.get("/inventory-status", getInventoryStatus);

/**
 * @swagger
 * /api/analytics/profit:
 *   get:
 *     tags: [Analytics]
 *     summary: Get profit analysis with payment mode breakdown
 *     description: |
 *       Returns profit metrics for the specified period.
 *       Used by the **Reports** page report cards.
 *
 *       **Frontend Reports page mapping:**
 *       - `totalProfit` → "Potential margin uplift" card
 *       - `profitMargin` → margin percentage
 *       - `paymentBreakdown` → payment mode pie chart
 *       - `totalRevenue` → revenue card
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d]
 *           default: 30d
 *     responses:
 *       200:
 *         description: Profit analysis
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ProfitAnalysis'
 */
analyticsRouter.get("/profit", getProfitAnalysis);

// ─── Economic Router ─────────────────────────────────────────────────────────
export const economicRouter = Router();
economicRouter.use(authenticate);

/**
 * @swagger
 * /api/economic/indicators:
 *   get:
 *     tags: [Economic Intelligence]
 *     summary: Get live Rwanda economic indicators
 *     description: |
 *       Fetches live inflation and USD/RWF exchange rate data.
 *       Falls back to cached DB values if external APIs are unavailable.
 *
 *       **Frontend Analytics page header mapping (EconomySignal type):**
 *       - `inflationRate` → EconomySignal.inflation (e.g. "5.4%")
 *       - `exchangeRate` → EconomySignal.exchangeRate (e.g. "1 USD = 1,318 RWF")
 *       - `recommendation` → EconomySignal.recommendation
 *       - `priceAdjustmentFactor` → used to compute EconomySignal.confidence
 *
 *       **Frontend Dashboard "Inflation Watch" card:**
 *       - `inflationRate` → card value (e.g. "+5.4%")
 *       - `recommendation` → card helper text
 *
 *       **Data sources:**
 *       - Inflation: World Bank API (FP.CPI.TOTL.ZG indicator for Rwanda)
 *       - Exchange rate: ExchangeRate-API (USD → RWF)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Economic indicators with pricing recommendation
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/EconomicIndicators'
 */
economicRouter.get("/indicators", getEconomicIndicators);

/**
 * @swagger
 * /api/economic/price-suggestions:
 *   get:
 *     tags: [Economic Intelligence]
 *     summary: Get AI-powered price suggestions for all products
 *     description: |
 *       Analyzes current inflation rate and generates min/max/ideal price recommendations
 *       for each product to protect profit margins.
 *       Also saves suggestions to products and creates PRICE_SUGGESTION alerts for underpriced items.
 *
 *       **Frontend Analytics "Market price comparison" table mapping (PriceComparison type):**
 *       - `productName` → PriceComparison.product
 *       - `currentSellingPrice` → PriceComparison.currentPrice
 *       - `suggestedMinPrice` → PriceComparison.minRecommended
 *       - `suggestedIdealPrice` → PriceComparison.marketAverage
 *       - `status` → PriceComparison.condition
 *       - `urgency: "high"` → products that need immediate price adjustment
 *
 *       **Frontend Dashboard action queue (SuggestionItem type):**
 *       - `urgency: "high"` items → High priority suggestions
 *       - `status` → suggestion description
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Price suggestions with economic context
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         indicators:
 *                           $ref: '#/components/schemas/EconomicIndicators'
 *                         suggestions:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/PriceSuggestion'
 *                         summary:
 *                           type: object
 *                           properties:
 *                             total: { type: integer, example: 48 }
 *                             underpriced: { type: integer, example: 8, description: "High urgency — need price increase" }
 *                             overpriced: { type: integer, example: 3, description: "Medium urgency — may reduce sales" }
 *                             optimal: { type: integer, example: 37, description: "Low urgency — within range" }
 */
economicRouter.get("/price-suggestions", getPriceSuggestions);

/**
 * @swagger
 * /api/economic/historical-inflation:
 *   get:
 *     tags: [Economic Intelligence]
 *     summary: Get Rwanda historical inflation data
 *     description: |
 *       Returns historical CPI inflation rates from World Bank.
 *       Used by the **Analytics** page historical trend chart.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: years
 *         schema: { type: integer, default: 5, minimum: 1, maximum: 20 }
 *         description: Number of years of historical data to return
 *     responses:
 *       200:
 *         description: Historical inflation rates sorted by year ascending
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/HistoricalInflation'
 */
economicRouter.get("/historical-inflation", getHistoricalInflation);

/**
 * @swagger
 * /api/economic/exchange-rate:
 *   get:
 *     tags: [Economic Intelligence]
 *     summary: Get current USD to RWF exchange rate
 *     description: |
 *       Returns the latest USD/RWF exchange rate.
 *       Used by the **Analytics** page macro recommendation panel.
 *
 *       **Frontend mapping:**
 *       - `rate` → displayed as "1 USD = {rate} RWF" in EconomySignal.exchangeRate
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current exchange rate
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         rate: { type: number, example: 1318 }
 *                         source: { type: string, example: ExchangeRate-API }
 */
economicRouter.get("/exchange-rate", getExchangeRate);

// ─── Alerts Router ───────────────────────────────────────────────────────────
export const alertsRouter = Router();
alertsRouter.use(authenticate);

/**
 * @swagger
 * /api/alerts:
 *   get:
 *     tags: [Alerts]
 *     summary: Get all alerts
 *     description: |
 *       Returns smart notifications for the authenticated user.
 *       Used by the **Dashboard** action queue panel.
 *
 *       **Frontend Dashboard action queue (SuggestionItem) mapping:**
 *       - `type: "LOW_STOCK"` → High priority suggestion "Restock [product]"
 *       - `type: "EXPIRY_SOON"` → High priority suggestion "Discount [product] bundles"
 *       - `type: "PRICE_SUGGESTION"` → Medium/Low priority pricing suggestion
 *       - `message` → SuggestionItem.description
 *
 *       **Alert types:**
 *       - LOW_STOCK → quantity ≤ threshold
 *       - OUT_OF_STOCK → quantity = 0
 *       - EXPIRY_SOON → expiry within 30 days
 *       - EXPIRED → past expiry date
 *       - PRICE_SUGGESTION → from price suggestions analysis
 *       - INFLATION_ALERT → macro economic alert
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: unreadOnly
 *         schema: { type: boolean, default: false }
 *         description: Return only unread alerts (for notification badge)
 *     responses:
 *       200:
 *         description: List of alerts
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Alert'
 */
alertsRouter.get("/", getAlerts);

/**
 * @swagger
 * /api/alerts/unread-count:
 *   get:
 *     tags: [Alerts]
 *     summary: Get count of unread alerts
 *     description: Used by the Sidebar notification badge to show unread alert count.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Unread alert count
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         count: { type: integer, example: 5 }
 */
alertsRouter.get("/unread-count", getUnreadCount);

/**
 * @swagger
 * /api/alerts/run-checks:
 *   post:
 *     tags: [Alerts]
 *     summary: Manually trigger alert checks for all products
 *     description: |
 *       Runs low stock and expiry checks for all user products and creates new alerts.
 *       Normally runs automatically every 6 hours via cron job.
 *       Use this to force a refresh after bulk stock updates.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Alert checks completed
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         alertsCreated: { type: integer, example: 3 }
 */
alertsRouter.post("/run-checks", runAlertChecks);

/**
 * @swagger
 * /api/alerts/mark-all-read:
 *   patch:
 *     tags: [Alerts]
 *     summary: Mark all alerts as read
 *     description: Marks all unread alerts as read. Used by the "Mark all read" button in the alerts panel.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All alerts marked as read
 */
alertsRouter.patch("/mark-all-read", markAllAlertsRead);

/**
 * @swagger
 * /api/alerts/{id}/read:
 *   patch:
 *     tags: [Alerts]
 *     summary: Mark single alert as read
 *     description: Marks a specific alert as read when user dismisses it.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Alert marked as read
 *       404:
 *         description: Alert not found
 */
alertsRouter.patch("/:id/read", markAlertRead);

/**
 * @swagger
 * /api/alerts/{id}:
 *   delete:
 *     tags: [Alerts]
 *     summary: Delete an alert
 *     description: Permanently removes an alert from the list.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Alert deleted
 *       404:
 *         description: Alert not found
 */
alertsRouter.delete("/:id", deleteAlert);

// ─── Categories Router ───────────────────────────────────────────────────────
export const categoriesRouter = Router();
categoriesRouter.use(authenticate);

/**
 * @swagger
 * /api/categories:
 *   get:
 *     tags: [Categories]
 *     summary: Get all product categories
 *     description: |
 *       Returns all categories with product count.
 *       Used by the **Inventory** page category grid and **StockMovement** category selector.
 *
 *       **Frontend CategoryRecord mapping:**
 *       - `id` → CategoryRecord.id
 *       - `name` → CategoryRecord.name (e.g. "Dairy", "Bakery", "Produce")
 *       - `_count.products` → number of SKUs in category
 *
 *       **Frontend StockMovement CategorySelector:**
 *       - Renders category pill buttons from this list
 *       - After selecting category, call `GET /api/products?categoryId={id}` for products
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All categories
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Category'
 */
categoriesRouter.get("/", getCategories);

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     tags: [Categories]
 *     summary: Get category by ID with its products
 *     description: Returns category details and all active products in that category.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Category with products
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       allOf:
 *                         - $ref: '#/components/schemas/Category'
 *                         - type: object
 *                           properties:
 *                             products:
 *                               type: array
 *                               items:
 *                                 $ref: '#/components/schemas/Product'
 *       404:
 *         description: Category not found
 */
categoriesRouter.get("/:id", getCategory);

/**
 * @swagger
 * /api/categories:
 *   post:
 *     tags: [Categories]
 *     summary: Create a new category
 *     description: |
 *       Creates a new product category.
 *       Used by the **Settings** page or admin category management.
 *
 *       **Default categories matching frontend data.ts:**
 *       - Dairy, Bakery, Produce, Meat, Canned Goods, Beverages
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCategoryRequest'
 *           examples:
 *             dairy:
 *               summary: Dairy category
 *               value:
 *                 name: Dairy
 *                 description: Milk, yogurt, cheese and dairy products
 *             frozen:
 *               summary: New frozen foods category
 *               value:
 *                 name: Frozen Foods
 *                 description: Frozen meats and vegetables
 *     responses:
 *       201:
 *         description: Category created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Category'
 *       400:
 *         description: Category name already exists
 */
categoriesRouter.post(
  "/",
  [body("name").trim().notEmpty().withMessage("Category name required")],
  validate,
  createCategory
);

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     tags: [Categories]
 *     summary: Update a category
 *     description: Updates category name and/or description.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCategoryRequest'
 *     responses:
 *       200:
 *         description: Category updated
 *       404:
 *         description: Category not found
 */
categoriesRouter.put("/:id", updateCategory);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     tags: [Categories]
 *     summary: Delete a category
 *     description: Deletes a category. Will fail if the category has active products assigned to it.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Category deleted
 *       400:
 *         description: Cannot delete — category has active products
 *       404:
 *         description: Category not found
 */
categoriesRouter.delete("/:id", deleteCategory);
