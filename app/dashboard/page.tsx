"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  CreditCard,
  PiggyBank,
  BarChart3,
  Bell,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);
      setLoading(false);
    }
    getUser();
  }, [router]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "User";

  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <header className="sticky top-0 z-40 h-16 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="font-display font-bold text-lg tracking-tight text-foreground">
              Spendify
            </span>
            <span className="text-xs text-muted-foreground border-l border-border pl-3 font-mono">
              Dashboard
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
              <Bell className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
              <Settings className="size-4" />
            </Button>
            <ModeToggle />
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <span className="text-xs font-semibold text-primary">
                  {initials}
                </span>
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-medium text-foreground leading-none">
                  {displayName}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {user?.email}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Welcome back, {displayName.split(" ")[0]}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here&apos;s your financial overview for February 2026
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SummaryCard
            label="Total Balance"
            value="4,85,230"
            change="+12.5%"
            trend="up"
            icon={<Wallet className="size-4" />}
          />
          <SummaryCard
            label="Monthly Income"
            value="1,25,000"
            change="+8.2%"
            trend="up"
            icon={<TrendingUp className="size-4" />}
          />
          <SummaryCard
            label="Monthly Spending"
            value="67,840"
            change="-3.1%"
            trend="down"
            icon={<CreditCard className="size-4" />}
          />
          <SummaryCard
            label="Savings Goal"
            value="2,00,000"
            change="68%"
            trend="up"
            icon={<PiggyBank className="size-4" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Transactions */}
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-foreground">
                Recent Transactions
              </h2>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                View All
              </Button>
            </div>
            <div className="space-y-1">
              {[
                {
                  name: "Swiggy Order",
                  category: "Food & Dining",
                  amount: -542,
                  date: "Today",
                },
                {
                  name: "Salary Credit",
                  category: "Income",
                  amount: 125000,
                  date: "Feb 1",
                },
                {
                  name: "Amazon Purchase",
                  category: "Shopping",
                  amount: -2499,
                  date: "Jan 30",
                },
                {
                  name: "Electricity Bill",
                  category: "Utilities",
                  amount: -1850,
                  date: "Jan 28",
                },
                {
                  name: "Freelance Payment",
                  category: "Income",
                  amount: 35000,
                  date: "Jan 25",
                },
                {
                  name: "Zerodha Investment",
                  category: "Investments",
                  amount: -15000,
                  date: "Jan 24",
                },
              ].map((tx, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`size-9 rounded-lg flex items-center justify-center ${
                        tx.amount > 0
                          ? "bg-vault-positive/10 text-vault-positive"
                          : "bg-vault-negative/10 text-vault-negative"
                      }`}
                    >
                      {tx.amount > 0 ? (
                        <ArrowUpRight className="size-4" />
                      ) : (
                        <ArrowDownRight className="size-4" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {tx.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {tx.category}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-sm font-semibold tabular-nums ${
                        tx.amount > 0
                          ? "text-vault-positive"
                          : "text-foreground"
                      }`}
                    >
                      {tx.amount > 0 ? "+" : "-"}
                      <IndianRupee className="size-3 inline mb-0.5" />
                      {Math.abs(tx.amount).toLocaleString("en-IN")}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {tx.date}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Spending Breakdown */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-foreground">
                Spending Breakdown
              </h2>
              <BarChart3 className="size-4 text-muted-foreground" />
            </div>
            <div className="space-y-4">
              {[
                { category: "Food & Dining", amount: 12400, percent: 18, color: "bg-vault-chart-1" },
                { category: "Shopping", amount: 18200, percent: 27, color: "bg-vault-chart-2" },
                { category: "Utilities", amount: 8500, percent: 13, color: "bg-vault-chart-3" },
                { category: "Transport", amount: 5600, percent: 8, color: "bg-vault-chart-4" },
                { category: "Investments", amount: 15000, percent: 22, color: "bg-vault-chart-5" },
                { category: "Others", amount: 8140, percent: 12, color: "bg-muted-foreground/30" },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-foreground">{item.category}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      <IndianRupee className="size-2.5 inline mb-0.5" />
                      {item.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color} transition-all`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Spending</span>
                <span className="text-base font-semibold text-foreground tabular-nums">
                  <IndianRupee className="size-3 inline mb-0.5" />
                  67,840
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  change,
  trend,
  icon,
}: {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <div className="size-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground">
          {icon}
        </div>
      </div>
      <div className="flex items-end gap-2">
        <div className="text-2xl font-semibold text-foreground tabular-nums flex items-center">
          <IndianRupee className="size-5 mb-0.5" />
          {value}
        </div>
        <span
          className={`text-xs font-medium mb-1 ${
            trend === "up" ? "text-vault-positive" : "text-vault-negative"
          }`}
        >
          {trend === "up" ? (
            <TrendingUp className="size-3 inline mr-0.5 mb-0.5" />
          ) : (
            <TrendingDown className="size-3 inline mr-0.5 mb-0.5" />
          )}
          {change}
        </span>
      </div>
    </div>
  );
}
