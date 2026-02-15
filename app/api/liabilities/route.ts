import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LiabilityService } from "@/lib/services/liabilities";

// GET /api/liabilities — fetch all liabilities with computed remaining balance
export const GET = withAuth(async (_req, { user, supabase }) => {
  const service = new LiabilityService(supabase);
  const liabilities = await service.getAllSummaries(user.id);
  return NextResponse.json({ success: true, data: liabilities });
});

// POST /api/liabilities — create a new liability (with optional deposit)
export const POST = withAuth(async (req, { user, supabase }) => {
  const body = await req.json();
  const service = new LiabilityService(supabase);
  const liabilityId = await service.createLiability(user.id, body);
  return NextResponse.json(
    { success: true, data: { id: liabilityId } },
    { status: 201 }
  );
});
