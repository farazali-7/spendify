import { z } from "zod";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createLiabilitySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(200, "Name too long"),
  type: z.enum(["bank_loan", "credit_card", "personal_loan", "other"], {
    message: "Invalid liability type",
  }),
  original_amount: z.number().positive("Amount must be positive"),
  interest_rate: z
    .number()
    .min(0, "Cannot be negative")
    .max(100, "Must be 0–100%")
    .default(0),
  emi_amount: z.number().positive("EMI must be positive"),
  frequency: z
    .enum(["daily", "weekly", "monthly", "quarterly", "yearly", "custom"])
    .default("monthly"),
  start_date: z.string().regex(dateRegex, "Invalid date format"),
  next_due_date: z
    .string()
    .regex(dateRegex, "Invalid date format")
    .nullable()
    .optional(),
  expected_end_date: z
    .string()
    .regex(dateRegex, "Invalid date format")
    .nullable()
    .optional(),
  linked_account_id: z.string().uuid("Invalid account"),
  deposited_to_account: z.boolean().default(false),
  deposit_account_id: z
    .string()
    .uuid("Invalid deposit account")
    .nullable()
    .optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const createLiabilityPaymentSchema = z.object({
  account_id: z.string().uuid("Invalid account"),
  principal_amount: z.number().min(0, "Cannot be negative"),
  interest_amount: z.number().min(0, "Cannot be negative").default(0),
  payment_date: z.string().regex(dateRegex, "Invalid date format"),
  description: z.string().max(500).optional().default(""),
  notes: z.string().max(500).nullable().optional(),
});

export type CreateLiabilityPayload = z.infer<typeof createLiabilitySchema>;
export type CreateLiabilityPaymentPayload = z.infer<
  typeof createLiabilityPaymentSchema
>;
