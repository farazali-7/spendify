"use client";

import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Wallet,
  Landmark,
  Building2,
  Smartphone,
  Banknote,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useUser } from "./context";

// ─── Centralized Financial Data ──────────────────────────────

const monthly = {
  income: 230000,
  spending: 76640,
  interest: 4200,
};

const netSavings = monthly.income - monthly.spending - monthly.interest;
const savingsRate = Math.round((netSavings / monthly.income) * 100);
const totalCash = 324500;
const totalLiabilities = 180000;
const netPosition = totalCash - totalLiabilities;

const incomeVsSpending = [
  { month: "Sep", income: 180000, spending: 78000 },
  { month: "Oct", income: 182000, spending: 91000 },
  { month: "Nov", income: 185000, spending: 73000 },
  { month: "Dec", income: 192000, spending: 86000 },
  { month: "Jan", income: 185000, spending: 79000 },
  { month: "Feb", income: 230000, spending: 76640 },
];

const accounts = [
  { name: "Meezan Bank", balance: 185000, type: "Savings", icon: Building2 },
  { name: "HBL", balance: 92000, type: "Current", icon: Landmark },
  { name: "JazzCash", balance: 34500, type: "Wallet", icon: Smartphone },
  { name: "Cash", balance: 13000, type: "Cash", icon: Banknote },
];

const recentTransactions = [
  { name: "Salary Credit", category: "Income", amount: 185000, date: "Feb 1", account: "Meezan Bank" },
  { name: "Rent Payment", category: "Housing", amount: -25000, date: "Feb 1", account: "HBL" },
  { name: "K-Electric Bill", category: "Utilities", amount: -6500, date: "Feb 3", account: "HBL" },
  { name: "Freelance Payment", category: "Income", amount: 45000, date: "Feb 7", account: "Meezan Bank" },
  { name: "Daraz Purchase", category: "Shopping", amount: -4800, date: "Feb 8", account: "HBL" },
];

// ─── Helpers ─────────────────────────────────────────────────

function formatRs(v: number) {
  return `Rs ${v.toLocaleString("en-PK")}`;
}

// ─── Chart Tooltip ───────────────────────────────────────────

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
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      )}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground capitalize">{entry.name}:</span>
          <span className="font-semibold tabular-nums text-foreground">
            Rs {(entry.value / 1000).toFixed(0)}k
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────

export default function DashboardPage() {
  const user = useUser();

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "User";

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-10">

      {/* ── 1. Financial Health ── */}
      <section>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Welcome back, {displayName.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your financial snapshot for February 2026
          </p>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCell
            label="Net Position"
            value={formatRs(netPosition)}
            change="+18.3%"
            trend="up"
            primary
          />
          <KpiCell label="Cash" value={formatRs(totalCash)} />
          <KpiCell label="Liabilities" value={formatRs(totalLiabilities)} />
          <KpiCell
            label="Monthly Savings"
            value={formatRs(netSavings)}
            change="+6.8%"
            trend="up"
          />
          <KpiCell
            label="Savings Rate"
            value={`${savingsRate}%`}
            change="+2.1pp"
            trend="up"
          />
          <KpiCell
            label="Monthly Spending"
            value={formatRs(monthly.spending)}
            change="-3.1%"
            trend="down"
          />
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
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={incomeVsSpending}
                margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="month"
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
                <RechartsTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="income"
                  fill="var(--vault-chart-3)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  dataKey="spending"
                  fill="var(--vault-chart-4)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary strip */}
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
            <MiniStat label="Income" value={formatRs(monthly.income)} />
            <MiniStat label="Spending" value={formatRs(monthly.spending)} />
            <MiniStat label="Interest" value={formatRs(monthly.interest)} />
            <MiniStat label="Net" value={formatRs(netSavings)} highlight />
          </div>
        </div>
      </section>

      {/* ── 3. Accounts Snapshot ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Accounts</h2>
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground" asChild>
            <Link href="/dashboard/accounts">
              View All <ChevronRight className="size-3" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {accounts.map((acc) => (
            <div
              key={acc.name}
              className="flex items-center gap-3.5 rounded-2xl border border-border bg-card px-4 py-4 shadow-sm"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
                <acc.icon className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{acc.name}</p>
                <p className="text-[11px] text-muted-foreground">{acc.type}</p>
              </div>
              <p className="text-sm font-semibold tabular-nums text-foreground">
                {formatRs(acc.balance)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. Recent Transactions ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            Recent Transactions
          </h2>
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground" asChild>
            <Link href="/dashboard/transactions">
              View All <ChevronRight className="size-3" />
            </Link>
          </Button>
        </div>
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          {recentTransactions.map((tx, i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b border-border/50 px-5 py-3.5 last:border-0 transition-colors hover:bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex size-9 items-center justify-center rounded-lg ${
                    tx.amount > 0
                      ? "bg-vault-positive-light text-vault-positive"
                      : "bg-vault-negative-light text-vault-negative"
                  }`}
                >
                  {tx.amount > 0 ? (
                    <ArrowUpRight className="size-4" />
                  ) : (
                    <ArrowDownRight className="size-4" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{tx.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {tx.category} &middot; {tx.account}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={`text-sm font-semibold tabular-nums ${
                    tx.amount > 0 ? "text-vault-positive" : "text-foreground"
                  }`}
                >
                  {tx.amount > 0 ? "+" : "-"}Rs{" "}
                  {Math.abs(tx.amount).toLocaleString("en-PK")}
                </p>
                <p className="text-[11px] text-muted-foreground">{tx.date}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Components ──────────────────────────────────────────────

function KpiCell({
  label,
  value,
  change,
  trend,
  primary = false,
}: {
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down";
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
      {change && trend && (
        <div className="mt-1 flex items-center gap-1">
          {trend === "up" ? (
            <TrendingUp className="size-3 text-vault-positive" />
          ) : (
            <TrendingDown className="size-3 text-vault-negative" />
          )}
          <span
            className={`text-[11px] font-medium tabular-nums ${
              trend === "up" ? "text-vault-positive" : "text-vault-negative"
            }`}
          >
            {change}
          </span>
        </div>
      )}
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
