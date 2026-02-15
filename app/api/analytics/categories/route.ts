import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";

// GET /api/analytics/categories?months=6
// Returns expense category breakdown for the last N months
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
    .select("amount, category_id, categories(id, name, color)")
    .eq("user_id", user.id)
    .eq("type", "expense")
    .gte("transaction_date", startStr)
    .is("liability_id", null) // Exclude liability-linked transactions
    .neq("type", "transfer"); // Exclude transfers from analytics

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  // Group by category
  const categoryMap = new Map<string, { name: string; color: string | null; total: number }>();

  for (const txn of data || []) {
    const cat = txn.categories as unknown as { id: string; name: string; color: string | null } | null;
    if (!cat) continue;

    const catId = txn.category_id;
    if (!categoryMap.has(catId)) {
      categoryMap.set(catId, { name: cat.name, color: cat.color, total: 0 });
    }
    categoryMap.get(catId)!.total += Number(txn.amount);
  }

  // Convert to sorted array (highest spending first)
  const result = Array.from(categoryMap.entries())
    .map(([category_id, info]) => ({
      category_id,
      name: info.name,
      color: info.color,
      total: info.total,
    }))
    .sort((a, b) => b.total - a.total);

  return NextResponse.json({ success: true, data: result });
});
