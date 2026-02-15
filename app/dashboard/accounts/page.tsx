"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Building2,
  Landmark,
  Smartphone,
  Banknote,
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Pencil,
  Trash2,
  LayoutGrid,
  List,
  Wallet,
  Loader2,
  Check,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
} from "recharts";

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
import { cn } from "@/lib/utils";
import type {
  AccountWithBalance,
  AccountType,
  ApiResponse,
} from "@/types/database";

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

// ─── Helpers ────────────────────────────────────────────────

function formatRs(v: number) {
  return `Rs ${v.toLocaleString("en-PK")}`;
}

type DisplayAccountType = "Bank" | "Wallet" | "Cash" | "Savings";

const typeLabels: Record<AccountType, DisplayAccountType> = {
  bank: "Bank",
  wallet: "Wallet",
  cash: "Cash",
  savings: "Savings",
};

const typeIcons: Record<AccountType, LucideIcon> = {
  bank: Building2,
  wallet: Smartphone,
  cash: Banknote,
  savings: Landmark,
};

const typeBadgeStyles: Record<AccountType, string> = {
  bank: "bg-vault-info-light text-vault-info",
  wallet: "bg-[rgba(155,139,170,0.15)] text-vault-chart-5",
  cash: "bg-vault-warning-light text-vault-warning",
  savings: "bg-vault-positive-light text-vault-positive",
};

const chartColors = [
  "var(--vault-chart-1)",
  "var(--vault-chart-2)",
  "var(--vault-chart-3)",
  "var(--vault-chart-6)",
  "var(--vault-chart-4)",
  "var(--vault-chart-5)",
];

// ─── Chart Tooltip ──────────────────────────────────────────

function ChartTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
      {label && (
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
          {label}
        </p>
      )}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground capitalize">{entry.name}:</span>
          <span className="font-semibold tabular-nums text-foreground">
            {formatRs(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 py-16">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
        <Wallet className="size-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">
        No Accounts Added Yet
      </h3>
      <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
        Add your first bank, wallet, or cash account to start tracking your
        finances.
      </p>
      <Button size="lg" className="mt-6 rounded-xl" onClick={onAdd}>
        <Plus className="size-4" />
        Add Account
      </Button>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────

export default function AccountsPage() {
  // ── Data state ──
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // ── Filter state ──
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | AccountType>("all");
  const [sortBy, setSortBy] = useState<
    "balance-desc" | "balance-asc" | "recent" | "name"
  >("balance-desc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // ── Modal state ──
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: "",
    type: "bank" as AccountType,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ── Data fetching ──
  const fetchAccounts = useCallback(async () => {
    try {
      const data = await apiFetch<AccountWithBalance[]>("/api/accounts");
      setAccounts(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // ── Filtered & sorted ──
  const filteredAccounts = useMemo(() => {
    let result = [...accounts];

    if (searchQuery) {
      result = result.filter((a) =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (typeFilter !== "all") {
      result = result.filter((a) => a.type === typeFilter);
    }

    switch (sortBy) {
      case "balance-desc":
        result.sort((a, b) => b.balance - a.balance);
        break;
      case "balance-asc":
        result.sort((a, b) => a.balance - b.balance);
        break;
      case "recent":
        result.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  }, [accounts, searchQuery, typeFilter, sortBy]);

  // ── KPIs ──
  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
  const highestAccount =
    accounts.length > 0
      ? accounts.reduce((max, a) =>
          Number(a.balance) > Number(max.balance) ? a : max
        )
      : null;
  const lowestAccount =
    accounts.length > 0
      ? accounts.reduce((min, a) =>
          Number(a.balance) < Number(min.balance) ? a : min
        )
      : null;

  // ── Form handlers ──
  function validateForm() {
    const errors: Record<string, string> = {};
    if (!newAccount.name.trim()) errors.name = "Account name is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleCreateAccount() {
    if (!validateForm()) return;

    setSubmitLoading(true);
    setSubmitError("");

    try {
      await apiPost("/api/accounts", {
        name: newAccount.name.trim(),
        type: newAccount.type,
      });

      setNewAccount({ name: "", type: "bank" });
      setFormErrors({});
      setIsAddModalOpen(false);
      fetchAccounts();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to create account"
      );
    } finally {
      setSubmitLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      {/* ── 1. Page Header ── */}
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Accounts
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your banks, wallets, and cash balances.
            </p>
          </div>
          <Button
            size="lg"
            className="rounded-xl"
            onClick={() => {
              setNewAccount({ name: "", type: "bank" });
              setFormErrors({});
              setSubmitError("");
              setIsAddModalOpen(true);
            }}
          >
            <Plus className="size-4" />
            Add Account
          </Button>
        </div>
      </section>

      {/* ── 2. KPI Summary Cards ── */}
      <section>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {/* Total Balance */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Total Balance
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {formatRs(totalBalance)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Across {accounts.length} account{accounts.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Highest Balance */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Highest Balance
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {highestAccount ? formatRs(Number(highestAccount.balance)) : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {highestAccount?.name ?? "No accounts"}
            </p>
          </div>

          {/* Lowest Balance */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Lowest Balance
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {lowestAccount ? formatRs(Number(lowestAccount.balance)) : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {lowestAccount?.name ?? "No accounts"}
            </p>
          </div>

          {/* Account Count */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Total Accounts
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {accounts.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {accounts.filter((a) => a.type === "bank").length} bank,{" "}
              {accounts.filter((a) => a.type !== "bank").length} other
            </p>
          </div>
        </div>
      </section>

      {/* ── 3. Filters Row ── */}
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative max-w-xs flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by account name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Type Filter */}
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as "all" | AccountType)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="wallet">Wallet</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="savings">Savings</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select
              value={sortBy}
              onValueChange={(v) =>
                setSortBy(
                  v as "balance-desc" | "balance-asc" | "recent" | "name"
                )
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="balance-desc">Balance: High to Low</SelectItem>
                <SelectItem value="balance-asc">Balance: Low to High</SelectItem>
                <SelectItem value="recent">Recently Added</SelectItem>
                <SelectItem value="name">Name: A to Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon-xs"
              onClick={() => setViewMode("grid")}
              className="rounded-md"
            >
              <LayoutGrid className="size-3.5" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon-xs"
              onClick={() => setViewMode("list")}
              className="rounded-md"
            >
              <List className="size-3.5" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── 4. Accounts Grid / Table ── */}
      <section>
        {filteredAccounts.length === 0 ? (
          <EmptyState
            onAdd={() => {
              setNewAccount({ name: "", type: "bank" });
              setFormErrors({});
              setSubmitError("");
              setIsAddModalOpen(true);
            }}
          />
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredAccounts.map((account) => {
              const Icon = typeIcons[account.type];
              return (
                <div
                  key={account.id}
                  className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* Top: icon + badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
                      <Icon className="size-[18px]" />
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px] font-medium",
                        typeBadgeStyles[account.type]
                      )}
                    >
                      {typeLabels[account.type]}
                    </Badge>
                  </div>

                  {/* Name */}
                  <h3 className="mt-4 text-sm font-medium text-foreground">
                    {account.name}
                  </h3>

                  {/* Balance */}
                  <p
                    className={cn(
                      "mt-1 text-2xl font-semibold tabular-nums tracking-tight",
                      Number(account.balance) >= 0
                        ? "text-foreground"
                        : "text-vault-negative"
                    )}
                  >
                    {formatRs(Number(account.balance))}
                  </p>

                  {/* Actions */}
                  <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-muted-foreground"
                    >
                      <Eye className="size-3" />
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-muted-foreground"
                    >
                      <Pencil className="size-3" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="ml-auto text-vault-negative/70 hover:text-vault-negative"
                    >
                      <Trash2 className="size-3" />
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="pr-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.map((account) => {
                  const Icon = typeIcons[account.type];
                  return (
                    <TableRow key={account.id}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
                            <Icon className="size-4" />
                          </div>
                          <span className="text-sm font-medium text-foreground">
                            {account.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px]",
                            typeBadgeStyles[account.type]
                          )}
                        >
                          {typeLabels[account.type]}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right text-sm font-semibold tabular-nums",
                          Number(account.balance) >= 0
                            ? "text-foreground"
                            : "text-vault-negative"
                        )}
                      >
                        {formatRs(Number(account.balance))}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(account.created_at).toLocaleDateString(
                          "en-PK",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
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
          </div>
        )}
      </section>

      {/* ── 5. Account Distribution Chart ── */}
      {accounts.length > 0 && (
        <section>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-foreground">
              Account Distribution
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Balance breakdown across all accounts
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={accounts.map((a) => ({
                    name: a.name,
                    balance: Number(a.balance),
                  }))}
                  margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <RechartsTooltip
                    content={<ChartTooltipContent />}
                    cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                  />
                  <Bar dataKey="balance" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {accounts.map((_, index) => (
                      <Cell
                        key={index}
                        fill={chartColors[index % chartColors.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {/* ── 6. Add Account Modal ── */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Account</DialogTitle>
            <DialogDescription>
              Add a bank account, digital wallet, or cash balance to track.
            </DialogDescription>
          </DialogHeader>

          {submitError && (
            <div className="rounded-lg border border-vault-negative/30 bg-vault-negative-light px-3 py-2 text-sm text-vault-negative">
              {submitError}
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="account-name">Account Name</Label>
              <Input
                id="account-name"
                placeholder="e.g., Meezan Bank Savings"
                value={newAccount.name}
                onChange={(e) =>
                  setNewAccount((prev) => ({ ...prev, name: e.target.value }))
                }
                className={cn(formErrors.name && "border-vault-negative")}
              />
              {formErrors.name && (
                <p className="text-[11px] text-vault-negative">
                  {formErrors.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Account Type</Label>
              <Select
                value={newAccount.type}
                onValueChange={(v) =>
                  setNewAccount((prev) => ({
                    ...prev,
                    type: v as AccountType,
                  }))
                }
              >
                <SelectTrigger className="w-full">
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
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateAccount} disabled={submitLoading}>
              {submitLoading && <Loader2 className="size-4 animate-spin" />}
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
