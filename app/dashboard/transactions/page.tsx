"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Receipt,
  Calendar,
  Check,
  X,
  Palette,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type {
  Account,
  Category,
  TransactionWithDetails,
  TransactionType,
  PaginatedResult,
  ApiResponse,
} from "@/types/database";

// ─── Helpers ────────────────────────────────────────────────

function formatRs(v: number) {
  return `Rs ${v.toLocaleString("en-PK")}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-PK", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type UITransactionType = "Income" | "Expense" | "Transfer";

const typeBadgeStyles: Record<UITransactionType, string> = {
  Income: "bg-vault-positive-light text-vault-positive",
  Expense: "bg-vault-negative-light text-vault-negative",
  Transfer: "bg-vault-info-light text-vault-info",
};

const typeIcons: Record<UITransactionType, typeof ArrowUpRight> = {
  Income: ArrowUpRight,
  Expense: ArrowDownRight,
  Transfer: ArrowLeftRight,
};

function toUIType(t: TransactionType): UITransactionType {
  if (t === "income") return "Income";
  if (t === "transfer") return "Transfer";
  return "Expense";
}

const categoryColors = [
  { name: "Blue", value: "#4A7FA5" },
  { name: "Green", value: "#2D7A5F" },
  { name: "Red", value: "#B54545" },
  { name: "Purple", value: "#9B8BAA" },
  { name: "Amber", value: "#C4875A" },
  { name: "Teal", value: "#3D9B8F" },
  { name: "Pink", value: "#C45B8A" },
  { name: "Slate", value: "#64748B" },
];

const ROWS_PER_PAGE = 8;

// ─── API Helpers ────────────────────────────────────────────

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json: ApiResponse<T> = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json: ApiResponse<T> = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

// ─── Empty State ────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 py-16">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
        <Receipt className="size-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">
        No Transactions Found
      </h3>
      <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
        Record your first income or expense to start tracking your money
        movements.
      </p>
      <Button size="lg" className="mt-6 rounded-xl" onClick={onAdd}>
        <Plus className="size-4" />
        Add Transaction
      </Button>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────

export default function TransactionsPage() {
  // ── Data state ──
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // ── KPI totals (fetched from server, not computed from paginated data) ──
  const [kpiTotals, setKpiTotals] = useState({ income: 0, expenses: 0, count: 0 });

  // ── Filter & view state ──
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionType>("all");
  const [accountFilter, setAccountFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateRange, setDateRange] = useState<"all" | "7d" | "30d" | "90d">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount_desc" | "amount_asc">("newest");
  const [currentPage, setCurrentPage] = useState(1);

  // ── Modal state ──
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalType, setModalType] = useState<TransactionType>("expense");
  const [formData, setFormData] = useState({
    amount: "",
    category_id: "",
    account_id: "",
    date: "",
    notes: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ── Transfer form state ──
  const [transferData, setTransferData] = useState({
    from_account_id: "",
    to_account_id: "",
    amount: "",
    date: "",
    notes: "",
  });

  // ── Inline "Add New Category" state ──
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState(categoryColors[0].value);
  const [newCategoryError, setNewCategoryError] = useState("");

  // ── Inline "Add New Account" state ──
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState<"bank" | "cash" | "wallet" | "savings">("bank");
  const [newAccountError, setNewAccountError] = useState("");

  // ── Load accounts & categories ──
  useEffect(() => {
    async function loadMetadata() {
      const [accs, cats] = await Promise.all([
        apiFetch<Account[]>("/api/accounts"),
        apiFetch<Category[]>("/api/categories"),
      ]);
      setAccounts(accs);
      setCategories(cats);
    }
    loadMetadata();
  }, []);

  // ── Load transactions (with server-side pagination & filters) ──
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("page_size", String(ROWS_PER_PAGE));
      params.set("sort", sortBy);
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (accountFilter && accountFilter !== "all_accounts") params.set("account_id", accountFilter);
      if (categoryFilter && categoryFilter !== "all_categories") params.set("category_id", categoryFilter);
      if (searchQuery) params.set("search", searchQuery);

      let cutoff: Date | null = null;
      if (dateRange !== "all") {
        const now = new Date();
        const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
        cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - days);
        params.set("from_date", cutoff.toISOString().split("T")[0]);
      }

      // Build totals params (same filters, no pagination)
      const totalsParams = new URLSearchParams();
      if (typeFilter !== "all") totalsParams.set("type", typeFilter);
      if (accountFilter && accountFilter !== "all_accounts") totalsParams.set("account_id", accountFilter);
      if (categoryFilter && categoryFilter !== "all_categories") totalsParams.set("category_id", categoryFilter);
      if (searchQuery) totalsParams.set("search", searchQuery);
      if (dateRange !== "all" && cutoff) {
        totalsParams.set("from_date", cutoff.toISOString().split("T")[0]);
      }

      const [result, totals] = await Promise.all([
        apiFetch<PaginatedResult<TransactionWithDetails>>(`/api/transactions?${params}`),
        apiFetch<{ income: number; expenses: number; count: number }>(`/api/transactions/totals?${totalsParams}`),
      ]);

      setTransactions(result.data);
      setTotalCount(result.total);
      setTotalPages(result.total_pages);
      setKpiTotals(totals);
    } finally {
      setLoading(false);
    }
  }, [currentPage, sortBy, typeFilter, accountFilter, categoryFilter, searchQuery, dateRange]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, accountFilter, categoryFilter, dateRange, sortBy]);

  // ── KPI values from server totals ──
  const monthlyIncome = kpiTotals.income;
  const monthlyExpenses = kpiTotals.expenses;
  const netCashFlow = kpiTotals.income - kpiTotals.expenses;

  // ── Derived categories based on selected modal type ──
  const modalCategories = categories.filter((c) => c.type === modalType);

  // ── Available categories for filter dropdown ──
  const filterCategories =
    typeFilter === "all"
      ? categories
      : typeFilter === "transfer"
        ? []
        : categories.filter((c) => c.type === typeFilter);

  // ── Form helpers ──
  function validateForm() {
    const errors: Record<string, string> = {};
    if (!formData.amount || parseFloat(formData.amount) <= 0)
      errors.amount = "Enter a valid amount";
    if (!formData.category_id) errors.category_id = "Select a category";
    if (!formData.account_id) errors.account_id = "Select an account";
    if (!formData.date) errors.date = "Select a date";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateTransferForm() {
    const errors: Record<string, string> = {};
    if (!transferData.amount || parseFloat(transferData.amount) <= 0)
      errors.amount = "Enter a valid amount";
    if (!transferData.from_account_id) errors.from_account_id = "Select source account";
    if (!transferData.to_account_id) errors.to_account_id = "Select destination account";
    if (transferData.from_account_id && transferData.from_account_id === transferData.to_account_id)
      errors.to_account_id = "Must be different from source";
    if (!transferData.date) errors.date = "Select a date";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleCreateTransaction() {
    if (!validateForm()) return;

    setSubmitLoading(true);
    setSubmitError("");

    try {
      await apiPost("/api/transactions", {
        account_id: formData.account_id,
        category_id: formData.category_id,
        type: modalType,
        amount: parseFloat(formData.amount),
        description: formData.notes,
        transaction_date: formData.date,
      });

      resetForm();
      setIsAddModalOpen(false);
      fetchTransactions();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create transaction");
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleCreateTransfer() {
    if (!validateTransferForm()) return;
    setSubmitLoading(true);
    setSubmitError("");
    try {
      await apiPost("/api/transactions", {
        type: "transfer",
        from_account_id: transferData.from_account_id,
        to_account_id: transferData.to_account_id,
        amount: parseFloat(transferData.amount),
        description: transferData.notes,
        transaction_date: transferData.date,
      });
      setTransferData({ from_account_id: "", to_account_id: "", amount: "", date: "", notes: "" });
      setIsAddModalOpen(false);
      fetchTransactions();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create transfer");
    } finally {
      setSubmitLoading(false);
    }
  }

  function resetForm() {
    setFormData({ amount: "", category_id: "", account_id: "", date: "", notes: "" });
    setTransferData({ from_account_id: "", to_account_id: "", amount: "", date: "", notes: "" });
    setFormErrors({});
    setSubmitError("");
  }

  function openModal(type: TransactionType = "expense") {
    setModalType(type);
    resetForm();
    setIsAddingCategory(false);
    setIsAddingAccount(false);
    setIsAddModalOpen(true);
  }

  // ── Inline category handlers ──
  function openAddCategory() {
    setNewCategoryName("");
    setNewCategoryColor(categoryColors[0].value);
    setNewCategoryError("");
    setIsAddingCategory(true);
  }

  async function handleSaveCategory() {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setNewCategoryError("Name is required");
      return;
    }

    try {
      const cat = await apiPost<Category>("/api/categories", {
        name: trimmed,
        type: modalType,
        color: newCategoryColor,
      });

      setCategories((prev) => [...prev, cat]);
      setFormData((prev) => ({ ...prev, category_id: cat.id }));
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next.category_id;
        return next;
      });
      setIsAddingCategory(false);
    } catch (err) {
      setNewCategoryError(err instanceof Error ? err.message : "Failed to create category");
    }
  }

  // ── Inline account handlers ──
  function openAddAccount() {
    setNewAccountName("");
    setNewAccountType("bank");
    setNewAccountError("");
    setIsAddingAccount(true);
  }

  async function handleSaveAccount() {
    const trimmed = newAccountName.trim();
    if (!trimmed) {
      setNewAccountError("Name is required");
      return;
    }

    try {
      const acc = await apiPost<Account>("/api/accounts", {
        name: trimmed,
        type: newAccountType,
      });

      setAccounts((prev) => [...prev, acc]);
      setFormData((prev) => ({ ...prev, account_id: acc.id }));
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next.account_id;
        return next;
      });
      setIsAddingAccount(false);
    } catch (err) {
      setNewAccountError(err instanceof Error ? err.message : "Failed to create account");
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      {/* ── 1. Page Header ── */}
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Transactions
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track and manage all money movements.
            </p>
          </div>
          <Button size="lg" className="rounded-xl" onClick={() => openModal("expense")}>
            <Plus className="size-4" />
            Add Transaction
          </Button>
        </div>
      </section>

      {/* ── 2. KPI Summary Cards ── */}
      <section>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Total Income
              </p>
              <div className="flex size-8 items-center justify-center rounded-lg bg-vault-positive-light">
                <ArrowUpRight className="size-4 text-vault-positive" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {formatRs(monthlyIncome)}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Total Expenses
              </p>
              <div className="flex size-8 items-center justify-center rounded-lg bg-vault-negative-light">
                <ArrowDownRight className="size-4 text-vault-negative" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {formatRs(monthlyExpenses)}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Net Cash Flow
              </p>
              <div className="flex size-8 items-center justify-center rounded-lg bg-vault-positive-light">
                <TrendingUp className="size-4 text-vault-positive" />
              </div>
            </div>
            <p className={cn(
              "mt-2 text-2xl font-semibold tabular-nums tracking-tight",
              netCashFlow >= 0 ? "text-vault-positive" : "text-vault-negative"
            )}>
              {formatRs(netCashFlow)}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Transactions
              </p>
              <div className="flex size-8 items-center justify-center rounded-lg bg-muted/60">
                <Receipt className="size-4 text-muted-foreground" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {totalCount}
            </p>
            <p className="mt-1.5 text-[11px] text-muted-foreground">Total results</p>
          </div>
        </div>
      </section>

      {/* ── 3. Filters Row ── */}
      <section>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
            <div className="relative max-w-xs flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v as "all" | TransactionType);
                setCategoryFilter("");
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>

            <Select value={accountFilter} onValueChange={(v) => setAccountFilter(v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_accounts">All Accounts</SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {typeFilter !== "transfer" && (
              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_categories">All Categories</SelectItem>
                  {filterCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select
              value={dateRange}
              onValueChange={(v) => setDateRange(v as "all" | "7d" | "30d" | "90d")}
            >
              <SelectTrigger className="w-[150px]">
                <Calendar className="size-3.5 text-muted-foreground" />
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sortBy}
              onValueChange={(v) =>
                setSortBy(v as "newest" | "oldest" | "amount_desc" | "amount_asc")
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="amount_desc">Highest Amount</SelectItem>
                <SelectItem value="amount_asc">Lowest Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(typeFilter !== "all" || accountFilter || categoryFilter || dateRange !== "all" || searchQuery) && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {totalCount} result{totalCount !== 1 ? "s" : ""}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground text-xs h-7"
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("all");
                  setAccountFilter("");
                  setCategoryFilter("");
                  setDateRange("all");
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ── 4. Transactions Table ── */}
      <section>
        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-border bg-card py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState onAdd={() => openModal("expense")} />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5 w-[120px]">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="pr-5 text-right w-[100px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => {
                  const uiType = toUIType(tx.type);
                  const Icon = typeIcons[uiType];
                  return (
                    <TableRow key={tx.id} className="transition-colors hover:bg-muted/30">
                      <TableCell className="pl-5 text-sm text-muted-foreground tabular-nums">
                        {formatDate(tx.transaction_date)}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex size-8 shrink-0 items-center justify-center rounded-lg",
                              tx.type === "income"
                                ? "bg-vault-positive-light text-vault-positive"
                                : tx.type === "transfer"
                                  ? "bg-vault-info-light text-vault-info"
                                  : "bg-vault-negative-light text-vault-negative"
                            )}
                          >
                            <Icon className="size-4" />
                          </div>
                          <p className="truncate text-sm font-medium text-foreground">
                            {tx.type === "transfer"
                              ? (tx.description || "Transfer")
                              : (tx.description || tx.category?.name)}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn("text-[10px] font-medium", typeBadgeStyles[uiType])}
                        >
                          {uiType}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {tx.type === "transfer" ? "Transfer" : tx.category?.name}
                      </TableCell>

                      <TableCell className="text-sm text-foreground">
                        {tx.type === "transfer"
                          ? `${tx.transfer_from_account?.name ?? "—"} → ${tx.transfer_to_account?.name ?? "—"}`
                          : tx.account?.name}
                      </TableCell>

                      <TableCell
                        className={cn(
                          "text-right text-sm font-semibold tabular-nums",
                          tx.type === "income"
                            ? "text-vault-positive"
                            : tx.type === "transfer"
                              ? "text-vault-info"
                              : "text-vault-negative"
                        )}
                      >
                        {tx.type === "income" ? "+" : tx.type === "expense" ? "-" : ""}
                        {formatRs(Number(tx.amount))}
                      </TableCell>

                      <TableCell className="pr-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon-xs">
                            <Eye className="size-3" />
                          </Button>
                          <Button variant="ghost" size="icon-xs">
                            <Pencil className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-vault-negative/70 hover:text-vault-negative"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <>
                <Separator />
                <div className="flex items-center justify-between px-5 py-3">
                  <p className="text-xs text-muted-foreground">
                    Showing{" "}
                    <span className="font-medium text-foreground">
                      {(currentPage - 1) * ROWS_PER_PAGE + 1}
                    </span>
                    –
                    <span className="font-medium text-foreground">
                      {Math.min(currentPage * ROWS_PER_PAGE, totalCount)}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-foreground">{totalCount}</span>
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon-xs" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                      <ChevronsLeft className="size-3" />
                    </Button>
                    <Button variant="outline" size="icon-xs" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                      <ChevronLeft className="size-3" />
                    </Button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const page = i + Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                      if (page > totalPages) return null;
                      return (
                        <Button
                          key={page}
                          variant={page === currentPage ? "secondary" : "ghost"}
                          size="icon-xs"
                          onClick={() => setCurrentPage(page)}
                          className="text-xs"
                        >
                          {page}
                        </Button>
                      );
                    })}
                    <Button variant="outline" size="icon-xs" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                      <ChevronRight className="size-3" />
                    </Button>
                    <Button variant="outline" size="icon-xs" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                      <ChevronsRight className="size-3" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </section>

      {/* ── 5. Add Transaction Modal ── */}
      <Dialog
        open={isAddModalOpen}
        onOpenChange={(open) => {
          setIsAddModalOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription>Record a new income, expense, or transfer.</DialogDescription>
          </DialogHeader>

          {/* Segmented Control */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
            {(["income", "expense", "transfer"] as TransactionType[]).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setModalType(type);
                  setFormData((prev) => ({ ...prev, category_id: "" }));
                  setFormErrors({});
                }}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all capitalize",
                  modalType === type
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {type}
              </button>
            ))}
          </div>

          {submitError && (
            <div className="rounded-lg border border-vault-negative/30 bg-vault-negative-light px-3 py-2 text-sm text-vault-negative">
              {submitError}
            </div>
          )}

          {modalType === "transfer" ? (
            /* ── Transfer Form ── */
            <div className="space-y-4 py-1">
              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="tx-transfer-amount">Amount</Label>
                <Input
                  id="tx-transfer-amount"
                  type="number"
                  placeholder="0"
                  value={transferData.amount}
                  onChange={(e) => setTransferData((prev) => ({ ...prev, amount: e.target.value }))}
                  className={cn(formErrors.amount && "border-vault-negative")}
                />
                {formErrors.amount && (
                  <p className="text-[11px] text-vault-negative">{formErrors.amount}</p>
                )}
              </div>

              {/* From Account */}
              <div className="space-y-2">
                <Label>From Account</Label>
                <Select
                  value={transferData.from_account_id}
                  onValueChange={(v) => setTransferData((prev) => ({ ...prev, from_account_id: v }))}
                >
                  <SelectTrigger
                    className={cn("w-full", formErrors.from_account_id && "border-vault-negative")}
                  >
                    <SelectValue placeholder="Select source account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.from_account_id && (
                  <p className="text-[11px] text-vault-negative">{formErrors.from_account_id}</p>
                )}
              </div>

              {/* To Account */}
              <div className="space-y-2">
                <Label>To Account</Label>
                <Select
                  value={transferData.to_account_id}
                  onValueChange={(v) => setTransferData((prev) => ({ ...prev, to_account_id: v }))}
                >
                  <SelectTrigger
                    className={cn("w-full", formErrors.to_account_id && "border-vault-negative")}
                  >
                    <SelectValue placeholder="Select destination account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.to_account_id && (
                  <p className="text-[11px] text-vault-negative">{formErrors.to_account_id}</p>
                )}
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="tx-transfer-date">Date</Label>
                <Input
                  id="tx-transfer-date"
                  type="date"
                  value={transferData.date}
                  onChange={(e) => setTransferData((prev) => ({ ...prev, date: e.target.value }))}
                  className={cn(formErrors.date && "border-vault-negative")}
                />
                {formErrors.date && (
                  <p className="text-[11px] text-vault-negative">{formErrors.date}</p>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="tx-transfer-notes">
                  Notes{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="tx-transfer-notes"
                  placeholder="Add a note..."
                  value={transferData.notes}
                  onChange={(e) => setTransferData((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>
          ) : (
            /* ── Income / Expense Form ── */
            <div className="space-y-4 py-1">
              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="tx-amount">Amount</Label>
                <Input
                  id="tx-amount"
                  type="number"
                  placeholder="0"
                  value={formData.amount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                  className={cn(formErrors.amount && "border-vault-negative")}
                />
                {formErrors.amount && (
                  <p className="text-[11px] text-vault-negative">{formErrors.amount}</p>
                )}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>Category</Label>
                {!isAddingCategory ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Select
                        value={formData.category_id}
                        onValueChange={(v) => setFormData((prev) => ({ ...prev, category_id: v }))}
                      >
                        <SelectTrigger
                          className={cn("w-full", formErrors.category_id && "border-vault-negative")}
                        >
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {modalCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-primary text-xs h-8"
                        onClick={openAddCategory}
                      >
                        <Plus className="size-3" />
                        Add New
                      </Button>
                    </div>
                    {formErrors.category_id && (
                      <p className="text-[11px] text-vault-negative">{formErrors.category_id}</p>
                    )}
                  </>
                ) : (
                  <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      New Category
                    </p>
                    <div className="space-y-1.5">
                      <Input
                        placeholder="Category name"
                        value={newCategoryName}
                        onChange={(e) => { setNewCategoryName(e.target.value); setNewCategoryError(""); }}
                        className={cn("h-8 text-sm", newCategoryError && "border-vault-negative")}
                        autoFocus
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSaveCategory(); } }}
                      />
                      {newCategoryError && (
                        <p className="text-[10px] text-vault-negative">{newCategoryError}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Palette className="size-3" />
                          Color <span className="font-normal">(optional)</span>
                        </div>
                      </Label>
                      <div className="flex items-center gap-1.5">
                        {categoryColors.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => setNewCategoryColor(color.value)}
                            className={cn(
                              "size-6 rounded-full border-2 transition-all",
                              newCategoryColor === color.value
                                ? "border-foreground scale-110"
                                : "border-transparent hover:border-border"
                            )}
                            style={{ backgroundColor: color.value }}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <Button type="button" variant="ghost" size="sm" className="text-xs h-7" onClick={() => setIsAddingCategory(false)}>
                        <X className="size-3" /> Cancel
                      </Button>
                      <Button type="button" size="sm" className="text-xs h-7" onClick={handleSaveCategory}>
                        <Check className="size-3" /> Save
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Account */}
              <div className="space-y-2">
                <Label>Account</Label>
                {!isAddingAccount ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Select
                        value={formData.account_id}
                        onValueChange={(v) => setFormData((prev) => ({ ...prev, account_id: v }))}
                      >
                        <SelectTrigger
                          className={cn("w-full", formErrors.account_id && "border-vault-negative")}
                        >
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-primary text-xs h-8"
                        onClick={openAddAccount}
                      >
                        <Plus className="size-3" />
                        Add New
                      </Button>
                    </div>
                    {formErrors.account_id && (
                      <p className="text-[11px] text-vault-negative">{formErrors.account_id}</p>
                    )}
                  </>
                ) : (
                  <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      New Account
                    </p>
                    <div className="space-y-1.5">
                      <Input
                        placeholder="Account name"
                        value={newAccountName}
                        onChange={(e) => { setNewAccountName(e.target.value); setNewAccountError(""); }}
                        className={cn("h-8 text-sm", newAccountError && "border-vault-negative")}
                        autoFocus
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSaveAccount(); } }}
                      />
                      {newAccountError && (
                        <p className="text-[10px] text-vault-negative">{newAccountError}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">Type</Label>
                      <Select value={newAccountType} onValueChange={(v) => setNewAccountType(v as typeof newAccountType)}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bank">Bank</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="wallet">Wallet</SelectItem>
                          <SelectItem value="savings">Savings</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <Button type="button" variant="ghost" size="sm" className="text-xs h-7" onClick={() => setIsAddingAccount(false)}>
                        <X className="size-3" /> Cancel
                      </Button>
                      <Button type="button" size="sm" className="text-xs h-7" onClick={handleSaveAccount}>
                        <Check className="size-3" /> Save
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="tx-date">Date</Label>
                <Input
                  id="tx-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                  className={cn(formErrors.date && "border-vault-negative")}
                />
                {formErrors.date && (
                  <p className="text-[11px] text-vault-negative">{formErrors.date}</p>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="tx-notes">
                  Notes{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="tx-notes"
                  placeholder="Add a note..."
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={modalType === "transfer" ? handleCreateTransfer : handleCreateTransaction}
              disabled={submitLoading}
            >
              {submitLoading && <Loader2 className="size-4 animate-spin" />}
              Add {modalType === "income" ? "Income" : modalType === "transfer" ? "Transfer" : "Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
