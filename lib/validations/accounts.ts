import { z } from "zod";

export const createAccountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Account name is required")
    .max(100, "Account name too long"),
  type: z.enum(["cash", "bank", "wallet", "savings"], {
    message: "Invalid account type",
  }),
  opening_balance: z
    .number()
    .min(0, "Opening balance cannot be negative")
    .max(9999999999999.99, "Opening balance exceeds maximum")
    .default(0),
});

export type CreateAccountPayload = z.infer<typeof createAccountSchema>;
