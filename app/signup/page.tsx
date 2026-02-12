"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  };

  const isPasswordValid = passwordChecks.length && passwordChecks.uppercase && passwordChecks.number;

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!isPasswordValid) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // If session exists, email confirmation is disabled — go straight to dashboard
    if (data.session) {
      window.location.href = "/dashboard";
      return;
    }

    // Otherwise, email confirmation is required
    setSuccess(true);
    setLoading(false);
  }

  async function handleGoogleSignup() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-vault-positive/10 border border-vault-positive/20">
            <Check className="size-8 text-vault-positive" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-3">
            Check your email
          </h1>
          <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto leading-relaxed">
            We&apos;ve sent a verification link to{" "}
            <span className="font-medium text-foreground">{email}</span>.
            Click the link to activate your account.
          </p>
          <Button
            variant="outline"
            className="rounded-xl h-10"
            asChild
          >
            <Link href="/login">Back to Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Column — Philosophy Panel */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-[#111820] overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#2D4A3E]/30 via-transparent to-[#1A2E44]/20" />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div>
            <Link href="/" className="font-display font-bold text-xl text-[#E8E5DE] tracking-tight">
              Spendify
            </Link>
          </div>

          {/* Philosophy content */}
          <div className="max-w-md">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px w-12 bg-[#4D9A7F]" />
              <span className="text-[#4D9A7F] text-xs font-mono uppercase tracking-[0.2em]">
                Get Started
              </span>
            </div>

            <h2 className="font-display text-3xl font-semibold text-[#E8E5DE] leading-[1.3] mb-6">
              The first step to
              <br />
              <span className="text-[#4D9A7F]">financial clarity.</span>
            </h2>

            <p className="text-[#A0A5AD] text-[15px] leading-relaxed mb-10">
              Join thousands who&apos;ve stopped guessing about their money.
              Spendify brings all your accounts, cash, and goals into one
              intelligent view — built for how Indians actually manage money.
            </p>

            {/* Benefits */}
            <div className="space-y-4">
              {[
                "Unified view of bank accounts, cash & liabilities",
                "AI-powered spending insights & patterns",
                "Zero data selling — your finances stay private",
              ].map((benefit, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#4D9A7F]/15">
                    <Check className="size-3 text-[#4D9A7F]" />
                  </div>
                  <span className="text-sm text-[#A0A5AD]">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom quote */}
          <div className="text-[13px] text-[#6B7280] italic font-display">
            &ldquo;Clarity is the foundation of wealth.&rdquo;
          </div>
        </div>
      </div>

      {/* Right Column — Signup Form */}
      <div className="flex-1 flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10">
            <Link href="/" className="font-display font-bold text-xl text-foreground tracking-tight">
              Spendify
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-2">
              Create your account
            </h1>
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-primary font-medium hover:underline underline-offset-4"
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* Google OAuth */}
          <Button
            variant="outline"
            className="w-full h-11 rounded-xl text-sm font-medium gap-3 mb-6"
            onClick={handleGoogleSignup}
            type="button"
          >
            <svg className="size-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-3 text-muted-foreground">
                or continue with email
              </span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>

              {/* Password strength indicators */}
              {password.length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  {[
                    { check: passwordChecks.length, label: "8+ characters" },
                    { check: passwordChecks.uppercase, label: "Uppercase" },
                    { check: passwordChecks.number, label: "Number" },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-1.5 text-xs transition-colors ${
                        item.check
                          ? "text-vault-positive"
                          : "text-muted-foreground"
                      }`}
                    >
                      <div
                        className={`size-3.5 rounded-full flex items-center justify-center ${
                          item.check
                            ? "bg-vault-positive/15"
                            : "bg-muted"
                        }`}
                      >
                        {item.check && <Check className="size-2.5" />}
                      </div>
                      {item.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || !isPasswordValid}
              className="w-full h-11 rounded-xl text-sm font-medium mt-2 gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-muted-foreground/60">
            By creating an account, you agree to Spendify&apos;s{" "}
            <Link href="/" className="underline underline-offset-4 hover:text-muted-foreground">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/" className="underline underline-offset-4 hover:text-muted-foreground">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
