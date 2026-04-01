import { Request } from "express";
import { JwtPayload } from "jsonwebtoken";

export interface AuthPayload extends JwtPayload {
  id: string;
  email: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface EconomicIndicators {
  inflationRate: number | null;
  exchangeRate: number | null;
  country: string;
  year: number;
  source: string;
  recommendation: string;
  priceAdjustmentFactor: number;
}

export interface PriceSuggestion {
  productId: string;
  productName: string;
  currentCostPrice: number;
  currentSellingPrice: number;
  suggestedMinPrice: number;
  suggestedMaxPrice: number;
  currentMargin: number;
  suggestedMargin: number;
  reason: string;
  inflationRate: number | null;
  adjustmentFactor: number;
}

export interface DashboardStats {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  expiringSoonProducts: number;
  expiredProducts: number;
  todayRevenue: number;
  todayProfit: number;
  todaySalesCount: number;
  monthRevenue: number;
  monthProfit: number;
  totalInventoryValue: number;
}
