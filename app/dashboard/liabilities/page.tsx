"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  Banknote,
  Check,
  Receipt,
  Hash,
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
  LiabilityType,
  LiabilityStatus,
  PaymentFrequency,
  LiabilitySummary,
  LiabilityPaymentDisplay,
  AccountWithBalance,
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

// ─── Display Label Mappings ─────────────────────────────────

const typeLabels: Record<LiabilityType, string> = {
  bank_loan: "Bank Loan",
  credit_card: "Credit Card",
  personal_loan: "Personal Loan",
  other: "Other",
};

const statusLabels: Record<LiabilityStatus, string> = {
  active: "Active",
  closed: "Closed",
};

const frequencyLabels: Record<PaymentFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
  custom: "Custom",
};

// ─── Helpers ────────────────────────────────────────────────

function formatRs(v: number) {
  return `Rs ${v.toLocaleString("en-PK")}`;
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-PK", { month: "short", day: "numeric" });
}

function formatFullDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-PK", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(dateStr: string) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  return Math.ceil(
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function paidPercentage(original: number, remaining: number) {
  if (original === 0) return 100;
  return Math.round(((original - remaining) / original) * 100);
}

function calculateProjectedPayoff(
  remaining: number,
  emi: number,
  frequency: PaymentFrequency
): string | null {
  if (emi <= 0 || remaining <= 0) return null;

  let paymentsPerYear: number;
  switch (frequency) {
    case "daily":
      paymentsPerYear = 365;
      break;
    case "weekly":
      paymentsPerYear = 52;
      break;
    case "monthly":
      paymentsPerYear = 12;
      break;
    case "quarterly":
      paymentsPerYear = 4;
      break;
    case "yearly":
      paymentsPerYear = 1;
      break;
    case "custom":
      paymentsPerYear = 12;
      break;
  }

  const totalPayments = Math.ceil(remaining / emi);
  const yearsToPayoff = totalPayments / paymentsPerYear;

  const payoffDate = new Date();
  payoffDate.setDate(
    payoffDate.getDate() + Math.ceil(yearsToPayoff * 365)
  );

  return payoffDate.toISOString().split("T")[0];
}

function frequencyLabel(f: PaymentFrequency): string {
  return frequencyLabels[f];
}

const typeIcons: Record<LiabilityType, typeof Building2> = {
  bank_loan: Building2,
  credit_card: CreditCard,
  personal_loan: Users,
  other: CircleDollarSign,
};

const typeBadgeStyles: Record<LiabilityType, string> = {
  bank_loan: "bg-vault-info-light text-vault-info",
  credit_card: "bg-vault-negative-light text-vault-negative",
  personal_loan: "bg-[rgba(155,139,170,0.15)] text-vault-chart-5",
  other: "bg-vault-warning-light text-vault-warning",
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
  projectedPayoff,
}: {
  label: string;
  original: number;
  remaining: number;
  isOverdue: boolean;
  projectedPayoff?: string | null;
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
        <div className="flex items-center gap-3">
          <span>Remaining: {formatRs(remaining)}</span>
          {projectedPayoff && remaining > 0 && (
            <span className="text-vault-info">
              Payoff: {formatShortDate(projectedPayoff)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────

export default function LiabilitiesPage() {
  // ── Data state ──
  const [liabilities, setLiabilities] = useState<LiabilitySummary[]>([]);
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // ── Filter state ──
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | LiabilityType>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | LiabilityStatus>(
    "All"
  );
  const [sortBy, setSortBy] = useState<
    "balance-desc" | "interest-desc" | "recent"
  >("balance-desc");

  // ── Add Liability Modal state ──
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "bank_loan" as LiabilityType,
    originalAmount: "",
    interestRate: "",
    startDate: "",
    emiAmount: "",
    frequency: "monthly" as PaymentFrequency,
    expectedEndDate: "",
    nextDueDate: "",
    linkedAccount: "",
    depositToAccount: false,
    depositAccount: "",
    notes: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ── Make Payment Modal state ──
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<LiabilitySummary | null>(null);
  const [paymentData, setPaymentData] = useState({
    principalAmount: "",
    interestAmount: "",
    date: "",
    account: "",
    description: "",
    notes: "",
  });
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>(
    {}
  );

  // ── View Details Drawer state ──
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<LiabilitySummary | null>(null);
  const [detailPayments, setDetailPayments] = useState<LiabilityPaymentDisplay[]>([]);
  const [detailPaymentsLoading, setDetailPaymentsLoading] = useState(false);

  // ── Account name lookup helper ──
  function accountName(id: string): string {
    const acc = accounts.find((a) => a.id === id);
    return acc ? acc.name : id;
  }

  // ── Data fetching ──
  const fetchLiabilities = useCallback(async () => {
    try {
      const data = await apiFetch<LiabilitySummary[]>("/api/liabilities");
      setLiabilities(data);
    } catch {
      // silently handle — could add toast
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [liabilitiesData, accountsData] = await Promise.all([
          apiFetch<LiabilitySummary[]>("/api/liabilities"),
          apiFetch<AccountWithBalance[]>("/api/accounts"),
        ]);
        setLiabilities(liabilitiesData);
        setAccounts(accountsData);
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // ── Detail drawer: fetch payments when opened ──
  async function openDetailDrawer(liability: LiabilitySummary) {
    const fresh = liabilities.find((l) => l.id === liability.id) || liability;
    setDetailTarget(fresh);
    setDetailPayments([]);
    setIsDetailOpen(true);
    setDetailPaymentsLoading(true);
    try {
      const payments = await apiFetch<LiabilityPaymentDisplay[]>(
        `/api/liabilities/${fresh.id}/payments`
      );
      setDetailPayments(payments);
    } catch {
      // silently handle
    } finally {
      setDetailPaymentsLoading(false);
    }
  }

  // ── Filtered & sorted ──
  const filteredLiabilities = useMemo(() => {
    let result = [...liabilities];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          typeLabels[l.type].toLowerCase().includes(q)
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
        result.sort((a, b) => b.remaining_balance - a.remaining_balance);
        break;
      case "interest-desc":
        result.sort((a, b) => b.interest_rate - a.interest_rate);
        break;
      case "recent":
        result.sort(
          (a, b) =>
            new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
        );
        break;
    }

    return result;
  }, [liabilities, searchQuery, typeFilter, statusFilter, sortBy]);

  // ── KPI calculations ──
  const activeLiabilities = liabilities.filter((l) => l.status === "active");

  const totalOutstanding = activeLiabilities.reduce(
    (sum, l) => sum + l.remaining_balance,
    0
  );
  const totalEmi = activeLiabilities.reduce(
    (sum, l) => sum + l.emi_amount,
    0
  );
  const avgInterest =
    activeLiabilities.length > 0
      ? activeLiabilities.reduce((sum, l) => sum + l.interest_rate, 0) /
        activeLiabilities.length
      : 0;

  const nextDuePayment = activeLiabilities
    .filter((l) => l.next_due_date && daysUntil(l.next_due_date) >= 0)
    .sort(
      (a, b) =>
        new Date(a.next_due_date!).getTime() - new Date(b.next_due_date!).getTime()
    )[0];

  // ── Add Liability form helpers ──
  function validateAddForm() {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }

    if (!formData.originalAmount || parseFloat(formData.originalAmount) <= 0) {
      errors.originalAmount = "Enter a valid amount";
    }

    if (formData.interestRate && parseFloat(formData.interestRate) < 0) {
      errors.interestRate = "Cannot be negative";
    }

    if (formData.interestRate && parseFloat(formData.interestRate) > 100) {
      errors.interestRate = "Must be 0-100%";
    }

    if (!formData.emiAmount || parseFloat(formData.emiAmount) <= 0) {
      errors.emiAmount = "Enter a valid EMI amount";
    }

    if (
      formData.originalAmount &&
      formData.emiAmount &&
      parseFloat(formData.emiAmount) > parseFloat(formData.originalAmount)
    ) {
      errors.emiAmount = "EMI cannot exceed principal";
    }

    if (!formData.startDate) {
      errors.startDate = "Select a start date";
    }

    if (!formData.linkedAccount) {
      errors.linkedAccount = "Select an account";
    }

    if (formData.depositToAccount && !formData.depositAccount) {
      errors.depositAccount = "Select deposit account";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleCreateLiability() {
    if (!validateAddForm()) return;

    setSubmitLoading(true);
    setSubmitError("");

    try {
      await apiPost("/api/liabilities", {
        name: formData.name.trim(),
        type: formData.type,
        original_amount: parseFloat(formData.originalAmount),
        interest_rate: formData.interestRate
          ? parseFloat(formData.interestRate)
          : 0,
        emi_amount: parseFloat(formData.emiAmount),
        frequency: formData.frequency,
        start_date: formData.startDate,
        next_due_date: formData.nextDueDate || null,
        expected_end_date: formData.expectedEndDate || null,
        linked_account_id: formData.linkedAccount,
        deposited_to_account: formData.depositToAccount,
        deposit_account_id: formData.depositToAccount
          ? formData.depositAccount
          : null,
        notes: formData.notes || null,
      });

      resetAddForm();
      setIsAddModalOpen(false);
      await fetchLiabilities();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to create liability"
      );
    } finally {
      setSubmitLoading(false);
    }
  }

  function resetAddForm() {
    setFormData({
      name: "",
      type: "bank_loan",
      originalAmount: "",
      interestRate: "",
      startDate: "",
      emiAmount: "",
      frequency: "monthly",
      expectedEndDate: "",
      nextDueDate: "",
      linkedAccount: "",
      depositToAccount: false,
      depositAccount: "",
      notes: "",
    });
    setFormErrors({});
    setSubmitError("");
  }

  // ── Payment form helpers ──
  function openPaymentModal(liability: LiabilitySummary) {
    setPaymentTarget(liability);
    setPaymentData({
      principalAmount: "",
      interestAmount: "0",
      date: "",
      account: liability.linked_account_id,
      description: "",
      notes: "",
    });
    setPaymentErrors({});
    setSubmitError("");
    setIsPaymentModalOpen(true);
  }

  function validatePayment() {
    if (!paymentTarget) return false;
    const errors: Record<string, string> = {};

    const principal = parseFloat(paymentData.principalAmount);

    if (!paymentData.principalAmount || principal <= 0) {
      errors.principalAmount = "Enter a valid amount";
    }

    if (principal > paymentTarget.remaining_balance) {
      errors.principalAmount = `Cannot exceed remaining balance (${formatRs(paymentTarget.remaining_balance)})`;
    }

    if (!paymentData.date) {
      errors.date = "Select payment date";
    }

    if (!paymentData.account) {
      errors.account = "Select an account";
    }

    setPaymentErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleMakePayment() {
    if (!paymentTarget || !validatePayment()) return;

    setSubmitLoading(true);
    setSubmitError("");

    try {
      await apiPost(`/api/liabilities/${paymentTarget.id}/payments`, {
        account_id: paymentData.account,
        principal_amount: parseFloat(paymentData.principalAmount),
        interest_amount: paymentData.interestAmount
          ? parseFloat(paymentData.interestAmount)
          : 0,
        payment_date: paymentData.date,
        description: paymentData.description || `Payment for ${paymentTarget.name}`,
        notes: paymentData.notes || null,
      });

      setIsPaymentModalOpen(false);
      setPaymentTarget(null);
      await fetchLiabilities();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to record payment"
      );
    } finally {
      setSubmitLoading(false);
    }
  }

  // ── Projected payoff helper ──
  function projectedPayoff(l: LiabilitySummary) {
    return calculateProjectedPayoff(
      l.remaining_balance,
      l.emi_amount,
      l.frequency
    );
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-3 py-32">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading liabilities...</p>
        </div>
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
              resetAddForm();
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
              Combined periodic obligation
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
              Across active debt
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
                  nextDuePayment && nextDuePayment.next_due_date && daysUntil(nextDuePayment.next_due_date) <= 7
                    ? "bg-vault-negative-light"
                    : "bg-muted/60"
                )}
              >
                <CalendarClock
                  className={cn(
                    "size-4",
                    nextDuePayment &&
                      nextDuePayment.next_due_date &&
                      daysUntil(nextDuePayment.next_due_date) <= 7
                      ? "text-vault-negative"
                      : "text-muted-foreground"
                  )}
                />
              </div>
            </div>
            {nextDuePayment ? (
              <>
                <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                  {formatRs(nextDuePayment.emi_amount)}
                </p>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {nextDuePayment.next_due_date && formatShortDate(nextDuePayment.next_due_date)} —{" "}
                  {nextDuePayment.name.length > 20
                    ? nextDuePayment.name.slice(0, 20) + "..."
                    : nextDuePayment.name}
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-muted-foreground">
                  --
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
          <div className="relative max-w-xs flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search liabilities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as "All" | LiabilityType)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Types</SelectItem>
              <SelectItem value="bank_loan">Bank Loan</SelectItem>
              <SelectItem value="credit_card">Credit Card</SelectItem>
              <SelectItem value="personal_loan">Personal Loan</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

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
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

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
              resetAddForm();
              setIsAddModalOpen(true);
            }}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Name</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead className="text-right">Original</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="text-right w-[70px]">Rate</TableHead>
                  <TableHead className="text-right">EMI</TableHead>
                  <TableHead className="w-[90px]">Frequency</TableHead>
                  <TableHead className="w-[100px]">Next Due</TableHead>
                  <TableHead className="w-[130px]">Progress</TableHead>
                  <TableHead className="pr-5 text-right w-[120px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLiabilities.map((liability) => {
                  const Icon = typeIcons[liability.type];
                  const pct = paidPercentage(
                    liability.original_amount,
                    liability.remaining_balance
                  );
                  const days = liability.next_due_date
                    ? daysUntil(liability.next_due_date)
                    : null;
                  const isOverdue =
                    days !== null && days < 0 && liability.status === "active";
                  const isDueSoon =
                    days !== null &&
                    days >= 0 &&
                    days <= 7 &&
                    liability.status === "active";
                  const isHighInterest = liability.interest_rate >= 30;

                  return (
                    <TableRow
                      key={liability.id}
                      className={cn(
                        "transition-colors hover:bg-muted/30",
                        liability.status === "closed" && "opacity-50"
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
                              {accountName(liability.linked_account_id)}
                              {liability.deposited_to_account && (
                                <span className="ml-1 text-vault-info">
                                  · Deposited
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Type */}
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] font-medium",
                            typeBadgeStyles[liability.type]
                          )}
                        >
                          {typeLabels[liability.type]}
                        </Badge>
                      </TableCell>

                      {/* Original */}
                      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                        {formatRs(liability.original_amount)}
                      </TableCell>

                      {/* Remaining */}
                      <TableCell className="text-right text-sm font-semibold tabular-nums text-foreground">
                        {formatRs(liability.remaining_balance)}
                      </TableCell>

                      {/* Rate */}
                      <TableCell
                        className={cn(
                          "text-right text-sm tabular-nums",
                          isHighInterest
                            ? "font-medium text-vault-warning"
                            : "text-foreground"
                        )}
                      >
                        {liability.interest_rate > 0
                          ? `${liability.interest_rate}%`
                          : "--"}
                      </TableCell>

                      {/* EMI */}
                      <TableCell className="text-right text-sm font-semibold tabular-nums text-vault-negative">
                        {liability.emi_amount > 0
                          ? formatRs(liability.emi_amount)
                          : "--"}
                      </TableCell>

                      {/* Frequency */}
                      <TableCell className="text-sm text-muted-foreground">
                        {frequencyLabel(liability.frequency)}
                      </TableCell>

                      {/* Next Due */}
                      <TableCell>
                        {liability.status === "closed" ? (
                          <Badge
                            variant="secondary"
                            className="bg-vault-positive-light text-vault-positive text-[10px]"
                          >
                            <Check className="size-2.5" />
                            Closed
                          </Badge>
                        ) : liability.next_due_date ? (
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
                              {formatShortDate(liability.next_due_date)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">--</span>
                        )}
                      </TableCell>

                      {/* Progress */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/60">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                liability.status === "closed"
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
                          {liability.status === "active" && (
                            <Button
                              variant="ghost"
                              size="xs"
                              className="text-vault-positive"
                              onClick={() => openPaymentModal(liability)}
                            >
                              <Banknote className="size-3" />
                              Pay
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => openDetailDrawer(liability)}
                          >
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
            {[...activeLiabilities]
              .sort((a, b) => b.remaining_balance - a.remaining_balance)
              .map((liability) => {
                const days = liability.next_due_date
                  ? daysUntil(liability.next_due_date)
                  : null;
                return (
                  <DebtProgressBar
                    key={liability.id}
                    label={liability.name}
                    original={liability.original_amount}
                    remaining={liability.remaining_balance}
                    isOverdue={days !== null && days < 0}
                    projectedPayoff={projectedPayoff(liability)}
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
                        (sum, l) =>
                          sum + (l.original_amount - l.remaining_balance),
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
          if (!open) resetAddForm();
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Liability</DialogTitle>
            <DialogDescription>
              Track a new loan, credit card, or financial obligation.
            </DialogDescription>
          </DialogHeader>

          {submitError && (
            <div className="rounded-lg border border-vault-negative/30 bg-vault-negative-light px-3 py-2 text-sm text-vault-negative">
              {submitError}
            </div>
          )}

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
                  <SelectItem value="bank_loan">Bank Loan</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="personal_loan">Personal Loan</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Original Amount + Interest Rate */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="original-amount">Principal Amount</Label>
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
                <Label htmlFor="interest-rate">Interest (%)</Label>
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

            {/* EMI + Frequency */}
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
                <Label>Payment Frequency</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      frequency: v as PaymentFrequency,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Projected payoff preview */}
            {formData.emiAmount &&
              formData.originalAmount &&
              parseFloat(formData.emiAmount) > 0 &&
              parseFloat(formData.originalAmount) > 0 && (
                <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
                  <p className="text-[11px] text-muted-foreground">
                    Projected payoff:{" "}
                    <span className="font-medium text-vault-info">
                      {formatFullDate(
                        calculateProjectedPayoff(
                          parseFloat(formData.originalAmount),
                          parseFloat(formData.emiAmount),
                          formData.frequency
                        ) || ""
                      )}
                    </span>
                    <span className="ml-1">
                      (
                      {Math.ceil(
                        parseFloat(formData.originalAmount) /
                          parseFloat(formData.emiAmount)
                      )}{" "}
                      payments)
                    </span>
                  </p>
                </div>
              )}

            {/* Start Date + Expected End Date */}
            <div className="grid grid-cols-2 gap-3">
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

              <div className="space-y-2">
                <Label htmlFor="end-date">
                  Expected End{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={formData.expectedEndDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      expectedEndDate: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {/* Next Due Date */}
            <div className="space-y-2">
              <Label htmlFor="next-due-date">
                Next Due Date{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="next-due-date"
                type="date"
                value={formData.nextDueDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    nextDueDate: e.target.value,
                  }))
                }
              />
            </div>

            {/* Linked Account */}
            <div className="space-y-2">
              <Label>Linked Account (for EMI deduction)</Label>
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
              {formErrors.linkedAccount && (
                <p className="text-[11px] text-vault-negative">
                  {formErrors.linkedAccount}
                </p>
              )}
            </div>

            <Separator />

            {/* Deposit to Account Toggle */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    depositToAccount: !prev.depositToAccount,
                    depositAccount: !prev.depositToAccount
                      ? prev.depositAccount
                      : "",
                  }))
                }
                className="flex w-full items-center gap-3 text-left"
              >
                <div
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
                    formData.depositToAccount
                      ? "border-primary bg-primary"
                      : "border-border bg-card"
                  )}
                >
                  {formData.depositToAccount && (
                    <Check className="size-3 text-primary-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Deposit to account
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Increase account balance by principal amount on creation
                  </p>
                </div>
              </button>

              {formData.depositToAccount && (
                <div className="space-y-2 pl-8">
                  <Label>Deposit Account</Label>
                  <Select
                    value={formData.depositAccount}
                    onValueChange={(v) =>
                      setFormData((prev) => ({ ...prev, depositAccount: v }))
                    }
                  >
                    <SelectTrigger
                      className={cn(
                        "w-full",
                        formErrors.depositAccount && "border-vault-negative"
                      )}
                    >
                      <SelectValue placeholder="Select account to receive funds" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.depositAccount && (
                    <p className="text-[11px] text-vault-negative">
                      {formErrors.depositAccount}
                    </p>
                  )}
                  <p className="text-[11px] text-vault-info">
                    A &quot;Loan Received&quot; income transaction will be
                    created automatically.
                  </p>
                </div>
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
            <Button onClick={handleCreateLiability} disabled={submitLoading}>
              {submitLoading && <Loader2 className="size-4 animate-spin" />}
              Add Liability
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 7. Make Payment Modal ── */}
      <Dialog
        open={isPaymentModalOpen}
        onOpenChange={(open) => {
          setIsPaymentModalOpen(open);
          if (!open) {
            setPaymentTarget(null);
            setPaymentErrors({});
            setSubmitError("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Make Payment</DialogTitle>
            {paymentTarget && (
              <DialogDescription>
                Record a payment toward{" "}
                <span className="font-medium text-foreground">
                  {paymentTarget.name}
                </span>
              </DialogDescription>
            )}
          </DialogHeader>

          {paymentTarget && (
            <>
              {submitError && (
                <div className="rounded-lg border border-vault-negative/30 bg-vault-negative-light px-3 py-2 text-sm text-vault-negative">
                  {submitError}
                </div>
              )}

              {/* Liability context card */}
              <div className="rounded-lg border border-border/50 bg-muted/30 px-4 py-3 space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Remaining Balance
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatRs(paymentTarget.remaining_balance)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Suggested EMI
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {paymentTarget.emi_amount > 0
                      ? formatRs(paymentTarget.emi_amount)
                      : "--"}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60 mt-1">
                  <div
                    className={cn(
                      "h-full rounded-full bg-vault-info transition-all duration-500"
                    )}
                    style={{
                      width: `${paidPercentage(paymentTarget.original_amount, paymentTarget.remaining_balance)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-4 py-1">
                {/* Principal Amount */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="payment-principal">Principal Amount</Label>
                    {paymentTarget.emi_amount > 0 && (
                      <Button
                        variant="ghost"
                        size="xs"
                        className="text-vault-info text-[11px]"
                        onClick={() =>
                          setPaymentData((prev) => ({
                            ...prev,
                            principalAmount: Math.min(
                              paymentTarget.emi_amount,
                              paymentTarget.remaining_balance
                            ).toString(),
                          }))
                        }
                      >
                        Use EMI amount
                      </Button>
                    )}
                  </div>
                  <Input
                    id="payment-principal"
                    type="number"
                    placeholder="0"
                    value={paymentData.principalAmount}
                    onChange={(e) =>
                      setPaymentData((prev) => ({
                        ...prev,
                        principalAmount: e.target.value,
                      }))
                    }
                    className={cn(
                      paymentErrors.principalAmount && "border-vault-negative"
                    )}
                  />
                  {paymentErrors.principalAmount && (
                    <p className="text-[11px] text-vault-negative">
                      {paymentErrors.principalAmount}
                    </p>
                  )}

                  {/* Preview remaining after payment */}
                  {paymentData.principalAmount &&
                    parseFloat(paymentData.principalAmount) > 0 &&
                    parseFloat(paymentData.principalAmount) <=
                      paymentTarget.remaining_balance && (
                      <p className="text-[11px] text-muted-foreground">
                        After payment:{" "}
                        <span className="font-medium text-foreground">
                          {formatRs(
                            paymentTarget.remaining_balance -
                              parseFloat(paymentData.principalAmount)
                          )}
                        </span>
                        {parseFloat(paymentData.principalAmount) ===
                          paymentTarget.remaining_balance && (
                          <span className="ml-1 font-medium text-vault-positive">
                            -- Fully paid off!
                          </span>
                        )}
                      </p>
                    )}
                </div>

                {/* Interest Amount */}
                <div className="space-y-2">
                  <Label htmlFor="payment-interest">
                    Interest Amount{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="payment-interest"
                    type="number"
                    placeholder="0"
                    value={paymentData.interestAmount}
                    onChange={(e) =>
                      setPaymentData((prev) => ({
                        ...prev,
                        interestAmount: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <Label htmlFor="payment-date">Payment Date</Label>
                  <Input
                    id="payment-date"
                    type="date"
                    value={paymentData.date}
                    onChange={(e) =>
                      setPaymentData((prev) => ({
                        ...prev,
                        date: e.target.value,
                      }))
                    }
                    className={cn(
                      paymentErrors.date && "border-vault-negative"
                    )}
                  />
                  {paymentErrors.date && (
                    <p className="text-[11px] text-vault-negative">
                      {paymentErrors.date}
                    </p>
                  )}
                </div>

                {/* Account */}
                <div className="space-y-2">
                  <Label>Deduct from Account</Label>
                  <Select
                    value={paymentData.account}
                    onValueChange={(v) =>
                      setPaymentData((prev) => ({ ...prev, account: v }))
                    }
                  >
                    <SelectTrigger
                      className={cn(
                        "w-full",
                        paymentErrors.account && "border-vault-negative"
                      )}
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
                  {paymentErrors.account && (
                    <p className="text-[11px] text-vault-negative">
                      {paymentErrors.account}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    A &quot;Loan Payment&quot; expense transaction will be
                    recorded automatically.
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="payment-description">
                    Description{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="payment-description"
                    placeholder="e.g., Feb EMI payment"
                    value={paymentData.description}
                    onChange={(e) =>
                      setPaymentData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="payment-notes">
                    Notes{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="payment-notes"
                    placeholder="Payment reference or note..."
                    value={paymentData.notes}
                    onChange={(e) =>
                      setPaymentData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsPaymentModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleMakePayment} disabled={submitLoading}>
                  {submitLoading && <Loader2 className="size-4 animate-spin" />}
                  Record Payment
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── 8. View Details Drawer ── */}
      <Sheet
        open={isDetailOpen}
        onOpenChange={(open) => {
          setIsDetailOpen(open);
          if (!open) {
            setDetailTarget(null);
            setDetailPayments([]);
          }
        }}
      >
        <SheetContent side="right" className="sm:max-w-lg w-full overflow-y-auto">
          {detailTarget && (() => {
            const Icon = typeIcons[detailTarget.type];
            const totalPaid = detailTarget.original_amount - detailTarget.remaining_balance;
            const pct = paidPercentage(detailTarget.original_amount, detailTarget.remaining_balance);
            const sortedPayments = [...detailPayments].sort(
              (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
            );

            return (
              <>
                <SheetHeader>
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl",
                        typeBadgeStyles[detailTarget.type]
                      )}
                    >
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <SheetTitle className="truncate">
                        {detailTarget.name}
                      </SheetTitle>
                      <SheetDescription className="flex items-center gap-2 mt-0.5">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] font-medium",
                            typeBadgeStyles[detailTarget.type]
                          )}
                        >
                          {typeLabels[detailTarget.type]}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px]",
                            detailTarget.status === "closed"
                              ? "bg-vault-positive-light text-vault-positive"
                              : "bg-vault-info-light text-vault-info"
                          )}
                        >
                          {detailTarget.status === "closed" && (
                            <Check className="size-2.5" />
                          )}
                          {statusLabels[detailTarget.status]}
                        </Badge>
                      </SheetDescription>
                    </div>
                  </div>
                </SheetHeader>

                {/* Summary cards */}
                <div className="px-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border bg-card p-4 space-y-1">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        Total Paid
                      </p>
                      <p className="text-xl font-semibold tabular-nums tracking-tight text-vault-positive">
                        {formatRs(totalPaid)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4 space-y-1">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        Remaining
                      </p>
                      <p className="text-xl font-semibold tabular-nums tracking-tight text-vault-negative">
                        {formatRs(detailTarget.remaining_balance)}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-700 ease-out",
                          detailTarget.status === "closed"
                            ? "bg-vault-positive"
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
                      <span>{pct}% paid off</span>
                      <span>
                        {formatRs(totalPaid)} of {formatRs(detailTarget.original_amount)}
                      </span>
                    </div>
                  </div>

                  {/* Liability details strip */}
                  <div className="rounded-xl border border-border/50 bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Interest Rate</span>
                      <span className={cn("tabular-nums font-medium", detailTarget.interest_rate >= 30 ? "text-vault-warning" : "text-foreground")}>
                        {detailTarget.interest_rate > 0 ? `${detailTarget.interest_rate}%` : "0% (Interest-free)"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">EMI Amount</span>
                      <span className="tabular-nums font-medium text-foreground">
                        {detailTarget.emi_amount > 0 ? formatRs(detailTarget.emi_amount) : "--"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Frequency</span>
                      <span className="text-foreground">{frequencyLabel(detailTarget.frequency)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Linked Account</span>
                      <span className="text-foreground">{accountName(detailTarget.linked_account_id)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Start Date</span>
                      <span className="tabular-nums text-foreground">{formatFullDate(detailTarget.start_date)}</span>
                    </div>
                    {detailTarget.expected_end_date && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Expected End</span>
                        <span className="tabular-nums text-foreground">{formatFullDate(detailTarget.expected_end_date)}</span>
                      </div>
                    )}
                    {detailTarget.notes && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Notes</span>
                        <span className="text-foreground text-right max-w-[60%]">{detailTarget.notes}</span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Payment History */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">
                          Payment History
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                          {detailPaymentsLoading
                            ? "Loading..."
                            : `${sortedPayments.length} payment${sortedPayments.length !== 1 ? "s" : ""} recorded`}
                        </p>
                      </div>
                      {detailTarget.status === "active" && (
                        <Button
                          size="xs"
                          className="text-xs"
                          onClick={() => {
                            setIsDetailOpen(false);
                            setTimeout(() => openPaymentModal(detailTarget), 200);
                          }}
                        >
                          <Banknote className="size-3" />
                          Make Payment
                        </Button>
                      )}
                    </div>

                    {detailPaymentsLoading ? (
                      <div className="flex items-center justify-center rounded-xl border border-border bg-card/50 py-10">
                        <Loader2 className="size-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : sortedPayments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-10">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
                          <Receipt className="size-5" />
                        </div>
                        <p className="mt-3 text-sm font-medium text-muted-foreground">
                          No payments yet
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Payments will appear here once recorded.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-xl border border-border bg-card">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="pl-3 text-[11px]">Date</TableHead>
                              <TableHead className="text-right text-[11px]">Amount</TableHead>
                              <TableHead className="text-[11px]">Account</TableHead>
                              <TableHead className="text-[11px]">Notes</TableHead>
                              <TableHead className="pr-3 text-[11px]">
                                <div className="flex items-center gap-1">
                                  <Hash className="size-3" />
                                  Txn ID
                                </div>
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sortedPayments.map((payment) => (
                              <TableRow
                                key={payment.id}
                                className="hover:bg-muted/30"
                              >
                                <TableCell className="pl-3 text-sm tabular-nums text-foreground">
                                  {formatFullDate(payment.payment_date)}
                                </TableCell>
                                <TableCell className="text-right text-sm font-semibold tabular-nums text-vault-positive">
                                  {formatRs(payment.principal_amount + payment.interest_amount)}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {payment.transaction.account.name}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground max-w-[120px] truncate">
                                  {payment.notes || payment.transaction.description || "--"}
                                </TableCell>
                                <TableCell className="pr-3">
                                  <span className="inline-flex items-center rounded-md bg-muted/50 px-1.5 py-0.5 text-[10px] font-mono tabular-nums text-muted-foreground">
                                    {payment.transaction_id.slice(0, 8)}...
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>

                        {/* Totals footer */}
                        <div className="border-t border-border bg-muted/20 px-3 py-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                              Total from {sortedPayments.length} payment{sortedPayments.length !== 1 ? "s" : ""}
                            </span>
                            <span className="text-sm font-semibold tabular-nums text-vault-positive">
                              {formatRs(sortedPayments.reduce((sum, p) => sum + p.principal_amount + p.interest_amount, 0))}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
