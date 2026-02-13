"use client";

import { useState, useMemo } from "react";
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

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────

type DateRange = "this-month" | "30d" | "3m" | "6m" | "1y";

// ─── Mock Data ──────────────────────────────────────────────

const accountsList = ["All Accounts", "Meezan Bank", "HBL", "JazzCash", "Cash"];

// Monthly financial data — 12 months of history
const monthlyData = [
  { month: "Mar", income: 165000, expenses: 72000, savings: 93000, netWorth: 260000 },
  { month: "Apr", income: 168000, expenses: 81000, savings: 87000, netWorth: 295000 },
  { month: "May", income: 172000, expenses: 69000, savings: 103000, netWorth: 340000 },
  { month: "Jun", income: 175000, expenses: 88000, savings: 87000, netWorth: 370000 },
  { month: "Jul", income: 178000, expenses: 74000, savings: 104000, netWorth: 415000 },
  { month: "Aug", income: 180000, expenses: 78000, savings: 102000, netWorth: 460000 },
  { month: "Sep", income: 180000, expenses: 78000, savings: 102000, netWorth: 505000 },
  { month: "Oct", income: 182000, expenses: 91000, savings: 91000, netWorth: 538000 },
  { month: "Nov", income: 185000, expenses: 73000, savings: 112000, netWorth: 590000 },
  { month: "Dec", income: 192000, expenses: 86000, savings: 106000, netWorth: 635000 },
  { month: "Jan", income: 185000, expenses: 79000, savings: 106000, netWorth: 680000 },
  { month: "Feb", income: 230000, expenses: 76640, savings: 153360, netWorth: 770000 },
];

// Category spending breakdown — current period
const categorySpending = [
  { name: "Housing", value: 25000, color: "var(--vault-chart-1)" },
  { name: "Utilities", value: 9300, color: "var(--vault-chart-2)" },
  { name: "Groceries", value: 8500, color: "var(--vault-chart-3)" },
  { name: "Transport", value: 5650, color: "var(--vault-chart-4)" },
  { name: "Shopping", value: 4800, color: "var(--vault-chart-5)" },
  { name: "Food & Dining", value: 4200, color: "var(--vault-chart-6)" },
  { name: "Subscriptions", value: 4800, color: "var(--vault-chart-7)" },
  { name: "Insurance", value: 12000, color: "var(--vault-chart-8)" },
  { name: "Healthcare", value: 3000, color: "var(--vault-chart-1)" },
];

// Financial constants for ratio calculations
const totalLiabilities = 3557300;
const totalAssets = 4327300;
const monthlyEmi = 114000;
const emergencyFund = 185000; // Meezan Bank balance

// ─── Helpers ────────────────────────────────────────────────

function formatRs(v: number) {
  return `Rs ${v.toLocaleString("en-PK")}`;
}

function formatCompact(v: number) {
  if (v >= 100000) return `${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return v.toString();
}

function getDataForRange(range: DateRange) {
  switch (range) {
    case "this-month":
      return monthlyData.slice(-1);
    case "30d":
      return monthlyData.slice(-1);
    case "3m":
      return monthlyData.slice(-3);
    case "6m":
      return monthlyData.slice(-6);
    case "1y":
      return monthlyData;
  }
}

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
        <span>
          {(entry.payload.percent * 100).toFixed(1)}%
        </span>
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
  const [accountFilter, setAccountFilter] = useState("All Accounts");
  const [typeFilter, setTypeFilter] = useState<"All" | "Income" | "Expense">(
    "All"
  );

  // ── Derived data ──
  const chartData = useMemo(() => getDataForRange(dateRange), [dateRange]);

  const periodIncome = chartData.reduce((sum, d) => sum + d.income, 0);
  const periodExpenses = chartData.reduce((sum, d) => sum + d.expenses, 0);
  const periodSavings = periodIncome - periodExpenses;
  const savingsRate =
    periodIncome > 0
      ? Math.round((periodSavings / periodIncome) * 100)
      : 0;
  const currentNetWorth = monthlyData[monthlyData.length - 1].netWorth;

  // Financial ratios
  const debtToIncomeRatio =
    monthlyData[monthlyData.length - 1].income > 0
      ? (
          (monthlyEmi / monthlyData[monthlyData.length - 1].income) *
          100
        ).toFixed(1)
      : "0";
  const monthlyBurnRate = monthlyData[monthlyData.length - 1].expenses;
  const emergencyFundMonths =
    monthlyBurnRate > 0
      ? (emergencyFund / monthlyBurnRate).toFixed(1)
      : "0";

  const totalCategorySpending = categorySpending.reduce(
    (sum, c) => sum + c.value,
    0
  );

  const hasData = monthlyData.length > 0;

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
            {/* Date Range */}
            <Select
              value={dateRange}
              onValueChange={(v) => setDateRange(v as DateRange)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="3m">3 Months</SelectItem>
                <SelectItem value="6m">6 Months</SelectItem>
                <SelectItem value="1y">12 Months</SelectItem>
              </SelectContent>
            </Select>

            {/* Account Filter */}
            <Select
              value={accountFilter}
              onValueChange={(v) => setAccountFilter(v)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accountsList.map((acc) => (
                  <SelectItem key={acc} value={acc}>
                    {acc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select
              value={typeFilter}
              onValueChange={(v) =>
                setTypeFilter(v as "All" | "Income" | "Expense")
              }
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Income">Income</SelectItem>
                <SelectItem value="Expense">Expense</SelectItem>
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
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Income
                  </p>
                  <ArrowUpRight className="size-4 text-vault-positive" />
                </div>
                <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-foreground">
                  {formatRs(periodIncome)}
                </p>
                <div className="mt-1 flex items-center gap-1">
                  <TrendingUp className="size-3 text-vault-positive" />
                  <span className="text-[11px] font-medium tabular-nums text-vault-positive">
                    +12.4%
                  </span>
                </div>
              </div>

              {/* Total Expenses */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Expenses
                  </p>
                  <ArrowDownRight className="size-4 text-vault-negative" />
                </div>
                <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-foreground">
                  {formatRs(periodExpenses)}
                </p>
                <div className="mt-1 flex items-center gap-1">
                  <TrendingDown className="size-3 text-vault-negative" />
                  <span className="text-[11px] font-medium tabular-nums text-vault-negative">
                    -3.1%
                  </span>
                </div>
              </div>

              {/* Net Savings */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Net Savings
                  </p>
                  <PiggyBank className="size-4 text-vault-positive" />
                </div>
                <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-vault-positive">
                  {formatRs(periodSavings)}
                </p>
                <div className="mt-1 flex items-center gap-1">
                  <TrendingUp className="size-3 text-vault-positive" />
                  <span className="text-[11px] font-medium tabular-nums text-vault-positive">
                    +18.7%
                  </span>
                </div>
              </div>

              {/* Savings Rate */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Savings Rate
                  </p>
                  <Wallet className="size-4 text-vault-info" />
                </div>
                <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-foreground">
                  {savingsRate}%
                </p>
                <div className="mt-1 flex items-center gap-1">
                  <TrendingUp className="size-3 text-vault-positive" />
                  <span className="text-[11px] font-medium tabular-nums text-vault-positive">
                    +2.1pp
                  </span>
                </div>
              </div>

              {/* Net Worth */}
              <div className="col-span-2 rounded-2xl border border-border bg-card p-5 shadow-sm md:col-span-1">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Net Worth
                  </p>
                  <ShieldCheck className="size-4 text-vault-chart-2" />
                </div>
                <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-foreground">
                  {formatRs(currentNetWorth)}
                </p>
                <div className="mt-1 flex items-center gap-1">
                  <TrendingUp className="size-3 text-vault-positive" />
                  <span className="text-[11px] font-medium tabular-nums text-vault-positive">
                    +13.2%
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ── 3. Income vs Expense Chart ── */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Income vs Expenses
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Monthly comparison over selected period
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-vault-chart-3" />{" "}
                  Income
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-vault-chart-4" />{" "}
                  Expenses
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                    barGap={4}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      vertical={false}
                    />
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
                      tickFormatter={(v) => `${formatCompact(v)}`}
                    />
                    <RechartsTooltip
                      content={<ChartTooltipContent />}
                      cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                    />
                    <Bar
                      dataKey="income"
                      fill="var(--vault-chart-3)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={32}
                    />
                    <Bar
                      dataKey="expenses"
                      fill="var(--vault-chart-4)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Summary strip */}
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
                <div>
                  <p className="text-[11px] text-muted-foreground">
                    Avg Income
                  </p>
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    {formatRs(
                      Math.round(periodIncome / chartData.length)
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">
                    Avg Expenses
                  </p>
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    {formatRs(
                      Math.round(periodExpenses / chartData.length)
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">
                    Best Month
                  </p>
                  <p className="text-sm font-semibold tabular-nums text-vault-positive">
                    {
                      chartData.reduce((best, d) =>
                        d.savings > best.savings ? d : best
                      ).month
                    }{" "}
                    (+
                    {formatCompact(
                      chartData.reduce((best, d) =>
                        d.savings > best.savings ? d : best
                      ).savings
                    )}
                    )
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">
                    Worst Month
                  </p>
                  <p className="text-sm font-semibold tabular-nums text-vault-negative">
                    {
                      chartData.reduce((worst, d) =>
                        d.savings < worst.savings ? d : worst
                      ).month
                    }{" "}
                    (+
                    {formatCompact(
                      chartData.reduce((worst, d) =>
                        d.savings < worst.savings ? d : worst
                      ).savings
                    )}
                    )
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ── 4. Category Breakdown + Savings Trend — Two Column ── */}
          <section>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
              {/* Category Breakdown — 2 cols */}
              <div className="xl:col-span-2">
                <div className="mb-4">
                  <h2 className="text-base font-semibold text-foreground">
                    Spending by Category
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Where your money goes this month
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categorySpending}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={95}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {categorySpending.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip content={<PieTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Category legend */}
                  <div className="mt-3 space-y-2 border-t border-border pt-4">
                    {categorySpending.map((cat) => (
                      <div
                        key={cat.name}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="text-muted-foreground">
                            {cat.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="tabular-nums text-foreground font-medium">
                            {formatRs(cat.value)}
                          </span>
                          <span className="w-10 text-right tabular-nums text-[11px] text-muted-foreground">
                            {((cat.value / totalCategorySpending) * 100).toFixed(
                              0
                            )}
                            %
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Savings & Net Worth Trend — 3 cols */}
              <div className="xl:col-span-3">
                <div className="mb-4">
                  <h2 className="text-base font-semibold text-foreground">
                    Net Worth Trend
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Cumulative wealth progression over time
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={chartData}
                        margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="netWorthGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="var(--vault-chart-2)"
                              stopOpacity={0.25}
                            />
                            <stop
                              offset="100%"
                              stopColor="var(--vault-chart-2)"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="savingsGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="var(--vault-chart-3)"
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="100%"
                              stopColor="var(--vault-chart-3)"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--border)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="month"
                          tick={{
                            fontSize: 11,
                            fill: "var(--muted-foreground)",
                          }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{
                            fontSize: 11,
                            fill: "var(--muted-foreground)",
                          }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `${formatCompact(v)}`}
                        />
                        <RechartsTooltip
                          content={<ChartTooltipContent />}
                          cursor={{
                            stroke: "var(--muted-foreground)",
                            strokeDasharray: "3 3",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="netWorth"
                          stroke="var(--vault-chart-2)"
                          strokeWidth={2}
                          fill="url(#netWorthGrad)"
                          name="net worth"
                        />
                        <Area
                          type="monotone"
                          dataKey="savings"
                          stroke="var(--vault-chart-3)"
                          strokeWidth={2}
                          fill="url(#savingsGrad)"
                          name="savings"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend */}
                  <div className="mt-4 flex items-center gap-5 border-t border-border pt-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-vault-chart-2" />{" "}
                      Net Worth
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-vault-chart-3" />{" "}
                      Monthly Savings
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── 5. Advanced Financial Ratios ── */}
          <section>
            <div className="mb-4">
              <h2 className="text-base font-semibold text-foreground">
                Financial Health Ratios
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Key metrics measuring your financial discipline and resilience
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {/* Savings Rate */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Savings Rate
                  </p>
                  <div className="flex size-8 items-center justify-center rounded-lg bg-vault-positive-light">
                    <PiggyBank className="size-4 text-vault-positive" />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                  {savingsRate}%
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      savingsRate >= 30
                        ? "bg-vault-positive"
                        : savingsRate >= 15
                          ? "bg-vault-warning"
                          : "bg-vault-negative"
                    )}
                    style={{ width: `${Math.min(savingsRate, 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {savingsRate >= 30
                    ? "Excellent — above 30% target"
                    : savingsRate >= 15
                      ? "Good — aim for 30%+"
                      : "Below target — reduce spending"}
                </p>
              </div>

              {/* Debt-to-Income Ratio */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Debt-to-Income
                  </p>
                  <div
                    className={cn(
                      "flex size-8 items-center justify-center rounded-lg",
                      parseFloat(debtToIncomeRatio) <= 36
                        ? "bg-vault-positive-light"
                        : "bg-vault-negative-light"
                    )}
                  >
                    <TrendingDown
                      className={cn(
                        "size-4",
                        parseFloat(debtToIncomeRatio) <= 36
                          ? "text-vault-positive"
                          : "text-vault-negative"
                      )}
                    />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                  {debtToIncomeRatio}%
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      parseFloat(debtToIncomeRatio) <= 36
                        ? "bg-vault-positive"
                        : parseFloat(debtToIncomeRatio) <= 50
                          ? "bg-vault-warning"
                          : "bg-vault-negative"
                    )}
                    style={{
                      width: `${Math.min(parseFloat(debtToIncomeRatio), 100)}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {parseFloat(debtToIncomeRatio) <= 36
                    ? "Healthy — within safe range"
                    : parseFloat(debtToIncomeRatio) <= 50
                      ? "Caution — reduce obligations"
                      : "Critical — debt exceeds safe limits"}
                </p>
              </div>

              {/* Monthly Burn Rate */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Monthly Burn
                  </p>
                  <div className="flex size-8 items-center justify-center rounded-lg bg-vault-warning-light">
                    <Flame className="size-4 text-vault-warning" />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                  {formatRs(monthlyBurnRate)}
                </p>
                <div className="mt-2 flex items-center gap-1">
                  <TrendingDown className="size-3 text-vault-positive" />
                  <span className="text-[11px] font-medium tabular-nums text-vault-positive">
                    -3.1%
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    vs last month
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  All expenses including EMIs
                </p>
              </div>

              {/* Emergency Fund Coverage */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Emergency Fund
                  </p>
                  <div
                    className={cn(
                      "flex size-8 items-center justify-center rounded-lg",
                      parseFloat(emergencyFundMonths) >= 3
                        ? "bg-vault-positive-light"
                        : "bg-vault-negative-light"
                    )}
                  >
                    <ShieldCheck
                      className={cn(
                        "size-4",
                        parseFloat(emergencyFundMonths) >= 3
                          ? "text-vault-positive"
                          : "text-vault-negative"
                      )}
                    />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                  {emergencyFundMonths}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    months
                  </span>
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      parseFloat(emergencyFundMonths) >= 6
                        ? "bg-vault-positive"
                        : parseFloat(emergencyFundMonths) >= 3
                          ? "bg-vault-warning"
                          : "bg-vault-negative"
                    )}
                    style={{
                      width: `${Math.min((parseFloat(emergencyFundMonths) / 6) * 100, 100)}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {parseFloat(emergencyFundMonths) >= 6
                    ? "Strong — 6+ month runway"
                    : parseFloat(emergencyFundMonths) >= 3
                      ? "Adequate — target 6 months"
                      : "Low — build reserves urgently"}
                </p>
              </div>
            </div>
          </section>

          {/* ── 6. Monthly Savings Breakdown ── */}
          <section>
            <div className="mb-4">
              <h2 className="text-base font-semibold text-foreground">
                Monthly Savings Performance
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Net savings per month with income and expense context
              </p>
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
                const rate = Math.round(
                  ((row.income - row.expenses) / row.income) * 100
                );
                return (
                  <div
                    key={i}
                    className="grid grid-cols-5 gap-0 border-b border-border/50 px-5 py-3 last:border-0 transition-colors hover:bg-muted/30"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {row.month}
                    </span>
                    <span className="text-right text-sm tabular-nums text-foreground">
                      {formatRs(row.income)}
                    </span>
                    <span className="text-right text-sm tabular-nums text-vault-negative">
                      {formatRs(row.expenses)}
                    </span>
                    <span className="text-right text-sm font-semibold tabular-nums text-vault-positive">
                      {formatRs(row.income - row.expenses)}
                    </span>
                    <span className="text-right">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
                          rate >= 30
                            ? "bg-vault-positive-light text-vault-positive"
                            : rate >= 15
                              ? "bg-vault-warning-light text-vault-warning"
                              : "bg-vault-negative-light text-vault-negative"
                        )}
                      >
                        {rate}%
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
