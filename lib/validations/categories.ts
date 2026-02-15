import { z } from "zod";

export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Category name is required")
    .max(100, "Category name too long"),
  type: z.enum(["income", "expense"], {
    message: "Invalid category type",
  }),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color")
    .optional(),
});

export type CreateCategoryPayload = z.infer<typeof createCategorySchema>;
