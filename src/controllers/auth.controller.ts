import { Response } from "express";
import { AuthRequest } from "../types";
import authService from "../services/auth.service";
import { sendSuccess, sendError } from "../utils/response";

export const register = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, password, businessName } = req.body;
    const result = await authService.register(name, email, password, businessName);
    sendSuccess(res, result, "Account created successfully", 201);
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 400);
  }
};

export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    sendSuccess(res, result, "Login successful");
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 401);
  }
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await authService.getProfile(req.user!.id);
    sendSuccess(res, user);
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 404);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, businessName } = req.body;
    const user = await authService.updateProfile(req.user!.id, { name, businessName });
    sendSuccess(res, user, "Profile updated");
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 400);
  }
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(req.user!.id, currentPassword, newPassword);
    sendSuccess(res, result, "Password changed successfully");
  } catch (err: unknown) {
    sendError(res, (err as Error).message, 400);
  }
};
