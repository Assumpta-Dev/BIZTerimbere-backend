import { Response } from "express";
import { ApiResponse } from "../types";

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = "Success",
  statusCode = 200,
  meta?: ApiResponse<T>["meta"]
): Response => {
  const response: ApiResponse<T> = { success: true, message, data };
  if (meta) response.meta = meta;
  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 400,
  error?: string
): Response => {
  const response: ApiResponse = { success: false, message };
  if (error && process.env.NODE_ENV === "development") response.error = error;
  return res.status(statusCode).json(response);
};

export const getPagination = (page = "1", limit = "20") => {
  const p = Math.max(1, parseInt(page, 10));
  const l = Math.min(100, Math.max(1, parseInt(limit, 10)));
  return { skip: (p - 1) * l, take: l, page: p, limit: l };
};
