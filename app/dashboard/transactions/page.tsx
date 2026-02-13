"use client";

import { useState, useMemo } from "react";
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

// ─── Types ──────────────────────────────────────────────────

type TransactionType = "Income" | "Expense" | "Transfer";

interface Transaction {
  id: string;
  date: string;
  description: string;
  type: TransactionType;
  category: string;
  account: string;
  toAccount?: string;
  amount: number;
}

// ─── Mock Data ──────────────────────────────────────────────

const accountsList = ["Meezan Bank", "HBL", "JazzCash", "Cash"];

const incomeCategories = [
  "Salary",
  "Freelance",
  "Business",
  "Investments",
  "Rental",
  "Other Income",
];

const expenseCategories = [
  "Housing",
  "Utilities",
  "Groceries",
  "Transport",
  "Shopping",
  "Food & Dining",
  "Healthcare",
  "Education",
  "Entertainment",
  "Insurance",
  "Subscriptions",
  "Other",
];

const transactions: Transaction[] = [
  {
    id: "1",
    date: "2026-02-12",
    description: "Salary Credit",
    type: "Income",
    category: "Salary",
    account: "Meezan Bank",
    amount: 185000,
  },
  {
    id: "2",
    date: "2026-02-12",
    description: "Freelance — Logo Design",
    type: "Income",
    category: "Freelance",
    account: "Meezan Bank",
    amount: 45000,
  },
  {
    id: "3",
    date: "2026-02-11",
    description: "Rent Payment",
    type: "Expense",
    category: "Housing",
    account: "HBL",
    amount: 25000,
  },
  {
    id: "4",
    date: "2026-02-10",
    description: "K-Electric Bill",
    type: "Expense",
    category: "Utilities",
    account: "HBL",
    amount: 6500,
  },
  {
    id: "5",
    date: "2026-02-10",
    description: "SSGC Gas Bill",
    type: "Expense",
    category: "Utilities",
    account: "HBL",
    amount: 2800,
  },
  {
    id: "6",
    date: "2026-02-09",
    description: "Transfer to JazzCash",
    type: "Transfer",
    category: "Transfer",
    account: "Meezan Bank",
    toAccount: "JazzCash",
    amount: 15000,
  },
  {
    id: "7",
    date: "2026-02-09",
    description: "Daraz Purchase",
    type: "Expense",
    category: "Shopping",
    account: "HBL",
    amount: 4800,
  },
  {
    id: "8",
    date: "2026-02-08",
    description: "Grocery — Imtiaz Super",
    type: "Expense",
    category: "Groceries",
    account: "Cash",
    amount: 8500,
  },
  {
    id: "9",
    date: "2026-02-07",
    description: "Careem Ride",
    type: "Expense",
    category: "Transport",
    account: "JazzCash",
    amount: 650,
  },
  {
    id: "10",
    date: "2026-02-07",
    description: "Netflix Subscription",
    type: "Expense",
    category: "Subscriptions",
    account: "HBL",
    amount: 1500,
  },
  {
    id: "11",
    date: "2026-02-06",
    description: "Rental Income — DHA Flat",
    type: "Income",
    category: "Rental",
    account: "Meezan Bank",
    amount: 35000,
  },
  {
    id: "12",
    date: "2026-02-05",
    description: "Fuel — Shell Station",
    type: "Expense",
    category: "Transport",
    account: "Cash",
    amount: 5000,
  },
  {
    id: "13",
    date: "2026-02-04",
    description: "Doctor Visit",
    type: "Expense",
    category: "Healthcare",
    account: "Cash",
    amount: 3000,
  },
  {
    id: "14",
    date: "2026-02-03",
    description: "Transfer to Cash",
    type: "Transfer",
    category: "Transfer",
    account: "HBL",
    toAccount: "Cash",
    amount: 10000,
  },
  {
    id: "15",
    date: "2026-02-02",
    description: "Spotify Annual Plan",
    type: "Expense",
    category: "Subscriptions",
    account: "HBL",
    amount: 2400,
  },
  {
    id: "16",
    date: "2026-02-01",
    description: "Life Insurance Premium",
    type: "Expense",
    category: "Insurance",
    account: "Meezan Bank",
    amount: 12000,
  },
  {
    id: "17",
    date: "2026-02-01",
    description: "Dinner — Kolachi Restaurant",
    type: "Expense",
    category: "Food & Dining",
    account: "HBL",
    amount: 4200,
  },
  {
    id: "18",
    date: "2026-01-31",
    description: "YouTube Premium",
    type: "Expense",
    category: "Subscriptions",
    account: "HBL",
    amount: 900,
  },
];

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

const typeBadgeStyles: Record<TransactionType, string> = {
  Income: "bg-vault-positive-light text-vault-positive",
  Expense: "bg-vault-negative-light text-vault-negative",
  Transfer: "bg-vault-info-light text-vault-info",
};

const typeIcons: Record<TransactionType, typeof ArrowUpRight> = {
  Income: ArrowUpRight,
  Expense: ArrowDownRight,
  Transfer: ArrowLeftRight,
};

const ROWS_PER_PAGE = 8;

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
        Record your first income, expense, or transfer to start tracking your
        money movements.
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
  // ── Filter & view state ──
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | TransactionType>("All");
  const [accountFilter, setAccountFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [dateRange, setDateRange] = useState<"all" | "7d" | "30d" | "90d">(
    "all"
  );
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "amount-desc" | "amount-asc"
  >("newest");
  const [currentPage, setCurrentPage] = useState(1);

  // ── Modal state ──
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalType, setModalType] = useState<TransactionType>("Expense");
  const [formData, setFormData] = useState({
    amount: "",
    category: "",
    account: "",
    toAccount: "",
    date: "",
    notes: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ── Derived categories based on selected filter ──
  const availableCategories = useMemo(() => {
    if (typeFilter === "Income") return incomeCategories;
    if (typeFilter === "Expense") return expenseCategories;
    return [...new Set(transactions.map((t) => t.category))].sort();
  }, [typeFilter]);

  // ── Filtered & sorted data ──
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      );
    }

    if (typeFilter !== "All") {
      result = result.filter((t) => t.type === typeFilter);
    }

    if (accountFilter !== "All") {
      result = result.filter(
        (t) => t.account === accountFilter || t.toAccount === accountFilter
      );
    }

    if (categoryFilter !== "All") {
      result = result.filter((t) => t.category === categoryFilter);
    }

    if (dateRange !== "all") {
      const now = new Date("2026-02-13");
      const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - days);
      result = result.filter((t) => new Date(t.date) >= cutoff);
    }

    switch (sortBy) {
      case "newest":
        result.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        break;
      case "oldest":
        result.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        break;
      case "amount-desc":
        result.sort((a, b) => b.amount - a.amount);
        break;
      case "amount-asc":
        result.sort((a, b) => a.amount - b.amount);
        break;
    }

    return result;
  }, [searchQuery, typeFilter, accountFilter, categoryFilter, dateRange, sortBy]);

  // ── KPI calculations (current month, all data) ──
  const monthlyIncome = transactions
    .filter((t) => t.type === "Income")
    .reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpenses = transactions
    .filter((t) => t.type === "Expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const netCashFlow = monthlyIncome - monthlyExpenses;
  const totalCount = transactions.length;

  // ── Pagination ──
  const totalPages = Math.ceil(filteredTransactions.length / ROWS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, accountFilter, categoryFilter, dateRange, sortBy]);

  // ── Form helpers ──
  function validateForm() {
    const errors: Record<string, string> = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      errors.amount = "Enter a valid amount";
    }

    if (modalType !== "Transfer" && !formData.category) {
      errors.category = "Select a category";
    }

    if (!formData.account) {
      errors.account = "Select an account";
    }

    if (modalType === "Transfer") {
      if (!formData.toAccount) {
        errors.toAccount = "Select destination account";
      } else if (formData.toAccount === formData.account) {
        errors.toAccount = "Cannot transfer to same account";
      }
    }

    if (!formData.date) {
      errors.date = "Select a date";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleCreateTransaction() {
    if (!validateForm()) return;
    resetForm();
    setIsAddModalOpen(false);
  }

  function resetForm() {
    setFormData({
      amount: "",
      category: "",
      account: "",
      toAccount: "",
      date: "",
      notes: "",
    });
    setFormErrors({});
  }

  function openModal(type: TransactionType = "Expense") {
    setModalType(type);
    resetForm();
    setIsAddModalOpen(true);
  }

  // ── Categories for the modal based on selected type ──
  const modalCategories =
    modalType === "Income" ? incomeCategories : expenseCategories;

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
          <Button
            size="lg"
            className="rounded-xl"
            onClick={() => openModal("Expense")}
          >
            <Plus className="size-4" />
            Add Transaction
          </Button>
        </div>
      </section>

      {/* ── 2. KPI Summary Cards ── */}
      <section>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {/* Total Income */}
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
            <div className="mt-1.5 flex items-center gap-1">
              <TrendingUp className="size-3 text-vault-positive" />
              <span className="text-[11px] font-medium tabular-nums text-vault-positive">
                +12.4%
              </span>
              <span className="text-[11px] text-muted-foreground">
                vs last month
              </span>
            </div>
          </div>

          {/* Total Expenses */}
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
            <div className="mt-1.5 flex items-center gap-1">
              <TrendingDown className="size-3 text-vault-negative" />
              <span className="text-[11px] font-medium tabular-nums text-vault-negative">
                -3.1%
              </span>
              <span className="text-[11px] text-muted-foreground">
                vs last month
              </span>
            </div>
          </div>

          {/* Net Cash Flow */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Net Cash Flow
              </p>
              <div className="flex size-8 items-center justify-center rounded-lg bg-vault-positive-light">
                <TrendingUp className="size-4 text-vault-positive" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-vault-positive">
              {formatRs(netCashFlow)}
            </p>
            <div className="mt-1.5 flex items-center gap-1">
              <TrendingUp className="size-3 text-vault-positive" />
              <span className="text-[11px] font-medium tabular-nums text-vault-positive">
                +18.7%
              </span>
              <span className="text-[11px] text-muted-foreground">
                vs last month
              </span>
            </div>
          </div>

          {/* Total Transactions */}
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
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              This month
            </p>
          </div>
        </div>
      </section>

      {/* ── 3. Filters Row ── */}
      <section>
        <div className="flex flex-col gap-3">
          {/* Row 1: Search + dropdowns */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
            {/* Search */}
            <div className="relative max-w-xs flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Type */}
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v as "All" | TransactionType);
                setCategoryFilter("All");
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Types</SelectItem>
                <SelectItem value="Income">Income</SelectItem>
                <SelectItem value="Expense">Expense</SelectItem>
                <SelectItem value="Transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>

            {/* Account */}
            <Select
              value={accountFilter}
              onValueChange={(v) => setAccountFilter(v)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Accounts</SelectItem>
                {accountsList.map((acc) => (
                  <SelectItem key={acc} value={acc}>
                    {acc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category */}
            <Select
              value={categoryFilter}
              onValueChange={(v) => setCategoryFilter(v)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                {availableCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range */}
            <Select
              value={dateRange}
              onValueChange={(v) =>
                setDateRange(v as "all" | "7d" | "30d" | "90d")
              }
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

            {/* Sort */}
            <Select
              value={sortBy}
              onValueChange={(v) =>
                setSortBy(
                  v as "newest" | "oldest" | "amount-desc" | "amount-asc"
                )
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="amount-desc">Highest Amount</SelectItem>
                <SelectItem value="amount-asc">Lowest Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active filters count */}
          {(typeFilter !== "All" ||
            accountFilter !== "All" ||
            categoryFilter !== "All" ||
            dateRange !== "all" ||
            searchQuery) && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {filteredTransactions.length} result
                {filteredTransactions.length !== 1 ? "s" : ""}
              </span>
              <Button
                variant="ghost"
                size="xs"
                className="text-muted-foreground"
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("All");
                  setAccountFilter("All");
                  setCategoryFilter("All");
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
        {filteredTransactions.length === 0 ? (
          <EmptyState onAdd={() => openModal("Expense")} />
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
                {paginatedTransactions.map((tx) => {
                  const Icon = typeIcons[tx.type];
                  return (
                    <TableRow
                      key={tx.id}
                      className="transition-colors hover:bg-muted/30"
                    >
                      {/* Date */}
                      <TableCell className="pl-5 text-sm text-muted-foreground tabular-nums">
                        {formatDate(tx.date)}
                      </TableCell>

                      {/* Description */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex size-8 shrink-0 items-center justify-center rounded-lg",
                              tx.type === "Income" &&
                                "bg-vault-positive-light text-vault-positive",
                              tx.type === "Expense" &&
                                "bg-vault-negative-light text-vault-negative",
                              tx.type === "Transfer" &&
                                "bg-vault-info-light text-vault-info"
                            )}
                          >
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {tx.description}
                            </p>
                            {tx.type === "Transfer" && tx.toAccount && (
                              <p className="text-[11px] text-muted-foreground">
                                {tx.account} → {tx.toAccount}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Type Badge */}
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] font-medium",
                            typeBadgeStyles[tx.type]
                          )}
                        >
                          {tx.type}
                        </Badge>
                      </TableCell>

                      {/* Category */}
                      <TableCell className="text-sm text-muted-foreground">
                        {tx.category}
                      </TableCell>

                      {/* Account */}
                      <TableCell className="text-sm text-foreground">
                        {tx.account}
                      </TableCell>

                      {/* Amount */}
                      <TableCell
                        className={cn(
                          "text-right text-sm font-semibold tabular-nums",
                          tx.type === "Income" && "text-vault-positive",
                          tx.type === "Expense" && "text-vault-negative",
                          tx.type === "Transfer" && "text-foreground"
                        )}
                      >
                        {tx.type === "Income"
                          ? "+"
                          : tx.type === "Expense"
                            ? "-"
                            : ""}
                        {formatRs(tx.amount)}
                      </TableCell>

                      {/* Actions */}
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
                      {Math.min(
                        currentPage * ROWS_PER_PAGE,
                        filteredTransactions.length
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-foreground">
                      {filteredTransactions.length}
                    </span>
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon-xs"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft className="size-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-xs"
                      onClick={() =>
                        setCurrentPage((p) => Math.max(1, p - 1))
                      }
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="size-3" />
                    </Button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <Button
                          key={page}
                          variant={
                            page === currentPage ? "secondary" : "ghost"
                          }
                          size="icon-xs"
                          onClick={() => setCurrentPage(page)}
                          className="text-xs"
                        >
                          {page}
                        </Button>
                      )
                    )}

                    <Button
                      variant="outline"
                      size="icon-xs"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="size-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-xs"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
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
            <DialogDescription>
              Record a new income, expense, or transfer.
            </DialogDescription>
          </DialogHeader>

          {/* Segmented Control */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
            {(["Income", "Expense", "Transfer"] as TransactionType[]).map(
              (type) => (
                <button
                  key={type}
                  onClick={() => {
                    setModalType(type);
                    setFormData((prev) => ({
                      ...prev,
                      category: "",
                      toAccount: "",
                    }));
                    setFormErrors({});
                  }}
                  className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                    modalType === type
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {type}
                </button>
              )
            )}
          </div>

          <div className="space-y-4 py-1">
            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="tx-amount">Amount</Label>
              <Input
                id="tx-amount"
                type="number"
                placeholder="0"
                value={formData.amount}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, amount: e.target.value }))
                }
                className={cn(formErrors.amount && "border-vault-negative")}
              />
              {formErrors.amount && (
                <p className="text-[11px] text-vault-negative">
                  {formErrors.amount}
                </p>
              )}
            </div>

            {/* Category — shown for Income & Expense */}
            {modalType !== "Transfer" && (
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, category: v }))
                  }
                >
                  <SelectTrigger
                    className={cn(
                      "w-full",
                      formErrors.category && "border-vault-negative"
                    )}
                  >
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {modalCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.category && (
                  <p className="text-[11px] text-vault-negative">
                    {formErrors.category}
                  </p>
                )}
              </div>
            )}

            {/* Account (From Account for Transfer) */}
            <div className="space-y-2">
              <Label>
                {modalType === "Transfer" ? "From Account" : "Account"}
              </Label>
              <Select
                value={formData.account}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, account: v }))
                }
              >
                <SelectTrigger
                  className={cn(
                    "w-full",
                    formErrors.account && "border-vault-negative"
                  )}
                >
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accountsList.map((acc) => (
                    <SelectItem key={acc} value={acc}>
                      {acc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.account && (
                <p className="text-[11px] text-vault-negative">
                  {formErrors.account}
                </p>
              )}
            </div>

            {/* To Account — Transfer only */}
            {modalType === "Transfer" && (
              <div className="space-y-2">
                <Label>To Account</Label>
                <Select
                  value={formData.toAccount}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, toAccount: v }))
                  }
                >
                  <SelectTrigger
                    className={cn(
                      "w-full",
                      formErrors.toAccount && "border-vault-negative"
                    )}
                  >
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountsList
                      .filter((acc) => acc !== formData.account)
                      .map((acc) => (
                        <SelectItem key={acc} value={acc}>
                          {acc}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {formErrors.toAccount && (
                  <p className="text-[11px] text-vault-negative">
                    {formErrors.toAccount}
                  </p>
                )}
              </div>
            )}

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="tx-date">Date</Label>
              <Input
                id="tx-date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, date: e.target.value }))
                }
                className={cn(formErrors.date && "border-vault-negative")}
              />
              {formErrors.date && (
                <p className="text-[11px] text-vault-negative">
                  {formErrors.date}
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="tx-notes">
                Notes{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="tx-notes"
                placeholder="Add a note..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateTransaction}>
              Add {modalType}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
