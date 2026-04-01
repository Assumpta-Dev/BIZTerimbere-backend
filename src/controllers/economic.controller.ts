import { Response } from "express";
import { AuthRequest } from "../types";
import economicService from "../services/economic.service";
import { sendSuccess, sendError } from "../utils/response";

export const getEconomicIndicators = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await economicService.getEconomicIndicators();
    sendSuccess(res, data, "Economic indicators fetched");
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 500);
  }
};

export const getPriceSuggestions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await economicService.getPriceSuggestions(req.user!.id);
    sendSuccess(res, data, "Price suggestions generated");
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 500);
  }
};

export const getHistoricalInflation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const years = parseInt(req.query.years as string) || 5;
    const data = await economicService.getHistoricalRates("RW", years);
    sendSuccess(res, data, "Historical inflation data fetched");
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 500);
  }
};

export const getExchangeRate = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await economicService.fetchExchangeRate();
    sendSuccess(res, data, "Exchange rate fetched");
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 500);
  }
};
