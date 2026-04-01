import { Response } from "express";
import { AuthRequest } from "../types";
import salesService from "../services/sales.service";
import { sendSuccess, sendError } from "../utils/response";

export const createSale = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { items, paymentMode, notes } = req.body;
    const sale = await salesService.createSale(req.user!.id, items, paymentMode || "CASH", notes);
    sendSuccess(res, sale, "Sale recorded successfully", 201);
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 400);
  }
};

export const getSales = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await salesService.getSales(req.user!.id, req.query as Record<string, string>);
    sendSuccess(res, result.sales, "Sales fetched", 200, result.meta);
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 500);
  }
};

export const getSale = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sale = await salesService.getSaleById(req.params.id, req.user!.id);
    sendSuccess(res, sale);
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 404);
  }
};

export const getTodaySummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const summary = await salesService.getTodaySummary(req.user!.id);
    sendSuccess(res, summary, "Today's sales summary");
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 500);
  }
};

export const deleteSale = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await salesService.deleteSale(req.params.id, req.user!.id);
    sendSuccess(res, result, "Sale deleted and stock restored");
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 400);
  }
};
