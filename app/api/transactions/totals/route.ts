import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { TransactionService } from "@/lib/services/transactions";

// GET /api/transactions/totals?type=all&account_id=...&from_date=...&to_date=...
//
// Returns aggregate income/expense totals across the FULL filtered dataset
// (no pagination). Used by the transactions page KPIs.
export const GET = withAuth(async (req, { user, supabase }) => {
  const service = new TransactionService(supabase);

  const params: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const totals = await service.getFilteredTotals(user.id, params);
  return NextResponse.json({ success: true, data: totals });
});
