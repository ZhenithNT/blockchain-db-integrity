import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error("API Error:", err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: true,
      message: "Dữ liệu đầu vào không hợp lệ",
      details: err.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Đã xảy ra lỗi hệ thống nội bộ.";

  return res.status(statusCode).json({
    error: true,
    message,
    details: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
}
