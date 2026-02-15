import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { CategoryRepository } from "@/lib/repositories/categories";
import { createCategorySchema } from "@/lib/validations/categories";
import { ValidationError } from "@/lib/errors";
import type { CategoryType } from "@/types/database";

// GET /api/categories?type=income|expense (optional filter)
export const GET = withAuth(async (req, { user, supabase }) => {
  const repo = new CategoryRepository(supabase);
  const typeParam = req.nextUrl.searchParams.get("type");

  let categories;
  if (typeParam === "income" || typeParam === "expense") {
    categories = await repo.findByUserAndType(
      user.id,
      typeParam as CategoryType
    );
  } else {
    categories = await repo.findAllByUser(user.id);
  }

  return NextResponse.json({ success: true, data: categories });
});

// POST /api/categories — create a new category
export const POST = withAuth(async (req, { user, supabase }) => {
  const body = await req.json();
  const result = createCategorySchema.safeParse(body);

  if (!result.success) {
    const firstError = result.error.issues[0];
    throw new ValidationError(firstError.message);
  }

  const repo = new CategoryRepository(supabase);
  const category = await repo.create(user.id, result.data);

  return NextResponse.json({ success: true, data: category }, { status: 201 });
});
