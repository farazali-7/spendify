import type { SupabaseClient } from "@supabase/supabase-js";
import { TransactionRepository } from "@/lib/repositories/transactions";
import { AccountRepository } from "@/lib/repositories/accounts";
import { CategoryRepository } from "@/lib/repositories/categories";
import {
  createTransactionSchema,
  createTransferSchema,
  transactionFiltersSchema,
} from "@/lib/validations/transactions";
import { ValidationError, NotFoundError } from "@/lib/errors";
import type {
  Transaction,
  TransactionWithDetails,
  PaginatedResult,
  MonthlyTotal,
  CategoryBreakdown,
} from "@/types/database";

export class TransactionService {
  private txnRepo: TransactionRepository;
  private accountRepo: AccountRepository;
  private categoryRepo: CategoryRepository;

  constructor(supabase: SupabaseClient) {
    this.txnRepo = new TransactionRepository(supabase);
    this.accountRepo = new AccountRepository(supabase);
    this.categoryRepo = new CategoryRepository(supabase);
  }

  // ─── Fetch paginated transactions ──────────────────────────

  async getPaginated(
    userId: string,
    rawFilters: Record<string, string | undefined>
  ): Promise<PaginatedResult<TransactionWithDetails>> {
    const result = transactionFiltersSchema.safeParse(rawFilters);
    if (!result.success) {
      const firstError = result.error.issues[0];
      throw new ValidationError(firstError.message);
    }

    return this.txnRepo.findPaginated(userId, result.data);
  }

  // ─── Aggregate totals (full dataset, no pagination) ─────────

  async getFilteredTotals(
    userId: string,
    rawFilters: Record<string, string | undefined>
  ): Promise<{ income: number; expenses: number; count: number }> {
    const result = transactionFiltersSchema.safeParse({
      ...rawFilters,
      page: "1",
      page_size: "1",
    });
    if (!result.success) {
      const firstError = result.error.issues[0];
      throw new ValidationError(firstError.message);
    }

    const { type, account_id, category_id, search, from_date, to_date } =
      result.data;
    return this.txnRepo.getFilteredTotals(userId, {
      type,
      account_id,
      category_id,
      search,
      from_date,
      to_date,
    });
  }

  // ─── Financial-safe transaction creation ───────────────────
  //
  // Validation chain:
  //   1. Schema validation (type, format, range)
  //   2. Account exists AND belongs to this user
  //   3. Category exists AND belongs to this user
  //   4. Category type matches transaction type
  //   5. Insert (database triggers provide defense-in-depth)

  async createTransaction(
    userId: string,
    input: unknown
  ): Promise<Transaction> {
    // Step 1: Schema validation
    const result = createTransactionSchema.safeParse(input);
    if (!result.success) {
      const firstError = result.error.issues[0];
      throw new ValidationError(firstError.message);
    }

    const data = result.data;

    // Step 2: Verify account ownership
    const account = await this.accountRepo.findById(userId, data.account_id);
    if (!account) {
      throw new NotFoundError("Account");
    }

    // Step 3: Verify category ownership
    const category = await this.categoryRepo.findById(
      userId,
      data.category_id
    );
    if (!category) {
      throw new NotFoundError("Category");
    }

    // Step 4: Enforce category ↔ transaction type match
    if (category.type !== data.type) {
      throw new ValidationError(
        `Category "${category.name}" is of type "${category.type}" and cannot be used for a "${data.type}" transaction`
      );
    }

    // Step 5: Insert (DB triggers validate again as defense-in-depth)
    return this.txnRepo.create(userId, data);
  }

  // ─── Transfer creation ──────────────────────────────────────

  async createTransfer(
    userId: string,
    input: unknown
  ): Promise<Transaction> {
    const result = createTransferSchema.safeParse(input);
    if (!result.success) {
      const firstError = result.error.issues[0];
      throw new ValidationError(firstError.message);
    }

    const data = result.data;

    // Verify source account ownership
    const fromAccount = await this.accountRepo.findById(
      userId,
      data.from_account_id
    );
    if (!fromAccount) {
      throw new NotFoundError("Source account");
    }

    // Verify destination account ownership
    const toAccount = await this.accountRepo.findById(
      userId,
      data.to_account_id
    );
    if (!toAccount) {
      throw new NotFoundError("Destination account");
    }

    return this.txnRepo.createTransfer(userId, data);
  }

  // ─── Delete transaction ────────────────────────────────────

  async deleteTransaction(
    userId: string,
    transactionId: string
  ): Promise<void> {
    const existing = await this.txnRepo.findById(userId, transactionId);
    if (!existing) {
      throw new NotFoundError("Transaction");
    }

    if (existing.liability_id) {
      throw new ValidationError(
        "Cannot delete a liability-linked transaction directly. Use the liability payment functions."
      );
    }

    return this.txnRepo.delete(userId, transactionId);
  }

  // ─── Dashboard data ────────────────────────────────────────

  async getRecentTransactions(
    userId: string,
    limit: number = 5
  ): Promise<TransactionWithDetails[]> {
    return this.txnRepo.getRecentByUser(userId, limit);
  }

  async getMonthlyTotals(
    userId: string,
    months: number = 6
  ): Promise<MonthlyTotal[]> {
    return this.txnRepo.getMonthlyTotals(userId, months);
  }

  async getCurrentMonthTotals(
    userId: string
  ): Promise<{ income: number; expenses: number; count: number }> {
    return this.txnRepo.getCurrentMonthTotals(userId);
  }

  async getCategoryBreakdown(
    userId: string,
    months: number = 1,
    type: "income" | "expense" = "expense"
  ): Promise<CategoryBreakdown[]> {
    return this.txnRepo.getCategoryBreakdown(userId, months, type);
  }
}
