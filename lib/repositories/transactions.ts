import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Transaction,
  TransactionWithDetails,
  CreateTransactionInput,
  CreateTransferInput,
  TransactionFilters,
  PaginatedResult,
  MonthlyTotal,
  CategoryBreakdown,
} from "@/types/database";

export class TransactionRepository {
  constructor(private supabase: SupabaseClient) {}

  // ─── Shared select string for transaction queries ────────────
  //
  // Uses explicit foreign key names so Supabase can disambiguate
  // which accounts FK to join on (account_id vs transfer_from/to).
  private static readonly DETAIL_SELECT = `
    *,
    account:accounts!transactions_account_id_fkey(name, type),
    category:categories(name, color),
    transfer_from_account:accounts!transactions_transfer_from_account_id_fkey(name, type),
    transfer_to_account:accounts!transactions_transfer_to_account_id_fkey(name, type)
  `;

  async findPaginated(
    userId: string,
    filters: TransactionFilters
  ): Promise<PaginatedResult<TransactionWithDetails>> {
    let query = this.supabase
      .from("transactions")
      .select(TransactionRepository.DETAIL_SELECT, { count: "exact" })
      .eq("user_id", userId);

    // ── Filters ──
    if (filters.type !== "all") {
      query = query.eq("type", filters.type);
    }
    if (filters.account_id) {
      // For transfers, match either from or to account
      query = query.or(
        `account_id.eq.${filters.account_id},transfer_from_account_id.eq.${filters.account_id},transfer_to_account_id.eq.${filters.account_id}`
      );
    }
    if (filters.category_id) {
      query = query.eq("category_id", filters.category_id);
    }
    if (filters.from_date) {
      query = query.gte("transaction_date", filters.from_date);
    }
    if (filters.to_date) {
      query = query.lte("transaction_date", filters.to_date);
    }
    if (filters.search) {
      query = query.ilike("description", `%${filters.search}%`);
    }

    // ── Sorting ──
    switch (filters.sort) {
      case "newest":
        query = query
          .order("transaction_date", { ascending: false })
          .order("created_at", { ascending: false });
        break;
      case "oldest":
        query = query
          .order("transaction_date", { ascending: true })
          .order("created_at", { ascending: true });
        break;
      case "amount_desc":
        query = query.order("amount", { ascending: false });
        break;
      case "amount_asc":
        query = query.order("amount", { ascending: true });
        break;
    }

    // ── Pagination ──
    const from = (filters.page - 1) * filters.page_size;
    const to = from + filters.page_size - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    const total = count ?? 0;

    return {
      data: data as TransactionWithDetails[],
      total,
      page: filters.page,
      page_size: filters.page_size,
      total_pages: Math.ceil(total / filters.page_size),
    };
  }

  // ─── Aggregate totals (same filters, no pagination) ──────────
  //
  // Returns income/expense sums across the FULL filtered dataset.
  // Transfers are excluded from income/expense sums.
  async getFilteredTotals(
    userId: string,
    filters: Omit<TransactionFilters, "page" | "page_size" | "sort">
  ): Promise<{ income: number; expenses: number; count: number }> {
    let query = this.supabase
      .from("transactions")
      .select("type, amount")
      .eq("user_id", userId);

    if (filters.type !== "all") {
      query = query.eq("type", filters.type);
    }
    if (filters.account_id) {
      query = query.or(
        `account_id.eq.${filters.account_id},transfer_from_account_id.eq.${filters.account_id},transfer_to_account_id.eq.${filters.account_id}`
      );
    }
    if (filters.category_id) {
      query = query.eq("category_id", filters.category_id);
    }
    if (filters.from_date) {
      query = query.gte("transaction_date", filters.from_date);
    }
    if (filters.to_date) {
      query = query.lte("transaction_date", filters.to_date);
    }
    if (filters.search) {
      query = query.ilike("description", `%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    let income = 0;
    let expenses = 0;
    for (const tx of data) {
      if (tx.type === "income") income += Number(tx.amount);
      else if (tx.type === "expense") expenses += Number(tx.amount);
      // transfers excluded from income/expense totals
    }

    return { income, expenses, count: data.length };
  }

  async findById(
    userId: string,
    transactionId: string
  ): Promise<Transaction | null> {
    const { data, error } = await this.supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async create(
    userId: string,
    input: CreateTransactionInput
  ): Promise<Transaction> {
    const { data, error } = await this.supabase
      .from("transactions")
      .insert({
        user_id: userId,
        account_id: input.account_id,
        category_id: input.category_id,
        type: input.type,
        amount: input.amount,
        description: input.description,
        transaction_date: input.transaction_date,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async createTransfer(
    userId: string,
    input: CreateTransferInput
  ): Promise<Transaction> {
    const { data, error } = await this.supabase
      .from("transactions")
      .insert({
        user_id: userId,
        account_id: input.from_account_id,
        category_id: null,
        type: "transfer" as const,
        amount: input.amount,
        description: input.description,
        transaction_date: input.transaction_date,
        transfer_from_account_id: input.from_account_id,
        transfer_to_account_id: input.to_account_id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async delete(userId: string, transactionId: string): Promise<void> {
    const { error } = await this.supabase
      .from("transactions")
      .delete()
      .eq("id", transactionId)
      .eq("user_id", userId);

    if (error) throw error;
  }

  async getRecentByUser(
    userId: string,
    limit: number = 5
  ): Promise<TransactionWithDetails[]> {
    const { data, error } = await this.supabase
      .from("transactions")
      .select(TransactionRepository.DETAIL_SELECT)
      .eq("user_id", userId)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as TransactionWithDetails[];
  }

  async getMonthlyTotals(
    userId: string,
    months: number = 6
  ): Promise<MonthlyTotal[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months + 1);
    startDate.setDate(1);
    const startDateStr = startDate.toISOString().split("T")[0];

    const { data, error } = await this.supabase
      .from("transactions")
      .select("type, amount, transaction_date")
      .eq("user_id", userId)
      .gte("transaction_date", startDateStr)
      .is("liability_id", null)
      .neq("type", "transfer"); // Exclude transfers from analytics

    if (error) throw error;

    const monthMap = new Map<string, { income: number; expenses: number }>();

    for (const tx of data) {
      const date = new Date(tx.transaction_date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!monthMap.has(key)) {
        monthMap.set(key, { income: 0, expenses: 0 });
      }

      const entry = monthMap.get(key)!;
      if (tx.type === "income") {
        entry.income += Number(tx.amount);
      } else {
        entry.expenses += Number(tx.amount);
      }
    }

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, totals]) => ({
        month,
        income: totals.income,
        expenses: totals.expenses,
      }));
  }

  async getCurrentMonthTotals(
    userId: string
  ): Promise<{ income: number; expenses: number; count: number }> {
    const now = new Date();
    const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const lastDayStr = lastDay.toISOString().split("T")[0];

    const { data, error } = await this.supabase
      .from("transactions")
      .select("type, amount")
      .eq("user_id", userId)
      .gte("transaction_date", firstDay)
      .lte("transaction_date", lastDayStr)
      .is("liability_id", null)
      .neq("type", "transfer"); // Exclude transfers from analytics

    if (error) throw error;

    let income = 0;
    let expenses = 0;
    for (const tx of data) {
      if (tx.type === "income") income += Number(tx.amount);
      else expenses += Number(tx.amount);
    }

    return { income, expenses, count: data.length };
  }

  async getCategoryBreakdown(
    userId: string,
    months: number = 1,
    type: "income" | "expense" = "expense"
  ): Promise<CategoryBreakdown[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months + 1);
    startDate.setDate(1);
    const startDateStr = startDate.toISOString().split("T")[0];

    const { data, error } = await this.supabase
      .from("transactions")
      .select("category_id, amount, category:categories!inner(name, color)")
      .eq("user_id", userId)
      .eq("type", type)
      .gte("transaction_date", startDateStr)
      .is("liability_id", null);

    if (error) throw error;

    const categoryMap = new Map<
      string,
      { name: string; color: string | null; total: number }
    >();

    for (const tx of data as unknown as Array<{
      category_id: string;
      amount: number;
      category: { name: string; color: string | null };
    }>) {
      const cat = tx.category;
      if (!cat) continue;
      const existing = categoryMap.get(tx.category_id);
      if (existing) {
        existing.total += Number(tx.amount);
      } else {
        categoryMap.set(tx.category_id, {
          name: cat.name,
          color: cat.color,
          total: Number(tx.amount),
        });
      }
    }

    return Array.from(categoryMap.entries())
      .map(([category_id, val]) => ({ category_id, ...val }))
      .sort((a, b) => b.total - a.total);
  }
}
