"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  ShieldCheck,
  Flame,
  PiggyBank,
  BarChart3,
  Loader2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  MonthlyTotal,
  CategoryBreakdown,
  AccountWithBalance,
  LiabilitySummary,
  ApiResponse,
} from "@/types/database";

// ─── API Helper ─────────────────────────────────────────────

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json: ApiResponse<T> = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

// ─── Types ──────────────────────────────────────────────────

type DateRange = "1m" | "3m" | "6m" | "1y";

const dateRangeMonths: Record<DateRange, number> = {
  "1m": 1,
  "3m": 3,
  "6m": 6,
  "1y": 12,
};

// ─── Helpers ────────────────────────────────────────────────

function formatRs(v: number) {
  return `Rs ${v.toLocaleString("en-PK")}`;
}

function formatCompact(v: number) {
  if (v >= 100000) return `${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return v.toString();
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("en-PK", { month: "short" });
}

const defaultCategoryColors = [
  "var(--vault-chart-1)",
  "var(--vault-chart-2)",
  "var(--vault-chart-3)",
  "var(--vault-chart-4)",
  "var(--vault-chart-5)",
  "var(--vault-chart-6)",
  "var(--vault-chart-7)",
  "var(--vault-chart-8)",
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
          <span className="text-muted-foreground capitalize">
            {entry.name}:
          </span>
          <span className="font-semibold tabular-nums text-foreground">
            {formatRs(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function PieTooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    payload: { color: string; percent: number };
  }>;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
      <div className="flex items-center gap-2 text-sm">
        <span
          className="size-2 rounded-full"
          style={{ backgroundColor: entry.payload.color }}
        />
        <span className="font-medium text-foreground">{entry.name}</span>
      </div>
      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="font-semibold tabular-nums text-foreground">
          {formatRs(entry.value)}
        </span>
        <span>{(entry.payload.percent * 100).toFixed(1)}%</span>
      </div>
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 py-16">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
        <BarChart3 className="size-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">
        No Data to Analyze
      </h3>
      <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
        Start recording transactions to unlock financial insights and trend
        analysis.
      </p>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("6m");
  const [loading, setLoading] = useState(true);

  // ── Data state ──
  const [monthlyTotals, setMonthlyTotals] = useState<MonthlyTotal[]>([]);
  const [categorySpending, setCategorySpending] = useState<CategoryBreakdown[]>([]);
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [liabilities, setLiabilities] = useState<LiabilitySummary[]>([]);

  // ── Data fetching ──
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const months = dateRangeMonths[dateRange];
      const [monthly, categories, accs, liabs] = await Promise.all([
        apiFetch<MonthlyTotal[]>(`/api/analytics/monthly?months=${months}`).catch(() => [] as MonthlyTotal[]),
        apiFetch<CategoryBreakdown[]>(`/api/analytics/categories?months=${months}`).catch(() => [] as CategoryBreakdown[]),
        apiFetch<AccountWithBalance[]>("/api/accounts").catch(() => [] as AccountWithBalance[]),
        apiFetch<LiabilitySummary[]>("/api/liabilities").catch(() => [] as LiabilitySummary[]),
      ]);
      setMonthlyTotals(monthly);
      setCategorySpending(categories);
      setAccounts(accs);
      setLiabilities(liabs);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Derived data ──
  const chartData = useMemo(
    () =>
      monthlyTotals.map((m) => ({
        month: formatMonth(m.month),
        income: m.income,
        expenses: m.expenses,
        savings: m.income - m.expenses,
      })),
    [monthlyTotals]
  );

  const periodIncome = chartData.reduce((sum, d) => sum + d.income, 0);
  const periodExpenses = chartData.reduce((sum, d) => sum + d.expenses, 0);
  const periodSavings = periodIncome - periodExpenses;
  const savingsRate = periodIncome > 0 ? Math.round((periodSavings / periodIncome) * 100) : 0;

  // Net worth = total account balances - total liability remaining
  const totalAssets = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
  const activeLiabilities = liabilities.filter((l) => l.status === "active");
  const totalLiabilityRemaining = activeLiabilities.reduce((sum, l) => sum + Number(l.remaining_balance), 0);
  const netWorth = totalAssets - totalLiabilityRemaining;

  // Debt-to-income ratio (monthly EMI / monthly income)
  const totalMonthlyEmi = activeLiabilities.reduce((sum, l) => sum + Number(l.emi_amount), 0);
  const latestMonthIncome = chartData.length > 0 ? chartData[chartData.length - 1].income : 0;
  const debtToIncomeRatio = latestMonthIncome > 0 ? ((totalMonthlyEmi / latestMonthIncome) * 100).toFixed(1) : "0";

  // Monthly burn rate
  const monthlyBurnRate = chartData.length > 0 ? chartData[chartData.length - 1].expenses : 0;

  // Emergency fund coverage
  const emergencyFundMonths = monthlyBurnRate > 0 ? (totalAssets / monthlyBurnRate).toFixed(1) : "0";

  // Category data
  const totalCategorySpending = categorySpending.reduce((sum, c) => sum + c.total, 0);

  const hasData = monthlyTotals.length > 0 || categorySpending.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-10">
      {/* ── 1. Page Header + Filters ── */}
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Analytics
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Understand patterns. Optimize financial behavior.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">This Month</SelectItem>
                <SelectItem value="3m">3 Months</SelectItem>
                <SelectItem value="6m">6 Months</SelectItem>
                <SelectItem value="1y">12 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {!hasData ? (
        <EmptyState />
      ) : (
        <>
          {/* ── 2. KPI Overview ── */}
          <section>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
              {/* Total Income */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Income</p>
                  <ArrowUpRight className="size-4 text-vault-positive" />
                </div>
                <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-foreground">
                  {formatRs(periodIncome)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {dateRange === "1m" ? "This month" : `Last ${dateRangeMonths[dateRange]} months`}
                </p>
              </div>

              {/* Total Expenses */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Expenses</p>
                  <ArrowDownRight className="size-4 text-vault-negative" />
                </div>
                <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-foreground">
                  {formatRs(periodExpenses)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {dateRange === "1m" ? "This month" : `Last ${dateRangeMonths[dateRange]} months`}
                </p>
              </div>

              {/* Net Savings */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Net Savings</p>
                  <PiggyBank className="size-4 text-vault-positive" />
                </div>
                <p className={cn(
                  "mt-1.5 text-xl font-semibold tabular-nums tracking-tight",
                  periodSavings >= 0 ? "text-vault-positive" : "text-vault-negative"
                )}>
                  {formatRs(periodSavings)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">Income minus expenses</p>
              </div>

              {/* Savings Rate */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Savings Rate</p>
                  <Wallet className="size-4 text-vault-info" />
                </div>
                <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-foreground">
                  {savingsRate}%
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {savingsRate >= 30 ? "Excellent" : savingsRate >= 15 ? "Good" : "Needs improvement"}
                </p>
              </div>

              {/* Net Worth */}
              <div className="col-span-2 rounded-2xl border border-border bg-card p-5 shadow-sm md:col-span-1">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Net Worth</p>
                  <ShieldCheck className="size-4 text-vault-chart-2" />
                </div>
                <p className={cn(
                  "mt-1.5 text-xl font-semibold tabular-nums tracking-tight",
                  netWorth >= 0 ? "text-foreground" : "text-vault-negative"
                )}>
                  {formatRs(netWorth)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">Assets minus liabilities</p>
              </div>
            </div>
          </section>

          {/* ── 3. Income vs Expense Chart ── */}
          {chartData.length > 0 && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Income vs Expenses</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Monthly comparison over selected period</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-vault-chart-3" /> Income
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-vault-chart-4" /> Expenses
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${formatCompact(v)}`} />
                      <RechartsTooltip content={<ChartTooltipContent />} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
                      <Bar dataKey="income" fill="var(--vault-chart-3)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="expenses" fill="var(--vault-chart-4)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {chartData.length > 1 && (
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Avg Income</p>
                      <p className="text-sm font-semibold tabular-nums text-foreground">
                        {formatRs(Math.round(periodIncome / chartData.length))}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Avg Expenses</p>
                      <p className="text-sm font-semibold tabular-nums text-foreground">
                        {formatRs(Math.round(periodExpenses / chartData.length))}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Best Month</p>
                      <p className="text-sm font-semibold tabular-nums text-vault-positive">
                        {chartData.reduce((best, d) => (d.savings > best.savings ? d : best)).month}{" "}
                        (+{formatCompact(chartData.reduce((best, d) => (d.savings > best.savings ? d : best)).savings)})
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Worst Month</p>
                      <p className="text-sm font-semibold tabular-nums text-vault-negative">
                        {chartData.reduce((worst, d) => (d.savings < worst.savings ? d : worst)).month}{" "}
                        ({formatCompact(chartData.reduce((worst, d) => (d.savings < worst.savings ? d : worst)).savings)})
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── 4. Category Breakdown + Savings Trend ── */}
          <section>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
              {/* Category Breakdown */}
              <div className="xl:col-span-2">
                <div className="mb-4">
                  <h2 className="text-base font-semibold text-foreground">Spending by Category</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Where your money goes this period</p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  {categorySpending.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                      <BarChart3 className="size-8" />
                      <p className="mt-2 text-sm">No spending data</p>
                    </div>
                  ) : (
                    <>
                      <div className="h-[240px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categorySpending.map((c) => ({
                                name: c.name,
                                value: c.total,
                                color: c.color || defaultCategoryColors[categorySpending.indexOf(c) % defaultCategoryColors.length],
                              }))}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={95}
                              paddingAngle={2}
                              dataKey="value"
                              stroke="none"
                            >
                              {categorySpending.map((c, i) => (
                                <Cell key={i} fill={c.color || defaultCategoryColors[i % defaultCategoryColors.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip content={<PieTooltipContent />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="mt-3 space-y-2 border-t border-border pt-4">
                        {categorySpending.map((cat, i) => (
                          <div key={cat.category_id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span
                                className="size-2 shrink-0 rounded-full"
                                style={{ backgroundColor: cat.color || defaultCategoryColors[i % defaultCategoryColors.length] }}
                              />
                              <span className="text-muted-foreground">{cat.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="tabular-nums text-foreground font-medium">{formatRs(cat.total)}</span>
                              <span className="w-10 text-right tabular-nums text-[11px] text-muted-foreground">
                                {totalCategorySpending > 0 ? ((cat.total / totalCategorySpending) * 100).toFixed(0) : 0}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Savings Trend */}
              <div className="xl:col-span-3">
                <div className="mb-4">
                  <h2 className="text-base font-semibold text-foreground">Savings Trend</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Monthly savings progression over time</p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  {chartData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                      <BarChart3 className="size-8" />
                      <p className="mt-2 text-sm">No data yet</p>
                    </div>
                  ) : (
                    <>
                      <div className="h-[240px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--vault-chart-3)" stopOpacity={0.25} />
                                <stop offset="100%" stopColor="var(--vault-chart-3)" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${formatCompact(v)}`} />
                            <RechartsTooltip content={<ChartTooltipContent />} cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }} />
                            <Area type="monotone" dataKey="savings" stroke="var(--vault-chart-3)" strokeWidth={2} fill="url(#savingsGrad)" name="savings" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="mt-4 flex items-center gap-5 border-t border-border pt-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-vault-chart-3" /> Monthly Savings
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ── 5. Financial Health Ratios ── */}
          <section>
            <div className="mb-4">
              <h2 className="text-base font-semibold text-foreground">Financial Health Ratios</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Key metrics measuring your financial discipline and resilience</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {/* Savings Rate */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Savings Rate</p>
                  <div className="flex size-8 items-center justify-center rounded-lg bg-vault-positive-light">
                    <PiggyBank className="size-4 text-vault-positive" />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">{savingsRate}%</p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", savingsRate >= 30 ? "bg-vault-positive" : savingsRate >= 15 ? "bg-vault-warning" : "bg-vault-negative")}
                    style={{ width: `${Math.min(Math.max(savingsRate, 0), 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {savingsRate >= 30 ? "Excellent — above 30% target" : savingsRate >= 15 ? "Good — aim for 30%+" : "Below target — reduce spending"}
                </p>
              </div>

              {/* Debt-to-Income */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Debt-to-Income</p>
                  <div className={cn("flex size-8 items-center justify-center rounded-lg", parseFloat(debtToIncomeRatio) <= 36 ? "bg-vault-positive-light" : "bg-vault-negative-light")}>
                    <TrendingDown className={cn("size-4", parseFloat(debtToIncomeRatio) <= 36 ? "text-vault-positive" : "text-vault-negative")} />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">{debtToIncomeRatio}%</p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", parseFloat(debtToIncomeRatio) <= 36 ? "bg-vault-positive" : parseFloat(debtToIncomeRatio) <= 50 ? "bg-vault-warning" : "bg-vault-negative")}
                    style={{ width: `${Math.min(parseFloat(debtToIncomeRatio), 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {parseFloat(debtToIncomeRatio) <= 36 ? "Healthy — within safe range" : parseFloat(debtToIncomeRatio) <= 50 ? "Caution — reduce obligations" : "Critical — debt exceeds safe limits"}
                </p>
              </div>

              {/* Monthly Burn */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Monthly Burn</p>
                  <div className="flex size-8 items-center justify-center rounded-lg bg-vault-warning-light">
                    <Flame className="size-4 text-vault-warning" />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">{formatRs(monthlyBurnRate)}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">Latest month total expenses</p>
              </div>

              {/* Emergency Fund */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Emergency Fund</p>
                  <div className={cn("flex size-8 items-center justify-center rounded-lg", parseFloat(emergencyFundMonths) >= 3 ? "bg-vault-positive-light" : "bg-vault-negative-light")}>
                    <ShieldCheck className={cn("size-4", parseFloat(emergencyFundMonths) >= 3 ? "text-vault-positive" : "text-vault-negative")} />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                  {emergencyFundMonths} <span className="text-sm font-normal text-muted-foreground">months</span>
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", parseFloat(emergencyFundMonths) >= 6 ? "bg-vault-positive" : parseFloat(emergencyFundMonths) >= 3 ? "bg-vault-warning" : "bg-vault-negative")}
                    style={{ width: `${Math.min((parseFloat(emergencyFundMonths) / 6) * 100, 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {parseFloat(emergencyFundMonths) >= 6 ? "Strong — 6+ month runway" : parseFloat(emergencyFundMonths) >= 3 ? "Adequate — target 6 months" : "Low — build reserves urgently"}
                </p>
              </div>
            </div>
          </section>

          {/* ── 6. Monthly Savings Breakdown ── */}
          {chartData.length > 1 && (
            <section>
              <div className="mb-4">
                <h2 className="text-base font-semibold text-foreground">Monthly Savings Performance</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Net savings per month with income and expense context</p>
              </div>

              <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="grid grid-cols-5 gap-0 border-b border-border px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  <span>Month</span>
                  <span className="text-right">Income</span>
                  <span className="text-right">Expenses</span>
                  <span className="text-right">Savings</span>
                  <span className="text-right">Rate</span>
                </div>
                {chartData.map((row, i) => {
                  const rate = row.income > 0 ? Math.round(((row.income - row.expenses) / row.income) * 100) : 0;
                  return (
                    <div key={i} className="grid grid-cols-5 gap-0 border-b border-border/50 px-5 py-3 last:border-0 transition-colors hover:bg-muted/30">
                      <span className="text-sm font-medium text-foreground">{row.month}</span>
                      <span className="text-right text-sm tabular-nums text-foreground">{formatRs(row.income)}</span>
                      <span className="text-right text-sm tabular-nums text-vault-negative">{formatRs(row.expenses)}</span>
                      <span className={cn("text-right text-sm font-semibold tabular-nums", row.savings >= 0 ? "text-vault-positive" : "text-vault-negative")}>
                        {formatRs(row.savings)}
                      </span>
                      <span className="text-right">
                        <span className={cn(
                          "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
                          rate >= 30 ? "bg-vault-positive-light text-vault-positive" : rate >= 15 ? "bg-vault-warning-light text-vault-warning" : "bg-vault-negative-light text-vault-negative"
                        )}>
                          {rate}%
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
