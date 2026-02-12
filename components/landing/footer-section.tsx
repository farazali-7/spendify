import Link from "next/link"

export function FooterSection() {
  return (
    <footer className="border-t border-border py-8">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground/50">
          <span className="font-display text-sm font-medium">Spendify</span>
          <span className="text-xs">&copy; 2026</span>
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="#"
            className="text-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors duration-200"
          >
            Privacy
          </Link>
          <Link
            href="#"
            className="text-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors duration-200"
          >
            Terms
          </Link>
        </div>
      </div>
    </footer>
  )
}
