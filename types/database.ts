// ─── Database Enum Types ─────────────────────────────────────

export type AccountType = "cash" | "bank" | "wallet" | "savings";
export type CategoryType = "income" | "expense";
export type TransactionType = "income" | "expense" | "transfer";
export type LiabilityType =
  | "bank_loan"
  | "credit_card"
  | "personal_loan"
  | "other";
export type LiabilityStatus = "active" | "closed";
export type PaymentFrequency =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "custom";

// ─── Database Row Types ──────────────────────────────────────

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  opening_balance: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  color: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  type: TransactionType;
  amount: number;
  description: string;
  transaction_date: string;
  liability_id: string | null;
  transfer_from_account_id: string | null;
  transfer_to_account_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Liability {
  id: string;
  user_id: string;
  name: string;
  type: LiabilityType;
  original_amount: number;
  interest_rate: number;
  emi_amount: number;
  frequency: PaymentFrequency;
  start_date: string;
  next_due_date: string | null;
  expected_end_date: string | null;
  linked_account_id: string;
  deposited_to_account: boolean;
  status: LiabilityStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LiabilityPayment {
  id: string;
  user_id: string;
  liability_id: string;
  transaction_id: string;
  principal_amount: number;
  interest_amount: number;
  payment_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Computed / Joined Types ─────────────────────────────────

export interface AccountWithBalance {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  created_at: string;
}

export interface TransactionWithDetails extends Transaction {
  account: Pick<Account, "name" | "type">;
  category: Pick<Category, "name" | "color"> | null;
  transfer_from_account?: Pick<Account, "name" | "type"> | null;
  transfer_to_account?: Pick<Account, "name" | "type"> | null;
}

export interface LiabilitySummary extends Omit<Liability, "user_id"> {
  remaining_balance: number;
}

// ─── API Response Types ──────────────────────────────────────

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ─── Input Types ─────────────────────────────────────────────

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  opening_balance?: number;
}

export interface CreateTransactionInput {
  account_id: string;
  category_id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  transaction_date: string;
}

export interface CreateTransferInput {
  from_account_id: string;
  to_account_id: string;
  amount: number;
  description: string;
  transaction_date: string;
}

export interface TransactionFilters {
  page: number;
  page_size: number;
  type: "income" | "expense" | "transfer" | "all";
  account_id?: string;
  category_id?: string;
  sort: "newest" | "oldest" | "amount_desc" | "amount_asc";
  search?: string;
  from_date?: string;
  to_date?: string;
}

export interface CreateCategoryInput {
  name: string;
  type: CategoryType;
  color?: string;
}

// ─── Liability Input Types ───────────────────────────────────

export interface CreateLiabilityInput {
  name: string;
  type: LiabilityType;
  original_amount: number;
  interest_rate: number;
  emi_amount: number;
  frequency: PaymentFrequency;
  start_date: string;
  next_due_date: string | null;
  expected_end_date: string | null;
  linked_account_id: string;
  deposited_to_account: boolean;
  deposit_category_id?: string | null;
  notes?: string | null;
}

export interface CreateLiabilityPaymentInput {
  liability_id: string;
  account_id: string;
  category_id: string;
  principal_amount: number;
  interest_amount: number;
  payment_date: string;
  description?: string;
  notes?: string | null;
}

// ─── Liability Payment Display Type ─────────────────────────

export interface LiabilityPaymentDisplay {
  id: string;
  transaction_id: string;
  principal_amount: number;
  interest_amount: number;
  payment_date: string;
  notes: string | null;
  transaction: {
    amount: number;
    description: string;
    account: {
      name: string;
    };
  };
}

// ─── Dashboard Aggregation Types ─────────────────────────────

export interface MonthlyTotal {
  month: string;
  income: number;
  expenses: number;
}

export interface CategoryBreakdown {
  category_id: string;
  name: string;
  color: string | null;
  total: number;
}
