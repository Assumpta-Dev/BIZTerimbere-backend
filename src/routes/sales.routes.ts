import { Router } from "express";
import { body } from "express-validator";
import { createSale, getSales, getSale, getTodaySummary, deleteSale } from "../controllers/sales.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /api/sales:
 *   post:
 *     tags: [Sales]
 *     summary: Record a new sale (multiple items)
 *     description: |
 *       Records a sale transaction, automatically deducts stock from each product,
 *       logs stock movements, and creates LOW_STOCK or OUT_OF_STOCK alerts if thresholds are crossed.
 *
 *       **Frontend StockMovement page:** When movement type is "Stock Out" for a sale,
 *       use this endpoint instead of `PATCH /api/products/{id}/stock` to properly track revenue and profit.
 *
 *       **Payment modes map to frontend:**
 *       - CASH → cash transactions
 *       - MOBILE_MONEY → MTN MoMo / Airtel Money
 *       - CARD → POS card payments
 *       - CREDIT → credit/deferred payment
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSaleRequest'
 *           examples:
 *             singleItem:
 *               summary: Single product sale
 *               value:
 *                 items:
 *                   - productId: "<product-uuid>"
 *                     quantity: 2
 *                 paymentMode: CASH
 *             multiItem:
 *               summary: Multi-product sale (Kigali Fresh Mart order)
 *               value:
 *                 items:
 *                   - productId: "<milk-uuid>"
 *                     quantity: 10
 *                   - productId: "<bread-uuid>"
 *                     quantity: 5
 *                   - productId: "<banana-uuid>"
 *                     quantity: 20
 *                 paymentMode: MOBILE_MONEY
 *                 notes: Kigali Fresh Mart weekly order
 *     responses:
 *       201:
 *         description: Sale recorded, stock updated, alerts triggered if needed
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Sale'
 *       400:
 *         description: Insufficient stock or product not found
 */
router.post(
  "/",
  [
    body("items").isArray({ min: 1 }).withMessage("At least one item required"),
    body("items.*.productId").notEmpty().withMessage("Product ID required"),
    body("items.*.quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
    body("paymentMode").optional().isIn(["CASH", "MOBILE_MONEY", "CARD", "CREDIT"]),
  ],
  validate,
  createSale
);

/**
 * @swagger
 * /api/sales:
 *   get:
 *     tags: [Sales]
 *     summary: Get all sales with optional filters
 *     description: |
 *       Returns paginated sales history. Used by the **Reports** page sales table.
 *
 *       **Frontend Reports page filters:**
 *       - Date range picker → `startDate` + `endDate`
 *       - Payment mode filter → `paymentMode`
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *         example: "2026-03-01"
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *         example: "2026-03-31"
 *       - in: query
 *         name: paymentMode
 *         schema:
 *           type: string
 *           enum: [CASH, MOBILE_MONEY, CARD, CREDIT]
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated sales list
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
 *                         sales:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Sale'
 *                         meta:
 *                           $ref: '#/components/schemas/PaginationMeta'
 */
router.get("/", getSales);

/**
 * @swagger
 * /api/sales/today:
 *   get:
 *     tags: [Sales]
 *     summary: Get today's sales summary with hourly breakdown
 *     description: |
 *       Returns today's revenue, profit, transaction count, and items sold.
 *       Used by the **Dashboard** "Today's Movement" metric card.
 *
 *       **Frontend mapping:**
 *       - `totalItemsSold` → Dashboard metric "Today's Movement" value (1,248 units)
 *       - `totalRevenue` → today's revenue
 *       - `hourlyBreakdown` → hourly chart data
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Today's sales summary
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/TodaySummary'
 */
router.get("/today", getTodaySummary);

/**
 * @swagger
 * /api/sales/{id}:
 *   get:
 *     tags: [Sales]
 *     summary: Get sale by ID
 *     description: Returns full sale details including all line items with product info.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Sale details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Sale'
 *       404:
 *         description: Sale not found
 */
router.get("/:id", getSale);

/**
 * @swagger
 * /api/sales/{id}:
 *   delete:
 *     tags: [Sales]
 *     summary: Delete sale and restore stock (refund/void)
 *     description: |
 *       Deletes a sale and restores all product quantities.
 *       Creates RETURN stock log entries for each item.
 *       Use this for refunds or incorrectly recorded sales.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Sale deleted and stock restored
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
 *                         message:
 *                           type: string
 *                           example: Sale deleted and stock restored
 *       404:
 *         description: Sale not found
 */
router.delete("/:id", deleteSale);

export default router;
