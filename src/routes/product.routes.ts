import { Router } from "express";
import { body, param } from "express-validator";
import {
  getProducts, getProduct, createProduct, updateProduct,
  deleteProduct, adjustStock, getLowStock, getExpiringProducts,
  getStockLogs, getByBarcode,
} from "../controllers/product.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: Get all products with filters and pagination
 *     description: |
 *       Returns paginated product list with computed fields (isLowStock, isExpiringSoon, daysUntilExpiry, profitMargin).
 *       Used by the **Inventory** page live stock register table.
 *
 *       **Frontend mapping:**
 *       - `name` → ProductInventoryItem.name
 *       - `sku` → ProductInventoryItem.sku
 *       - `quantity` → ProductInventoryItem.quantity
 *       - `lowStockThreshold` → ProductInventoryItem.threshold
 *       - `sellingPrice` → ProductInventoryItem.price
 *       - `costPrice` → ProductInventoryItem.costPrice
 *       - `manufacturingDate` → ProductInventoryItem.manufacturedDate
 *       - `isLowStock` + `isExpiringSoon` → ProductInventoryItem.status
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by name, barcode, SKU, or supplier
 *         example: milk
 *       - in: query
 *         name: categoryId
 *         schema: { type: string, format: uuid }
 *         description: Filter by category ID
 *       - in: query
 *         name: stockStatus
 *         schema:
 *           type: string
 *           enum: [low, out, expiring, expired]
 *         description: |
 *           Filter by stock status:
 *           - `low` → maps to frontend status "low"
 *           - `out` → maps to frontend status "critical" (quantity = 0)
 *           - `expiring` → maps to frontend status "expiring"
 *           - `expired` → maps to frontend status "critical" (past expiry)
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Paginated product list
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
 *                         products:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Product'
 *                         meta:
 *                           $ref: '#/components/schemas/PaginationMeta'
 */
router.get("/", getProducts);

/**
 * @swagger
 * /api/products/low-stock:
 *   get:
 *     tags: [Products]
 *     summary: Get all low stock products
 *     description: |
 *       Returns products where quantity ≤ lowStockThreshold.
 *       Used by the **Dashboard** "Low Stock Alerts" metric card and **Inventory** summary card.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Low stock products with urgency level
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
 *                         allOf:
 *                           - $ref: '#/components/schemas/Product'
 *                           - type: object
 *                             properties:
 *                               urgency:
 *                                 type: string
 *                                 enum: [critical, high, medium]
 */
router.get("/low-stock", getLowStock);

/**
 * @swagger
 * /api/products/expiring:
 *   get:
 *     tags: [Products]
 *     summary: Get products expiring soon
 *     description: |
 *       Returns products with expiryDate within the specified number of days.
 *       Used by the **Inventory** "Expiring soon" panel and **Dashboard** action queue.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 30, minimum: 1 }
 *         description: Number of days ahead to check (default 30, use 5 for "Expiring in 5 days" card)
 *     responses:
 *       200:
 *         description: Products expiring within the specified window, sorted by soonest first
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
 *                         $ref: '#/components/schemas/Product'
 */
router.get("/expiring", getExpiringProducts);

/**
 * @swagger
 * /api/products/barcode/{barcode}:
 *   get:
 *     tags: [Products]
 *     summary: Look up product by barcode
 *     description: Barcode scanner integration endpoint. Returns product details for instant lookup.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: barcode
 *         required: true
 *         schema: { type: string }
 *         example: "6001100000001"
 *     responses:
 *       200:
 *         description: Product found
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 */
router.get("/barcode/:barcode", getByBarcode);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get product by ID
 *     description: Returns full product details including recent sale history, stock logs, and unread alerts.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 */
router.get("/:id", getProduct);

/**
 * @swagger
 * /api/products:
 *   post:
 *     tags: [Products]
 *     summary: Create a new product
 *     description: |
 *       Creates a new product and logs initial stock if quantity > 0.
 *       Used when adding products from the **Inventory** page or **StockMovement** product entry form.
 *
 *       **Frontend mapping (ProductForm / ProductEntry):**
 *       - `name` ← product name input
 *       - `categoryId` ← CategorySelector selection
 *       - `sku` ← SKU field (e.g. "DAR-001")
 *       - `sellingPrice` ← price field
 *       - `quantity` ← initial quantity
 *       - `lowStockThreshold` ← threshold field
 *       - `manufacturingDate` ← manufactured date picker
 *       - `expiryDate` ← expiry date picker
 *       - `stockMethod` ← FIFO/LIFO toggle
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProductRequest'
 *           examples:
 *             dairy:
 *               summary: Fresh Milk 1L (Dairy)
 *               value:
 *                 name: Fresh Milk 1L
 *                 sku: DAR-001
 *                 categoryId: "<category-uuid>"
 *                 costPrice: 760
 *                 sellingPrice: 1000
 *                 quantity: 64
 *                 lowStockThreshold: 20
 *                 unit: litre
 *                 manufacturingDate: "2026-03-18"
 *                 expiryDate: "2026-04-05"
 *                 stockMethod: FIFO
 *             meat:
 *               summary: Chicken (Meat)
 *               value:
 *                 name: Chicken
 *                 sku: MET-001
 *                 categoryId: "<category-uuid>"
 *                 costPrice: 2700
 *                 sellingPrice: 3500
 *                 quantity: 12
 *                 lowStockThreshold: 15
 *                 unit: kg
 *                 expiryDate: "2026-04-03"
 *                 stockMethod: FIFO
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Product'
 *       400:
 *         description: Validation error, duplicate barcode, or duplicate SKU
 */
router.post(
  "/",
  [
    body("name").trim().notEmpty().withMessage("Product name required"),
    body("categoryId").notEmpty().withMessage("Category required"),
    body("costPrice").isFloat({ min: 0 }).withMessage("Valid cost price required"),
    body("sellingPrice").isFloat({ min: 0 }).withMessage("Valid selling price required"),
    body("quantity").optional().isInt({ min: 0 }),
    body("lowStockThreshold").optional().isInt({ min: 1 }),
  ],
  validate,
  createProduct
);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     tags: [Products]
 *     summary: Update product details
 *     description: Updates any product field. Used by the Inventory page edit form.
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
 *             $ref: '#/components/schemas/CreateProductRequest'
 *     responses:
 *       200:
 *         description: Product updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 */
router.put("/:id", updateProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Soft-delete a product
 *     description: Sets isActive=false. Product is hidden from all listings but data is preserved.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Product deactivated
 *       404:
 *         description: Product not found
 */
router.delete("/:id", deleteProduct);

/**
 * @swagger
 * /api/products/{id}/stock:
 *   patch:
 *     tags: [Products]
 *     summary: Adjust product stock (IN / OUT / ADJUSTMENT)
 *     description: |
 *       Records a stock movement and updates product quantity.
 *       This is the primary endpoint for the **StockMovement** page form.
 *
 *       **Frontend StockMovement form mapping:**
 *       - Movement type "Stock In" → `type: "IN"` (requires manufacturedDate + expiryDate in product update)
 *       - Movement type "Stock Out" → `type: "OUT"`
 *       - `quantity` ← quantity stepper value
 *       - `reason` ← auto-generated from product name + movement type
 *
 *       **FIFO/LIFO:** The stock method is set per-product at creation. This endpoint respects it automatically.
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
 *             $ref: '#/components/schemas/StockAdjustRequest'
 *           examples:
 *             stockIn:
 *               summary: Stock In — new delivery
 *               value:
 *                 type: IN
 *                 quantity: 50
 *                 reason: New delivery from Inyange Industries
 *             stockOut:
 *               summary: Stock Out — dispatch
 *               value:
 *                 type: OUT
 *                 quantity: 10
 *                 reason: Dispatched to Kigali Fresh Mart
 *             adjustment:
 *               summary: Physical count adjustment
 *               value:
 *                 type: ADJUSTMENT
 *                 quantity: 62
 *                 reason: Physical count — system had 64, physical shows 62
 *     responses:
 *       200:
 *         description: Stock adjusted and movement logged
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Product'
 *       400:
 *         description: Insufficient stock (for OUT type)
 *       404:
 *         description: Product not found
 */
router.patch(
  "/:id/stock",
  [
    param("id").notEmpty(),
    body("type").isIn(["IN", "OUT", "ADJUSTMENT"]).withMessage("Type must be IN, OUT, or ADJUSTMENT"),
    body("quantity").isInt({ min: 1 }).withMessage("Quantity must be a positive integer"),
  ],
  validate,
  adjustStock
);

/**
 * @swagger
 * /api/products/{id}/stock-logs:
 *   get:
 *     tags: [Products]
 *     summary: Get stock movement history for a product
 *     description: |
 *       Returns the last 50 stock movements for a product.
 *       Used by the **StockMovement** page session log table.
 *
 *       **Frontend StockMovement log table columns:**
 *       - Type ← `type` (IN/OUT/SALE/RETURN/ADJUSTMENT)
 *       - Qty ← `quantity`
 *       - Total ← `quantity * product.sellingPrice` (computed on frontend)
 *       - Mfg Date / Expiry ← stored on product, not in log
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Stock movement history
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
 *                         $ref: '#/components/schemas/StockLog'
 *       404:
 *         description: Product not found
 */
router.get("/:id/stock-logs", getStockLogs);

export default router;
