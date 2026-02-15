import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AuthError, handleApiError } from "@/lib/errors";
import type { SupabaseClient, User } from "@supabase/supabase-js";

// ─── Types ───────────────────────────────────────────────────

export interface AuthContext {
  user: User;
  supabase: SupabaseClient;
}

type AuthenticatedHandler = (
  req: NextRequest,
  ctx: AuthContext
) => Promise<NextResponse>;

// ─── Server-side Auth (for Server Components) ────────────────

export async function getAuthenticatedClient(): Promise<AuthContext> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthError();
  }

  return { user, supabase };
}

// ─── Route Handler Wrapper ───────────────────────────────────
//
// Wraps a route handler with:
// 1. Authentication check
// 2. Centralized error handling
// 3. Typed context injection
//
// Usage:
//   export const GET = withAuth(async (req, { user, supabase }) => { ... });

export function withAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const ctx = await getAuthenticatedClient();
      return await handler(req, ctx);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
