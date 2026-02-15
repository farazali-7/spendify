import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { TransactionService } from "@/lib/services/transactions";

// GET /api/transactions?page=1&page_size=10&type=all&sort=newest&...
export const GET = withAuth(async (req, { user, supabase }) => {
  const service = new TransactionService(supabase);

  // Convert URLSearchParams to plain object
  const params: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const result = await service.getPaginated(user.id, params);
  return NextResponse.json({ success: true, data: result });
});

// POST /api/transactions — create a transaction or transfer
export const POST = withAuth(async (req, { user, supabase }) => {
  const body = await req.json();
  const service = new TransactionService(supabase);

  // Route to transfer creation if type is 'transfer'
  const transaction =
    body.type === "transfer"
      ? await service.createTransfer(user.id, body)
      : await service.createTransaction(user.id, body);

  return NextResponse.json(
    { success: true, data: transaction },
    { status: 201 }
  );
});
