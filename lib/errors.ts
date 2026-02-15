import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types/database";

// ─── Error Classes ───────────────────────────────────────────

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class AuthError extends AppError {
  constructor(message: string = "Not authenticated") {
    super(message, 401, "AUTH_ERROR");
    this.name = "AuthError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Access denied") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
    this.name = "ConflictError";
  }
}

// ─── Supabase Error Mapper ───────────────────────────────────

export function mapSupabaseError(error: { code?: string; message: string }): AppError {
  switch (error.code) {
    case "23505":
      return new ConflictError("A record with this value already exists");
    case "23503":
      return new ValidationError("Referenced record does not exist");
    case "23514":
      return new ValidationError("Value violates a constraint: " + error.message);
    case "42501":
      return new ForbiddenError("Insufficient permissions");
    case "PGRST116":
      return new NotFoundError("Record");
    default:
      return new AppError(error.message, 500);
  }
}

// ─── API Error Handler ───────────────────────────────────────

export function handleApiError(error: unknown): NextResponse<ApiResponse<never>> {
  if (error instanceof AppError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }

  // Supabase errors have a `code` property
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    "message" in error
  ) {
    const mapped = mapSupabaseError(error as { code: string; message: string });
    return NextResponse.json(
      { success: false, error: mapped.message, code: mapped.code },
      { status: mapped.statusCode }
    );
  }

  console.error("Unhandled error:", error);
  return NextResponse.json(
    { success: false, error: "Internal server error" },
    { status: 500 }
  );
}
