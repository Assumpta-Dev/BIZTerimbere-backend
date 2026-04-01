import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/database";
import { AuthPayload } from "../types";

export class AuthService {
  async register(name: string, email: string, password: string, businessName: string) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error("Email already registered");

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, businessName },
      select: { id: true, name: true, email: true, businessName: true, role: true, createdAt: true },
    });

    const token = this.generateToken({ id: user.id, email: user.email, role: user.role });
    return { user, token };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error("Invalid credentials");

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error("Invalid credentials");

    const token = this.generateToken({ id: user.id, email: user.email, role: user.role });
    const { password: _, ...safeUser } = user;
    return { user: safeUser, token };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, businessName: true, role: true, createdAt: true },
    });
    if (!user) throw new Error("User not found");
    return user;
  }

  async updateProfile(userId: string, data: { name?: string; businessName?: string }) {
    return prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, email: true, businessName: true, role: true },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new Error("Current password is incorrect");

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
    return { message: "Password changed successfully" };
  }

  private generateToken(payload: Omit<AuthPayload, "iat" | "exp">): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return jwt.sign(payload, process.env.JWT_SECRET as string, {
      expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as any,
    });
  }
}

export default new AuthService();
