import { AlertTriangle, Receipt, EyeOff } from "lucide-react"

const problems = [
  {
    icon: AlertTriangle,
    title: "Scattered Accounts",
    body: "Money split across 3\u20134 banks, wallets, and apps. No single view of where you actually stand.",
  },
  {
    icon: Receipt,
    title: "Invisible Liabilities",
    body: "Credit cards, EMIs, and borrowed money quietly compounding \u2014 completely untracked, completely invisible.",
  },
  {
    icon: EyeOff,
    title: "Zero Financial Clarity",
    body: "Month ends. Money\u2019s gone. No idea what happened or where it all went. Just a vague sense of loss.",
  },
]

export function ProblemSection() {
  return (
    <section className="py-24 md:py-32 border-t border-border/50">
      <div className="max-w-6xl mx-auto px-6">
        {/* Headline */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight mb-4">
            Most people don&apos;t know where their money actually goes.
          </h2>
          <p className="text-muted-foreground text-lg">
            It&apos;s not a discipline problem. It&apos;s a{" "}
            <span className="text-foreground/60 font-medium">systems</span>{" "}
            problem.
          </p>
        </div>

        {/* Problem Cards */}
        <div className="grid md:grid-cols-3 gap-5">
          {problems.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="p-6 rounded-xl bg-card border border-border hover:bg-muted/30 transition-colors duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-destructive/[0.08] border border-destructive/10 flex items-center justify-center mb-5">
                <Icon className="w-5 h-5 text-destructive/70" />
              </div>
              <h3 className="font-semibold text-foreground/80 mb-2">
                {title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {body}
              </p>
            </div>
          ))}
        </div>

        {/* Connector */}
        <div className="flex items-center gap-4 justify-center mt-16">
          <div className="h-px flex-1 max-w-24 bg-gradient-to-r from-transparent to-vault-positive/20" />
          <p className="text-[13px] text-vault-positive/50 tracking-wide font-medium">
            Spendify unifies everything into one system
          </p>
          <div className="h-px flex-1 max-w-24 bg-gradient-to-r from-vault-positive/20 to-transparent" />
        </div>
      </div>
    </section>
  )
}
