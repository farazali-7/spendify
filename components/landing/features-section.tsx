import { Landmark, BarChart3, Target, LineChart } from "lucide-react"

const features = [
  {
    icon: Landmark,
    title: "Multi-Account Tracking",
    body: "Track 3+ banks, digital wallets, and cash \u2014 in real time, in one place. No more switching between five banking apps to figure out what you have.",
  },
  {
    icon: BarChart3,
    title: "Smart Expense System",
    body: "Variable and fixed expenses in one intelligent flow. Categorized, tagged, and tied to source accounts. Not a spreadsheet \u2014 a system that thinks with you.",
  },
  {
    icon: Target,
    title: "Liability & Interest Tracking",
    body: "Know exactly what you owe and what it\u2019s costing you. Principal, interest paid, remaining balance \u2014 the full picture, not the version your bank wants you to see.",
  },
  {
    icon: LineChart,
    title: "Wealth Dashboard",
    body: "Net worth trends over time. Assets minus liabilities. The single number that tells you whether you\u2019re actually getting ahead \u2014 or just running in place.",
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 md:py-32 border-t border-border/50">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-16">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-vault-positive/50 mb-3 font-medium">
              WHAT YOU GET
            </p>
            <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
              Built for clarity, not clutter.
            </h2>
          </div>
          <p className="text-muted-foreground text-sm md:text-right max-w-xs leading-relaxed">
            Four pillars. Each one removes a blind spot from your financial
            life.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 gap-5">
          {features.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="group relative p-6 rounded-xl border border-border bg-card hover:bg-muted/30 transition-all duration-300"
            >
              {/* Hover top accent line */}
              <div className="absolute top-0 left-6 right-6 h-px bg-vault-positive/30 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />

              <div className="w-10 h-10 rounded-lg bg-vault-positive/7 border border-vault-positive/10 flex items-center justify-center mb-5">
                <Icon className="w-5 h-5 text-vault-positive" />
              </div>

              <h3 className="font-semibold text-foreground/80 mb-2 text-[15px]">
                {title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
