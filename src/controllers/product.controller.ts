import { Response } from "express";
import { AuthRequest } from "../types";
import productService from "../services/product.service";
import { sendSuccess, sendError } from "../utils/response";

export const getProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await productService.getAll(req.user!.id, req.query as Record<string, string>);
    sendSuccess(res, result.products, "Products fetched", 200, result.meta);
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 500);
  }
};

export const getProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const product = await productService.getById(req.params.id, req.user!.id);
    sendSuccess(res, product);
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 404);
  }
};

export const createProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const product = await productService.create(req.user!.id, req.body);
    sendSuccess(res, product, "Product created", 201);
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 400);
  }
};

export const updateProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const product = await productService.update(req.params.id, req.user!.id, req.body);
    sendSuccess(res, product, "Product updated");
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 400);
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await productService.delete(req.params.id, req.user!.id);
    sendSuccess(res, null, "Product deleted");
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 400);
  }
};

export const adjustStock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, quantity, reason } = req.body;
    const product = await productService.adjustStock(req.params.id, req.user!.id, type, quantity, reason);
    sendSuccess(res, product, "Stock adjusted");
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 400);
  }
};

export const getLowStock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const products = await productService.getLowStock(req.user!.id);
    sendSuccess(res, products, `${products.length} low stock product(s) found`);
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 500);
  }
};

export const getExpiringProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const products = await productService.getExpiringProducts(req.user!.id, days);
    sendSuccess(res, products, `${products.length} product(s) expiring within ${days} days`);
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 500);
  }
};

export const getStockLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const logs = await productService.getStockLogs(req.params.id, req.user!.id);
    sendSuccess(res, logs);
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 400);
  }
};

export const getByBarcode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const product = await productService.getByBarcode(req.params.barcode, req.user!.id);
    sendSuccess(res, product);
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 404);
  }
};
