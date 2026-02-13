import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Zap } from "lucide-react"

export function HeroSection() {
  return (
    <section className="pt-28 pb-20 md:pt-36 md:pb-28 relative overflow-hidden">
      {/* Background atmosphere */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-vault-navy/[0.07] dark:bg-vault-navy/20 blur-[180px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-vault-gold/[0.04] dark:bg-vault-gold/[0.06] blur-[140px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Words */}
          <div>
            {/* Badge */}
            <div
              className="animate-fade-up inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-vault-positive/10 border border-vault-positive/20 text-vault-positive text-xs font-medium tracking-wide mb-8"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-vault-positive animate-pulse" />
              Financial Command Center
            </div>

            {/* Headline */}
            <h1
              className="animate-fade-up text-4xl md:text-5xl font-display font-bold tracking-tight leading-[1.1] mb-6"
              style={{ animationDelay: "0.1s" }}
            >
              Control Every Paisa.
              <br />
              Build Real Wealth.
            </h1>

            {/* Subheadline */}
            <p
              className="animate-fade-up max-w-xl text-muted-foreground text-base md:text-lg leading-relaxed mb-8"
              style={{ animationDelay: "0.2s" }}
            >
              Full visibility across your bank accounts, cash, liabilities, and
              spending patterns — so you make decisions{" "}
              <span className="text-foreground/70">like an investor</span>, not
              a spender.
            </p>

            {/* CTAs */}
            <div
              className="animate-fade-up flex flex-wrap gap-3 mb-8"
              style={{ animationDelay: "0.3s" }}
            >
              <Button className="rounded-xl shadow-sm h-11 px-6 text-[13px] font-medium gap-2">
                Start Managing Now
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                className="rounded-xl h-11 px-6 text-[13px] font-medium"
              >
                View Demo
              </Button>
            </div>

            {/* Trust Signals */}
            <div
              className="animate-fade-up flex items-center gap-6 text-xs text-muted-foreground/60"
              style={{ animationDelay: "0.4s" }}
            >
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Bank-grade security
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Multi-account sync
              </span>
            </div>
          </div>

          {/* Right — Dashboard Mockup (always dark) */}
          <div
            className="animate-slide-in-right"
            style={{ animationDelay: "0.3s" }}
          >
            <HeroDashboard />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── Dashboard Mockup (self-contained dark preview) ── */

function HeroDashboard() {
  return (
    <div className="relative">
      {/* Ambient glow */}
      <div className="absolute -inset-6 bg-gradient-to-br from-[#2d7a5f]/[0.07] via-transparent to-[#c4975a]/[0.05] blur-3xl rounded-3xl pointer-events-none" />

      <div className="relative rounded-2xl border border-black/10 dark:border-white/[0.08] bg-[#0c1018] shadow-2xl overflow-hidden animate-float" style={{ animationDelay: "1s" }}>
        {/* Browser Chrome */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.015]">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]/70" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="px-4 py-1 rounded-md bg-white/[0.04] text-[10px] text-white/20 font-mono">
              app.spendify.pk
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Net Worth Card */}
          <div className="p-4 rounded-xl bg-white/[0.025] border border-white/[0.05]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] text-white/25 uppercase tracking-[0.15em] mb-1">
                  Total Net Worth
                </p>
                <p className="text-[26px] font-semibold text-white/90 tracking-tight font-mono leading-none">
                  Rs 18,42,500
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400/80 bg-emerald-500/[0.08] px-1.5 py-0.5 rounded">
                    ↑ 2.4%
                  </span>
                  <span className="text-[10px] text-white/20">this month</span>
                </div>
              </div>
              <svg width="80" height="40" viewBox="0 0 80 40" fill="none" className="mt-1">
                <defs>
                  <linearGradient id="heroSparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4ade80" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M2,32 C10,30 15,28 20,24 C25,20 30,22 35,18 C40,14 45,16 50,12 C55,8 60,10 65,6 C70,4 75,5 78,3" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
                <path d="M2,32 C10,30 15,28 20,24 C25,20 30,22 35,18 C40,14 45,16 50,12 C55,8 60,10 65,6 C70,4 75,5 78,3 V40 H2 Z" fill="url(#heroSparkGrad)" />
              </svg>
            </div>
          </div>

          {/* Account Cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
                <p className="text-[9px] text-white/25 uppercase tracking-wider truncate">HBL Savings</p>
              </div>
              <p className="text-[13px] font-mono text-white/70">Rs 6,45,000</p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400/40" />
                <p className="text-[9px] text-white/25 uppercase tracking-wider truncate">Easypaisa</p>
              </div>
              <p className="text-[13px] font-mono text-white/70">Rs 8,400</p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400/50" />
                <p className="text-[9px] text-white/25 uppercase tracking-wider truncate">Meezan Card</p>
              </div>
              <p className="text-[13px] font-mono text-white/70">Rs 1,85,000</p>
              <span className="text-[8px] text-amber-400/60 mt-1 inline-block">Due 15d</span>
            </div>
          </div>

          {/* Recent Transactions */}
          <div>
            <p className="text-[9px] text-white/20 uppercase tracking-[0.15em] mb-2.5">Recent Transactions</p>
            <div>
              <TransactionRow initials="FP" name="Foodpanda" amount="−Rs 1,250" color="orange" negative />
              <TransactionRow initials="SA" name="Salary" amount="+Rs 1,85,000" color="emerald" positive />
              <TransactionRow initials="KE" name="K-Electric" amount="−Rs 6,500" color="yellow" negative last />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TransactionRow({ initials, name, amount, color, positive, negative, last }: {
  initials: string; name: string; amount: string; color: string; positive?: boolean; negative?: boolean; last?: boolean
}) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    orange: { bg: "bg-orange-500/[0.08]", text: "text-orange-400/60" },
    emerald: { bg: "bg-emerald-500/[0.08]", text: "text-emerald-400/60" },
    yellow: { bg: "bg-yellow-500/[0.08]", text: "text-yellow-400/60" },
  }
  const c = colorMap[color] ?? colorMap.orange

  return (
    <div className={`flex items-center justify-between py-2 ${last ? "" : "border-b border-white/[0.04]"}`}>
      <div className="flex items-center gap-2.5">
        <div className={`w-6 h-6 rounded-md ${c.bg} flex items-center justify-center`}>
          <span className={`text-[9px] ${c.text}`}>{initials}</span>
        </div>
        <span className="text-[12px] text-white/40">{name}</span>
      </div>
      <span className={`text-[12px] font-mono ${positive ? "text-emerald-400/70" : negative ? "text-red-400/70" : "text-white/50"}`}>
        {amount}
      </span>
    </div>
  )
}
