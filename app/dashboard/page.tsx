import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Building2,
  Landmark,
  Smartphone,
  Banknote,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuthenticatedClient } from "@/lib/auth";
import { AccountService } from "@/lib/services/accounts";
import { TransactionService } from "@/lib/services/transactions";
import { MonthlyChart } from "./monthly-chart";
import type { AccountWithBalance, TransactionWithDetails } from "@/types/database";

// ─── Helpers ─────────────────────────────────────────────────

function formatRs(v: number) {
  return `Rs ${v.toLocaleString("en-PK")}`;
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function getAccountIcon(type: string) {
  switch (type) {
    case "bank":
      return Building2;
    case "savings":
      return Landmark;
    case "wallet":
      return Smartphone;
    case "cash":
      return Banknote;
    default:
      return Wallet;
  }
}

function getDisplayName(user: { user_metadata?: Record<string, string>; email?: string }) {
  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "User"
  );
}

// ─── Page (Server Component) ─────────────────────────────────

export default async function DashboardPage() {
  const { user, supabase } = await getAuthenticatedClient();

  const accountService = new AccountService(supabase);
  const transactionService = new TransactionService(supabase);

  // Fetch all data in parallel
  const [accounts, monthlyTotals, currentMonth, recentTransactions] =
    await Promise.all([
      accountService.getAccountBalances(user.id),
      transactionService.getMonthlyTotals(user.id, 6),
      transactionService.getCurrentMonthTotals(user.id),
      transactionService.getRecentTransactions(user.id, 5),
    ]);

  const totalCash = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
  const netSavings = currentMonth.income - currentMonth.expenses;
  const savingsRate =
    currentMonth.income > 0
      ? Math.round((netSavings / currentMonth.income) * 100)
      : 0;

  const displayName = getDisplayName(user).split(" ")[0];

  const chartData = monthlyTotals.map((m) => {
    const [, monthNum] = m.month.split("-");
    return {
      month: m.month,
      label: MONTH_LABELS[parseInt(monthNum, 10) - 1],
      income: m.income,
      spending: m.expenses,
    };
  });

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-10">
      {/* ── 1. Financial Health ── */}
      <section>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Welcome back, {displayName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your financial snapshot
          </p>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCell label="Total Cash" value={formatRs(totalCash)} primary />
          <KpiCell label="Monthly Income" value={formatRs(currentMonth.income)} />
          <KpiCell label="Monthly Spending" value={formatRs(currentMonth.expenses)} />
          <KpiCell label="Monthly Savings" value={formatRs(netSavings)} />
          <KpiCell label="Savings Rate" value={`${savingsRate}%`} />
          <KpiCell label="Transactions" value={String(currentMonth.count)} />
        </div>
      </section>

      {/* ── 2. Monthly Performance ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Monthly Performance
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Income vs spending over the last 6 months
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-vault-chart-3" /> Income
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-vault-chart-4" /> Spending
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <MonthlyChart data={chartData} />

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-3">
            <MiniStat label="Income" value={formatRs(currentMonth.income)} />
            <MiniStat label="Spending" value={formatRs(currentMonth.expenses)} />
            <MiniStat label="Net" value={formatRs(netSavings)} highlight />
          </div>
        </div>
      </section>

      {/* ── 3. Accounts Snapshot ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Accounts</h2>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs text-muted-foreground"
            asChild
          >
            <Link href="/dashboard/accounts">
              View All <ChevronRight className="size-3" />
            </Link>
          </Button>
        </div>

        {accounts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            No accounts yet. Create your first account to start tracking.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {accounts.map((acc) => (
              <AccountCard key={acc.id} account={acc} />
            ))}
          </div>
        )}
      </section>

      {/* ── 4. Recent Transactions ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            Recent Transactions
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs text-muted-foreground"
            asChild
          >
            <Link href="/dashboard/transactions">
              View All <ChevronRight className="size-3" />
            </Link>
          </Button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            No transactions yet. Start by adding your income or expenses.
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card shadow-sm">
            {recentTransactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────

function KpiCell({
  label,
  value,
  primary = false,
}: {
  label: string;
  value: string;
  primary?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 font-semibold tabular-nums tracking-tight text-foreground ${
          primary ? "text-xl" : "text-base"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={`text-sm font-semibold tabular-nums ${
          highlight ? "text-vault-positive" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function AccountCard({ account }: { account: AccountWithBalance }) {
  const Icon = getAccountIcon(account.type);
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-card px-4 py-4 shadow-sm">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
        <Icon className="size-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {account.name}
        </p>
        <p className="text-[11px] capitalize text-muted-foreground">
          {account.type}
        </p>
      </div>
      <p className="text-sm font-semibold tabular-nums text-foreground">
        {formatRs(Number(account.balance))}
      </p>
    </div>
  );
}

function TransactionRow({ tx }: { tx: TransactionWithDetails }) {
  const isIncome = tx.type === "income";
  const amount = Number(tx.amount);

  return (
    <div className="flex items-center justify-between border-b border-border/50 px-5 py-3.5 last:border-0 transition-colors hover:bg-muted/30">
      <div className="flex items-center gap-3">
        <div
          className={`flex size-9 items-center justify-center rounded-lg ${
            isIncome
              ? "bg-vault-positive-light text-vault-positive"
              : "bg-vault-negative-light text-vault-negative"
          }`}
        >
          {isIncome ? (
            <ArrowUpRight className="size-4" />
          ) : (
            <ArrowDownRight className="size-4" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {tx.description || tx.category.name}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {tx.category.name} &middot; {tx.account.name}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p
          className={`text-sm font-semibold tabular-nums ${
            isIncome ? "text-vault-positive" : "text-foreground"
          }`}
        >
          {isIncome ? "+" : "-"}Rs {amount.toLocaleString("en-PK")}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {new Date(tx.transaction_date).toLocaleDateString("en-PK", {
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>
    </div>
  );
}
