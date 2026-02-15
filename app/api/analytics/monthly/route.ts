import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";

// GET /api/analytics/monthly?months=6
// Returns monthly income/expense totals for the last N months
export const GET = withAuth(async (req: NextRequest, { user, supabase }) => {
  const url = new URL(req.url);
  const months = Math.min(Math.max(parseInt(url.searchParams.get("months") || "6"), 1), 24);

  // Calculate the start date (first day of N months ago)
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  startDate.setDate(1);
  const startStr = startDate.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("transactions")
    .select("type, amount, transaction_date")
    .eq("user_id", user.id)
    .gte("transaction_date", startStr)
    .is("liability_id", null) // Exclude liability-linked transactions from analytics
    .neq("type", "transfer") // Exclude transfers from analytics
    .order("transaction_date", { ascending: true });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  // Group by month (YYYY-MM)
  const monthlyMap = new Map<string, { income: number; expenses: number }>();

  for (const txn of data || []) {
    const month = txn.transaction_date.substring(0, 7); // YYYY-MM
    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, { income: 0, expenses: 0 });
    }
    const entry = monthlyMap.get(month)!;
    const amount = Number(txn.amount);
    if (txn.type === "income") {
      entry.income += amount;
    } else {
      entry.expenses += amount;
    }
  }

  // Convert to sorted array
  const result = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, totals]) => ({
      month,
      income: totals.income,
      expenses: totals.expenses,
    }));

  return NextResponse.json({ success: true, data: result });
});
