import { z } from "zod";

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createTransactionSchema = z.object({
  account_id: z.string().regex(uuidRegex, "Invalid account ID"),
  category_id: z.string().regex(uuidRegex, "Invalid category ID"),
  type: z.enum(["income", "expense"], {
    message: "Type must be income or expense",
  }),
  amount: z
    .number()
    .positive("Amount must be greater than 0")
    .max(9999999999999.99, "Amount exceeds maximum"),
  description: z.string().trim().max(500, "Description too long").default(""),
  transaction_date: z
    .string()
    .regex(dateRegex, "Date must be YYYY-MM-DD format"),
});

export const createTransferSchema = z
  .object({
    from_account_id: z.string().regex(uuidRegex, "Invalid source account ID"),
    to_account_id: z
      .string()
      .regex(uuidRegex, "Invalid destination account ID"),
    amount: z
      .number()
      .positive("Amount must be greater than 0")
      .max(9999999999999.99, "Amount exceeds maximum"),
    description: z.string().trim().max(500, "Description too long").default(""),
    transaction_date: z
      .string()
      .regex(dateRegex, "Date must be YYYY-MM-DD format"),
  })
  .refine((data) => data.from_account_id !== data.to_account_id, {
    message: "Source and destination accounts must be different",
    path: ["to_account_id"],
  });

export const transactionFiltersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(10),
  type: z.enum(["income", "expense", "transfer", "all"]).default("all"),
  account_id: z.string().regex(uuidRegex).optional(),
  category_id: z.string().regex(uuidRegex).optional(),
  sort: z
    .enum(["newest", "oldest", "amount_desc", "amount_asc"])
    .default("newest"),
  search: z.string().max(200).optional(),
  from_date: z.string().regex(dateRegex).optional(),
  to_date: z.string().regex(dateRegex).optional(),
});

export type CreateTransactionPayload = z.infer<typeof createTransactionSchema>;
export type CreateTransferPayload = z.infer<typeof createTransferSchema>;
export type TransactionFiltersPayload = z.infer<
  typeof transactionFiltersSchema
>;
