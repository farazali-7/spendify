import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { AccountService } from "@/lib/services/accounts";

// GET /api/accounts — fetch all user accounts with balances
export const GET = withAuth(async (_req, { user, supabase }) => {
  const service = new AccountService(supabase);
  const accounts = await service.getAccountBalances(user.id);
  return NextResponse.json({ success: true, data: accounts });
});

// POST /api/accounts — create a new account
export const POST = withAuth(async (req, { user, supabase }) => {
  const body = await req.json();
  const service = new AccountService(supabase);
  const account = await service.createAccount(user.id, body);
  return NextResponse.json({ success: true, data: account }, { status: 201 });
});
