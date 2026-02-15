import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LiabilityService } from "@/lib/services/liabilities";

// GET /api/liabilities/[id]/payments — fetch payment history for a liability
export const GET = withAuth(
  async (req: NextRequest, { user, supabase }) => {
    const liabilityId = req.nextUrl.pathname.split("/").at(-2)!;
    const service = new LiabilityService(supabase);
    const payments = await service.getPayments(user.id, liabilityId);
    return NextResponse.json({ success: true, data: payments });
  }
);

// POST /api/liabilities/[id]/payments — make a payment on a liability
export const POST = withAuth(
  async (req: NextRequest, { user, supabase }) => {
    const liabilityId = req.nextUrl.pathname.split("/").at(-2)!;
    const body = await req.json();
    const service = new LiabilityService(supabase);
    const paymentId = await service.makePayment(user.id, liabilityId, body);
    return NextResponse.json(
      { success: true, data: { id: paymentId } },
      { status: 201 }
    );
  }
);
