import { Response } from "express";
import { AuthRequest } from "../types";
import alertService from "../services/alert.service";
import categoryService from "../services/category.service";
import { sendSuccess, sendError } from "../utils/response";

// ─── Alert Controller ────────────────────────────────────────────────────────
export const getAlerts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const unreadOnly = req.query.unreadOnly === "true";
    const alerts = await alertService.getAlerts(req.user!.id, unreadOnly);
    sendSuccess(res, alerts);
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 500);
  }
};

export const markAlertRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const alert = await alertService.markAsRead(req.params.id, req.user!.id);
    sendSuccess(res, alert, "Alert marked as read");
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 400);
  }
};

export const markAllAlertsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await alertService.markAllAsRead(req.user!.id);
    sendSuccess(res, result, "All alerts marked as read");
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 500);
  }
};

export const getUnreadCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const count = await alertService.getUnreadCount(req.user!.id);
    sendSuccess(res, { count });
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 500);
  }
};

export const runAlertChecks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await alertService.runAlertChecks(req.user!.id);
    sendSuccess(res, result, `Alert check completed. ${result.count} new alerts generated.`);
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 500);
  }
};

export const deleteAlert = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await alertService.deleteAlert(req.params.id, req.user!.id);
    sendSuccess(res, null, "Alert deleted");
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 400);
  }
};

// ─── Category Controller ─────────────────────────────────────────────────────
export const getCategories = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const categories = await categoryService.getAll();
    sendSuccess(res, categories);
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 500);
  }
};

export const getCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const category = await categoryService.getById(req.params.id);
    sendSuccess(res, category);
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 404);
  }
};

export const createCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;
    const category = await categoryService.create(name, description);
    sendSuccess(res, category, "Category created", 201);
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 400);
  }
};

export const updateCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const category = await categoryService.update(req.params.id, req.body);
    sendSuccess(res, category, "Category updated");
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 400);
  }
};

export const deleteCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await categoryService.delete(req.params.id);
    sendSuccess(res, null, "Category deleted");
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 400);
  }
};
