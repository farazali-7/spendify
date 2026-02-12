import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function CtaSection() {
  return (
    <section className="relative py-28 md:py-36 border-t border-border/50">
      {/* Radial glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[500px] h-[500px] bg-vault-positive/3 dark:bg-vault-positive/4 blur-[150px] rounded-full" />
      </div>

      <div className="relative text-center max-w-2xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight mb-4">
          Start Taking Control Today.
        </h2>
        <p className="text-lg text-muted-foreground mb-10">
          Free to start. No credit card. Just clarity.
        </p>
        <Button
          size="lg"
          className="rounded-xl shadow-lg h-12 px-8 text-[15px] font-medium bg-foreground text-background hover:bg-foreground/90 gap-2"
        >
          Create Your Account
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </section>
  )
}
