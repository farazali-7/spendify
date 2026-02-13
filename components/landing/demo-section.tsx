const barHeights = [65, 72, 58, 80, 70, 85, 92, 96, 60, 55, 48, 42]
const months = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"]

export function DemoSection() {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight mb-3">
            Everything. One Screen.
          </h2>
          <p className="text-muted-foreground text-lg">
            The dashboard you wish your bank gave you.
          </p>
        </div>

        {/* Dashboard Mockup (always dark — it's an app preview) */}
        <div className="relative max-w-5xl mx-auto">
          {/* Glow */}
          <div className="absolute -inset-8 bg-vault-positive/[0.03] dark:bg-vault-positive/[0.05] blur-[100px] rounded-3xl pointer-events-none" />

          <div className="relative rounded-2xl border border-black/10 dark:border-white/[0.07] bg-[#0c1018] shadow-2xl overflow-hidden">
            {/* Browser Chrome */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.06] bg-white/[0.015]">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]/60" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-10 py-1.5 rounded-lg bg-white/[0.04] text-[11px] text-white/20 font-mono">
                  app.spendify.pk/dashboard
                </div>
              </div>
            </div>

            {/* Dashboard Content */}
            <div className="p-4 md:p-6 space-y-4">
              {/* Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Assets" value="Rs 22,45,000" change="+4.2%" positive sparkUp />
                <StatCard label="Liabilities" value="Rs 3,20,000" change="−Rs 12K" positive sparkDown />
                <StatCard label="Net Worth" value="Rs 19,25,000" change="+Rs 85K" positive sparkUp />
                <StatCard label="This Month" value="Rs 78,640" sub="spent" />
              </div>

              {/* Main Grid */}
              <div className="grid md:grid-cols-3 gap-4">
                {/* Chart — 2/3 */}
                <div className="md:col-span-2 p-5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-[11px] text-white/25 uppercase tracking-[0.15em]">Spending Trend</p>
                      <p className="text-[10px] text-white/15 mt-0.5">6 Months · Bi-weekly</p>
                    </div>
                    <div className="flex gap-1">
                      <span className="px-2.5 py-1 rounded text-[9px] text-white/20 bg-white/[0.03] cursor-pointer hover:bg-white/[0.06] transition-colors">1M</span>
                      <span className="px-2.5 py-1 rounded text-[9px] text-white/20 bg-white/[0.03] cursor-pointer hover:bg-white/[0.06] transition-colors">3M</span>
                      <span className="px-2.5 py-1 rounded text-[9px] text-white/40 bg-white/[0.07]">6M</span>
                    </div>
                  </div>

                  {/* Bar Chart */}
                  <div className="flex items-end gap-[5px] h-36 mb-3">
                    {barHeights.map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-[2px] transition-all duration-300 hover:opacity-80"
                        style={{
                          height: `${h}%`,
                          background: `linear-gradient(to top, rgba(74, 127, 165, 0.35), rgba(74, 127, 165, 0.12))`,
                        }}
                      />
                    ))}
                  </div>

                  {/* Month Labels */}
                  <div className="flex justify-between">
                    {months.map((m) => (
                      <span key={m} className="text-[9px] text-white/15 w-[calc(100%/6)] text-center">{m}</span>
                    ))}
                  </div>
                </div>

                {/* Right Panel — 1/3 */}
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <p className="text-[10px] text-white/20 uppercase tracking-[0.15em] mb-3">Accounts</p>
                    <div className="space-y-2.5">
                      <PanelRow name="HBL Savings" value="Rs 6,45,000" />
                      <PanelRow name="Meezan Current" value="Rs 9,80,000" />
                      <PanelRow name="JazzCash" value="Rs 12,500" />
                      <PanelRow name="Cash" value="Rs 28,000" />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <p className="text-[10px] text-white/20 uppercase tracking-[0.15em] mb-3">Liabilities</p>
                    <div className="space-y-3">
                      <LiabilityRow name="Meezan Credit Card" value="Rs 1,85,000" rate="Profit Rate" />
                      <LiabilityRow name="HBL Personal Loan" value="Rs 1,35,000" rate="KIBOR + 3%" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function StatCard({ label, value, change, sub, positive, sparkUp, sparkDown }: {
  label: string; value: string; change?: string; sub?: string; positive?: boolean; sparkUp?: boolean; sparkDown?: boolean
}) {
  return (
    <div className="p-3.5 rounded-lg bg-white/[0.025] border border-white/[0.05]">
      <p className="text-[9px] text-white/20 uppercase tracking-[0.15em] mb-1.5">{label}</p>
      <p className="text-base md:text-lg font-mono text-white/80 font-medium leading-none">{value}</p>
      {change && (
        <div className="flex items-center gap-1.5 mt-2">
          <svg width="24" height="10" viewBox="0 0 24 10" fill="none" className="opacity-50">
            <path
              d={sparkDown ? "M1,2 L6,4 L12,6 L18,7 L23,9" : "M1,9 L6,7 L12,5 L18,3 L23,1"}
              stroke={positive ? "#4D9A7F" : "#D45B5B"} strokeWidth="1.2" strokeLinecap="round" fill="none"
            />
          </svg>
          <span className={`text-[10px] font-mono ${positive ? "text-emerald-400/60" : "text-red-400/60"}`}>{change}</span>
        </div>
      )}
      {sub && <p className="text-[9px] text-white/15 mt-1.5">{sub}</p>}
    </div>
  )
}

function PanelRow({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[11px] text-white/30">{name}</span>
      <span className="text-[11px] font-mono text-white/55">{value}</span>
    </div>
  )
}

function LiabilityRow({ name, value, rate }: { name: string; value: string; rate: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-[11px] text-white/30 block leading-tight">{name}</span>
        <span className="text-[8px] text-red-400/40">{rate}</span>
      </div>
      <span className="text-[11px] font-mono text-red-400/50">{value}</span>
    </div>
  )
}
