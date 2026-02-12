const principles = [
  {
    num: "01",
    title: "Assets first",
    desc: "Track what you own before you track what you spend.",
  },
  {
    num: "02",
    title: "Liabilities visible",
    desc: "You can\u2019t reduce what you refuse to look at.",
  },
  {
    num: "03",
    title: "Measure before spending",
    desc: "Awareness precedes every good financial decision.",
  },
  {
    num: "04",
    title: "Think monthly, act daily",
    desc: "Big picture strategy. Small daily discipline.",
  },
]

export function PhilosophySection() {
  return (
    <section id="philosophy" className="py-24 md:py-32 border-t border-border/50">
      <div className="max-w-6xl mx-auto px-6">
        <p className="text-xs uppercase tracking-[0.2em] text-vault-positive/50 mb-3 font-medium">
          WHY THIS EXISTS
        </p>
        <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight mb-16">
          Built on Financial Discipline.
        </h2>

        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
          {/* Story — Left */}
          <div className="space-y-6">
            <p className="text-muted-foreground leading-[1.8] text-[15px]">
              Spendify wasn&apos;t born from a hackathon prompt. It came from
              staring at bank statements at 2&nbsp;AM, wondering why six figures
              in salary felt like nothing by the 25th of every month.
            </p>
            <p className="text-muted-foreground leading-[1.8] text-[15px]">
              The answer was always the same &mdash; no system. Plenty of apps.
              Plenty of accounts. Zero structure.
            </p>
            <p className="text-foreground/70 font-display italic text-xl mt-4">
              This is the structure.
            </p>
          </div>

          {/* Principles — Right */}
          <div>
            {principles.map(({ num, title, desc }, i) => (
              <div
                key={num}
                className={`py-5 ${i < principles.length - 1 ? "border-b border-border/50" : ""} ${i === 0 ? "pt-0" : ""}`}
              >
                <span className="font-mono text-sm text-vault-positive/30">
                  {num}
                </span>
                <h4 className="font-semibold text-foreground/80 mt-1 mb-1 text-[15px]">
                  {title}
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
