import { Response } from "express";
import { AuthRequest } from "../types";
import analyticsService from "../services/analytics.service";
import { sendSuccess, sendError } from "../utils/response";

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stats = await analyticsService.getDashboardStats(req.user!.id);
    sendSuccess(res, stats, "Dashboard stats fetched");
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 500);
  }
};

export const getSalesChart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const period = (req.query.period as "7d" | "30d" | "90d" | "12m") || "30d";
    const data = await analyticsService.getSalesChart(req.user!.id, period);
    sendSuccess(res, data, "Sales chart data fetched");
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 500);
  }
};

export const getTopProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const period = (req.query.period as string) || "30d";
    const data = await analyticsService.getTopProducts(req.user!.id, limit, period);
    sendSuccess(res, data, "Top products fetched");
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 500);
  }
};

export const getCategoryBreakdown = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const period = (req.query.period as string) || "30d";
    const data = await analyticsService.getCategoryBreakdown(req.user!.id, period);
    sendSuccess(res, data, "Category breakdown fetched");
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 500);
  }
};

export const getInventoryStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await analyticsService.getInventoryStatus(req.user!.id);
    sendSuccess(res, data, "Inventory status fetched");
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 500);
  }
};

export const getProfitAnalysis = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const period = (req.query.period as string) || "30d";
    const data = await analyticsService.getProfitAnalysis(req.user!.id, period);
    sendSuccess(res, data, "Profit analysis fetched");
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 500);
  }
};
