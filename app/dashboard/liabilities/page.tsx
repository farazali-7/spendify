"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  TrendingDown,
  Eye,
  Pencil,
  Trash2,
  Building2,
  CreditCard,
  Users,
  CircleDollarSign,
  AlertTriangle,
  CalendarClock,
  Percent,
  Landmark,
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
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────

type LiabilityType = "Bank Loan" | "Credit Card" | "Personal Loan" | "Other";
type LiabilityStatus = "Active" | "Closed";

interface Liability {
  id: string;
  name: string;
  type: LiabilityType;
  originalAmount: number;
  remainingBalance: number;
  interestRate: number;
  monthlyEmi: number;
  startDate: string;
  nextDueDate: string;
  dueDay: number;
  linkedAccount: string;
  status: LiabilityStatus;
  notes?: string;
}

// ─── Mock Data ──────────────────────────────────────────────

const accountsList = ["Meezan Bank", "HBL", "JazzCash", "Cash"];

const liabilities: Liability[] = [
  {
    id: "1",
    name: "Home Loan — Meezan Bank",
    type: "Bank Loan",
    originalAmount: 3500000,
    remainingBalance: 2800000,
    interestRate: 14.5,
    monthlyEmi: 48500,
    startDate: "2023-06-15",
    nextDueDate: "2026-03-05",
    dueDay: 5,
    linkedAccount: "Meezan Bank",
    status: "Active",
    notes: "Islamic mortgage — diminishing musharakah",
  },
  {
    id: "2",
    name: "Car Loan — HBL",
    type: "Bank Loan",
    originalAmount: 1200000,
    remainingBalance: 640000,
    interestRate: 18.0,
    monthlyEmi: 32000,
    startDate: "2024-01-10",
    nextDueDate: "2026-03-10",
    dueDay: 10,
    linkedAccount: "HBL",
    status: "Active",
  },
  {
    id: "3",
    name: "HBL Credit Card",
    type: "Credit Card",
    originalAmount: 150000,
    remainingBalance: 42300,
    interestRate: 36.0,
    monthlyEmi: 8500,
    startDate: "2025-04-01",
    nextDueDate: "2026-02-20",
    dueDay: 20,
    linkedAccount: "HBL",
    status: "Active",
    notes: "Minimum payment due — aim for full clearance",
  },
  {
    id: "4",
    name: "Loan from Ahmed Bhai",
    type: "Personal Loan",
    originalAmount: 200000,
    remainingBalance: 75000,
    interestRate: 0,
    monthlyEmi: 25000,
    startDate: "2025-08-01",
    nextDueDate: "2026-03-01",
    dueDay: 1,
    linkedAccount: "Cash",
    status: "Active",
    notes: "Interest-free — return before Eid",
  },
  {
    id: "5",
    name: "Laptop EMI — Daraz",
    type: "Other",
    originalAmount: 180000,
    remainingBalance: 0,
    interestRate: 0,
    monthlyEmi: 15000,
    startDate: "2025-01-15",
    nextDueDate: "2025-12-15",
    dueDay: 15,
    linkedAccount: "HBL",
    status: "Closed",
    notes: "12-month installment plan — completed",
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

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-PK", { month: "short", day: "numeric" });
}

function daysUntil(dateStr: string) {
  const now = new Date("2026-02-13");
  const due = new Date(dateStr);
  const diff = Math.ceil(
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  return diff;
}

function paidPercentage(original: number, remaining: number) {
  if (original === 0) return 100;
  return Math.round(((original - remaining) / original) * 100);
}

const typeIcons: Record<LiabilityType, typeof Building2> = {
  "Bank Loan": Building2,
  "Credit Card": CreditCard,
  "Personal Loan": Users,
  Other: CircleDollarSign,
};

const typeBadgeStyles: Record<LiabilityType, string> = {
  "Bank Loan": "bg-vault-info-light text-vault-info",
  "Credit Card": "bg-vault-negative-light text-vault-negative",
  "Personal Loan": "bg-[rgba(155,139,170,0.15)] text-vault-chart-5",
  Other: "bg-vault-warning-light text-vault-warning",
};

// ─── Empty State ────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 py-16">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
        <Landmark className="size-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">
        No Liabilities Tracked
      </h3>
      <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
        Add your first loan, credit card, or borrowing to start tracking your
        debt obligations.
      </p>
      <Button size="lg" className="mt-6 rounded-xl" onClick={onAdd}>
        <Plus className="size-4" />
        Add Liability
      </Button>
    </div>
  );
}

// ─── Progress Bar Component ─────────────────────────────────

function DebtProgressBar({
  label,
  original,
  remaining,
  isOverdue,
}: {
  label: string;
  original: number;
  remaining: number;
  isOverdue: boolean;
}) {
  const pct = paidPercentage(original, remaining);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {isOverdue && (
            <Badge
              variant="secondary"
              className="bg-vault-negative-light text-vault-negative text-[10px]"
            >
              <AlertTriangle className="size-2.5" />
              Overdue
            </Badge>
          )}
        </div>
        <span className="text-sm tabular-nums text-muted-foreground">
          {pct}% paid
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out",
            isOverdue
              ? "bg-vault-negative"
              : pct >= 75
                ? "bg-vault-positive"
                : pct >= 40
                  ? "bg-vault-warning"
                  : "bg-vault-info"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Paid: {formatRs(original - remaining)}</span>
        <span>Remaining: {formatRs(remaining)}</span>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────

export default function LiabilitiesPage() {
  // ── Filter state ──
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | LiabilityType>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | LiabilityStatus>(
    "All"
  );
  const [sortBy, setSortBy] = useState<
    "balance-desc" | "interest-desc" | "recent"
  >("balance-desc");

  // ── Modal state ──
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "Bank Loan" as LiabilityType,
    originalAmount: "",
    interestRate: "",
    startDate: "",
    emiAmount: "",
    dueDay: "",
    linkedAccount: "",
    notes: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ── Filtered & sorted ──
  const filteredLiabilities = useMemo(() => {
    let result = [...liabilities];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.type.toLowerCase().includes(q)
      );
    }

    if (typeFilter !== "All") {
      result = result.filter((l) => l.type === typeFilter);
    }

    if (statusFilter !== "All") {
      result = result.filter((l) => l.status === statusFilter);
    }

    switch (sortBy) {
      case "balance-desc":
        result.sort((a, b) => b.remainingBalance - a.remainingBalance);
        break;
      case "interest-desc":
        result.sort((a, b) => b.interestRate - a.interestRate);
        break;
      case "recent":
        result.sort(
          (a, b) =>
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        );
        break;
    }

    return result;
  }, [searchQuery, typeFilter, statusFilter, sortBy]);

  // ── KPI calculations (active liabilities only) ──
  const activeLiabilities = liabilities.filter((l) => l.status === "Active");

  const totalOutstanding = activeLiabilities.reduce(
    (sum, l) => sum + l.remainingBalance,
    0
  );
  const totalEmi = activeLiabilities.reduce(
    (sum, l) => sum + l.monthlyEmi,
    0
  );
  const avgInterest =
    activeLiabilities.length > 0
      ? activeLiabilities.reduce((sum, l) => sum + l.interestRate, 0) /
        activeLiabilities.length
      : 0;

  const nextDuePayment = activeLiabilities
    .filter((l) => daysUntil(l.nextDueDate) >= 0)
    .sort(
      (a, b) =>
        new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime()
    )[0];

  // ── Form helpers ──
  function validateForm() {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }

    if (!formData.originalAmount || parseFloat(formData.originalAmount) <= 0) {
      errors.originalAmount = "Enter a valid amount";
    }

    if (formData.interestRate && parseFloat(formData.interestRate) < 0) {
      errors.interestRate = "Interest rate cannot be negative";
    }

    if (
      formData.interestRate &&
      parseFloat(formData.interestRate) > 100
    ) {
      errors.interestRate = "Interest rate must be a percentage (0–100)";
    }

    if (!formData.emiAmount || parseFloat(formData.emiAmount) <= 0) {
      errors.emiAmount = "Enter a valid EMI amount";
    }

    if (
      formData.originalAmount &&
      formData.emiAmount &&
      parseFloat(formData.emiAmount) > parseFloat(formData.originalAmount)
    ) {
      errors.emiAmount = "EMI cannot exceed total amount";
    }

    if (!formData.startDate) {
      errors.startDate = "Select a start date";
    }

    if (!formData.dueDay || parseInt(formData.dueDay) < 1 || parseInt(formData.dueDay) > 28) {
      errors.dueDay = "Enter a day between 1–28";
    }

    if (!formData.linkedAccount) {
      errors.linkedAccount = "Select an account";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleCreateLiability() {
    if (!validateForm()) return;
    resetForm();
    setIsAddModalOpen(false);
  }

  function resetForm() {
    setFormData({
      name: "",
      type: "Bank Loan",
      originalAmount: "",
      interestRate: "",
      startDate: "",
      emiAmount: "",
      dueDay: "",
      linkedAccount: "",
      notes: "",
    });
    setFormErrors({});
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      {/* ── 1. Page Header ── */}
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Liabilities
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage loans, credit, and financial obligations.
            </p>
          </div>
          <Button
            size="lg"
            className="rounded-xl"
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
          >
            <Plus className="size-4" />
            Add Liability
          </Button>
        </div>
      </section>

      {/* ── 2. KPI Summary Cards ── */}
      <section>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {/* Total Outstanding */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Total Outstanding
              </p>
              <div className="flex size-8 items-center justify-center rounded-lg bg-vault-negative-light">
                <TrendingDown className="size-4 text-vault-negative" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {formatRs(totalOutstanding)}
            </p>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Across {activeLiabilities.length} active liabilities
            </p>
          </div>

          {/* Monthly EMI */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Monthly EMI
              </p>
              <div className="flex size-8 items-center justify-center rounded-lg bg-vault-warning-light">
                <CalendarClock className="size-4 text-vault-warning" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {formatRs(totalEmi)}
            </p>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Combined monthly obligation
            </p>
          </div>

          {/* Average Interest Rate */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Avg Interest Rate
              </p>
              <div className="flex size-8 items-center justify-center rounded-lg bg-vault-info-light">
                <Percent className="size-4 text-vault-info" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {avgInterest.toFixed(1)}%
            </p>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Weighted across active debt
            </p>
          </div>

          {/* Next Due Payment */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Next Due
              </p>
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg",
                  nextDuePayment && daysUntil(nextDuePayment.nextDueDate) <= 7
                    ? "bg-vault-negative-light"
                    : "bg-muted/60"
                )}
              >
                <CalendarClock
                  className={cn(
                    "size-4",
                    nextDuePayment &&
                      daysUntil(nextDuePayment.nextDueDate) <= 7
                      ? "text-vault-negative"
                      : "text-muted-foreground"
                  )}
                />
              </div>
            </div>
            {nextDuePayment ? (
              <>
                <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                  {formatRs(nextDuePayment.monthlyEmi)}
                </p>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {formatShortDate(nextDuePayment.nextDueDate)} —{" "}
                  {nextDuePayment.name.length > 20
                    ? nextDuePayment.name.slice(0, 20) + "…"
                    : nextDuePayment.name}
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-muted-foreground">
                  —
                </p>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  No upcoming payments
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── 3. Filters Row ── */}
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
          {/* Search */}
          <div className="relative max-w-xs flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search liabilities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Type */}
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as "All" | LiabilityType)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Types</SelectItem>
              <SelectItem value="Bank Loan">Bank Loan</SelectItem>
              <SelectItem value="Credit Card">Credit Card</SelectItem>
              <SelectItem value="Personal Loan">Personal Loan</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>

          {/* Status */}
          <Select
            value={statusFilter}
            onValueChange={(v) =>
              setStatusFilter(v as "All" | LiabilityStatus)
            }
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select
            value={sortBy}
            onValueChange={(v) =>
              setSortBy(v as "balance-desc" | "interest-desc" | "recent")
            }
          >
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="balance-desc">Highest Balance</SelectItem>
              <SelectItem value="interest-desc">Highest Interest</SelectItem>
              <SelectItem value="recent">Recently Added</SelectItem>
            </SelectContent>
          </Select>

          {/* Active filter indicator */}
          {(typeFilter !== "All" ||
            statusFilter !== "All" ||
            searchQuery) && (
            <div className="flex items-center gap-2 sm:ml-auto">
              <span className="text-xs text-muted-foreground">
                {filteredLiabilities.length} result
                {filteredLiabilities.length !== 1 ? "s" : ""}
              </span>
              <Button
                variant="ghost"
                size="xs"
                className="text-muted-foreground"
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("All");
                  setStatusFilter("All");
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ── 4. Liabilities Table ── */}
      <section>
        {filteredLiabilities.length === 0 ? (
          <EmptyState
            onAdd={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Name</TableHead>
                  <TableHead className="w-[110px]">Type</TableHead>
                  <TableHead className="text-right">Original</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="text-right w-[80px]">Rate</TableHead>
                  <TableHead className="text-right">EMI</TableHead>
                  <TableHead className="w-[110px]">Next Due</TableHead>
                  <TableHead className="w-[140px]">Progress</TableHead>
                  <TableHead className="pr-5 text-right w-[100px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLiabilities.map((liability) => {
                  const Icon = typeIcons[liability.type];
                  const pct = paidPercentage(
                    liability.originalAmount,
                    liability.remainingBalance
                  );
                  const days = daysUntil(liability.nextDueDate);
                  const isOverdue = days < 0 && liability.status === "Active";
                  const isDueSoon =
                    days >= 0 && days <= 7 && liability.status === "Active";

                  return (
                    <TableRow
                      key={liability.id}
                      className={cn(
                        "transition-colors hover:bg-muted/30",
                        liability.status === "Closed" && "opacity-50"
                      )}
                    >
                      {/* Name */}
                      <TableCell className="pl-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex size-8 shrink-0 items-center justify-center rounded-lg",
                              typeBadgeStyles[liability.type]
                            )}
                          >
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {liability.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {liability.linkedAccount}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Type Badge */}
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] font-medium",
                            typeBadgeStyles[liability.type]
                          )}
                        >
                          {liability.type}
                        </Badge>
                      </TableCell>

                      {/* Original Amount */}
                      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                        {formatRs(liability.originalAmount)}
                      </TableCell>

                      {/* Remaining Balance */}
                      <TableCell className="text-right text-sm font-semibold tabular-nums text-foreground">
                        {formatRs(liability.remainingBalance)}
                      </TableCell>

                      {/* Interest Rate */}
                      <TableCell className="text-right text-sm tabular-nums text-foreground">
                        {liability.interestRate > 0
                          ? `${liability.interestRate}%`
                          : "—"}
                      </TableCell>

                      {/* Monthly EMI */}
                      <TableCell className="text-right text-sm font-semibold tabular-nums text-vault-negative">
                        {formatRs(liability.monthlyEmi)}
                      </TableCell>

                      {/* Next Due Date */}
                      <TableCell>
                        {liability.status === "Closed" ? (
                          <Badge
                            variant="secondary"
                            className="bg-muted/60 text-muted-foreground text-[10px]"
                          >
                            Closed
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {(isOverdue || isDueSoon) && (
                              <AlertTriangle
                                className={cn(
                                  "size-3 shrink-0",
                                  isOverdue
                                    ? "text-vault-negative"
                                    : "text-vault-warning"
                                )}
                              />
                            )}
                            <span
                              className={cn(
                                "text-sm tabular-nums",
                                isOverdue
                                  ? "font-medium text-vault-negative"
                                  : isDueSoon
                                    ? "font-medium text-vault-warning"
                                    : "text-muted-foreground"
                              )}
                            >
                              {formatShortDate(liability.nextDueDate)}
                            </span>
                          </div>
                        )}
                      </TableCell>

                      {/* Progress */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/60">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                liability.status === "Closed"
                                  ? "bg-vault-positive"
                                  : isOverdue
                                    ? "bg-vault-negative"
                                    : pct >= 75
                                      ? "bg-vault-positive"
                                      : pct >= 40
                                        ? "bg-vault-warning"
                                        : "bg-vault-info"
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-[11px] tabular-nums text-muted-foreground">
                            {pct}%
                          </span>
                        </div>
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
          </div>
        )}
      </section>

      {/* ── 5. Debt Payoff Progress ── */}
      {activeLiabilities.length > 0 && (
        <section>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-foreground">
              Debt Payoff Progress
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Track how much you&apos;ve paid off across all active obligations
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            {activeLiabilities
              .sort((a, b) => b.remainingBalance - a.remainingBalance)
              .map((liability) => {
                const days = daysUntil(liability.nextDueDate);
                return (
                  <DebtProgressBar
                    key={liability.id}
                    label={liability.name}
                    original={liability.originalAmount}
                    remaining={liability.remainingBalance}
                    isOverdue={days < 0}
                  />
                );
              })}

            {/* Total summary strip */}
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Total Debt Cleared
                  </p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums text-vault-positive">
                    {formatRs(
                      activeLiabilities.reduce(
                        (sum, l) => sum + (l.originalAmount - l.remainingBalance),
                        0
                      )
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Still Remaining
                  </p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums text-vault-negative">
                    {formatRs(totalOutstanding)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── 6. Add Liability Modal ── */}
      <Dialog
        open={isAddModalOpen}
        onOpenChange={(open) => {
          setIsAddModalOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Liability</DialogTitle>
            <DialogDescription>
              Track a new loan, credit card, or financial obligation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="liability-name">Name</Label>
              <Input
                id="liability-name"
                placeholder="e.g., Home Loan — Meezan Bank"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className={cn(formErrors.name && "border-vault-negative")}
              />
              {formErrors.name && (
                <p className="text-[11px] text-vault-negative">
                  {formErrors.name}
                </p>
              )}
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.type}
                onValueChange={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    type: v as LiabilityType,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank Loan">Bank Loan</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Personal Loan">Personal Loan</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Two-column: Original Amount + Interest Rate */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="original-amount">Original Amount</Label>
                <Input
                  id="original-amount"
                  type="number"
                  placeholder="0"
                  value={formData.originalAmount}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      originalAmount: e.target.value,
                    }))
                  }
                  className={cn(
                    formErrors.originalAmount && "border-vault-negative"
                  )}
                />
                {formErrors.originalAmount && (
                  <p className="text-[11px] text-vault-negative">
                    {formErrors.originalAmount}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="interest-rate">Interest Rate (%)</Label>
                <Input
                  id="interest-rate"
                  type="number"
                  placeholder="0"
                  step="0.1"
                  value={formData.interestRate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      interestRate: e.target.value,
                    }))
                  }
                  className={cn(
                    formErrors.interestRate && "border-vault-negative"
                  )}
                />
                {formErrors.interestRate && (
                  <p className="text-[11px] text-vault-negative">
                    {formErrors.interestRate}
                  </p>
                )}
              </div>
            </div>

            {/* Two-column: EMI Amount + Due Day */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="emi-amount">EMI Amount</Label>
                <Input
                  id="emi-amount"
                  type="number"
                  placeholder="0"
                  value={formData.emiAmount}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      emiAmount: e.target.value,
                    }))
                  }
                  className={cn(
                    formErrors.emiAmount && "border-vault-negative"
                  )}
                />
                {formErrors.emiAmount && (
                  <p className="text-[11px] text-vault-negative">
                    {formErrors.emiAmount}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="due-day">Due Day (1–28)</Label>
                <Input
                  id="due-day"
                  type="number"
                  placeholder="5"
                  min={1}
                  max={28}
                  value={formData.dueDay}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      dueDay: e.target.value,
                    }))
                  }
                  className={cn(
                    formErrors.dueDay && "border-vault-negative"
                  )}
                />
                {formErrors.dueDay && (
                  <p className="text-[11px] text-vault-negative">
                    {formErrors.dueDay}
                  </p>
                )}
              </div>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
                className={cn(
                  formErrors.startDate && "border-vault-negative"
                )}
              />
              {formErrors.startDate && (
                <p className="text-[11px] text-vault-negative">
                  {formErrors.startDate}
                </p>
              )}
            </div>

            {/* Linked Account */}
            <div className="space-y-2">
              <Label>Linked Account</Label>
              <Select
                value={formData.linkedAccount}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, linkedAccount: v }))
                }
              >
                <SelectTrigger
                  className={cn(
                    "w-full",
                    formErrors.linkedAccount && "border-vault-negative"
                  )}
                >
                  <SelectValue placeholder="Select account for EMI deduction" />
                </SelectTrigger>
                <SelectContent>
                  {accountsList.map((acc) => (
                    <SelectItem key={acc} value={acc}>
                      {acc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.linkedAccount && (
                <p className="text-[11px] text-vault-negative">
                  {formErrors.linkedAccount}
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="liability-notes">
                Notes{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="liability-notes"
                placeholder="Any additional details..."
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
            <Button onClick={handleCreateLiability}>Add Liability</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
