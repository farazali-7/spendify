import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"

export function Navbar() {
  return (
    <header className="fixed top-0 w-full h-16 border-b border-border bg-background/80 backdrop-blur-xl z-50">
      <nav className="max-w-6xl mx-auto h-full flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-display font-bold text-lg tracking-tight text-foreground">
            Spendify
          </Link>
          <span className="hidden sm:inline text-[13px] text-muted-foreground/60 border-l border-border pl-3 italic font-display">
            Financial clarity, engineered.
          </span>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-6 text-[13px] text-muted-foreground">
            <Link
              href="#features"
              className="hover:text-foreground/80 transition-colors duration-200"
            >
              Features
            </Link>
            <Link
              href="#philosophy"
              className="hover:text-foreground/80 transition-colors duration-200"
            >
              Philosophy
            </Link>
            <Link
              href="/login"
              className="hover:text-foreground/80 transition-colors duration-200"
            >
              Login
            </Link>
          </div>
          <ModeToggle />
          <Button asChild className="rounded-xl shadow-sm font-medium text-[13px] h-9 px-5">
            <Link href="/signup">Sign Up</Link>
          </Button>
        </div>
      </nav>
    </header>
  )
}
