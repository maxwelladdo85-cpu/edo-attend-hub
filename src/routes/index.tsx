import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import landingBg from "@/assets/landing-bg.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EdoSAS — Real-time school attendance for Edo State" },
      { name: "description", content: "Digitally capture and monitor teacher and student attendance in real time across Edo State public primary schools, with GPS verification and instant analytics." },
      { property: "og:title", content: "EdoSAS" },
      { property: "og:description", content: "GPS-verified attendance for teachers and students across Edo State public primary schools." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo className="h-10 w-10" />
            <div className="leading-tight">
              <div className="font-display font-bold text-3xl text-foreground">EdoSAS</div>
              <div className="text-xl uppercase tracking-wider text-muted-foreground">Smart Attendance</div>
            </div>
          </Link>
        </div>
      </header>

      {/* Hero + features over shared background */}
      <div className="relative overflow-hidden">
        <img
          src={landingBg}
          alt="Edo State primary school classroom"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background/85" />

        <section className="relative container mx-auto px-4 py-20 lg:py-28">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
              Real-time attendance, <span className="bg-gradient-primary bg-clip-text text-transparent">verified by GPS.</span>
            </h1>
            <p className="mt-6 text-lg text-foreground/80 max-w-2xl">
              EdoSAS digitally captures teacher arrivals, departures, and student presence — with location verification, lateness flags, and statewide analytics.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup">
                <Button size="lg" className="bg-gradient-primary hover:opacity-90 shadow-elegant">
                  Create account <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline">I already have an account</Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-foreground/80">
              {["GPS-verified check-in", "Head Teacher review", "Statewide dashboards"].map((t) => (
                <div key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> {t}
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>

      <footer className="border-t border-border/60 py-8">
        <div className="container mx-auto px-4 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} Edo State Universal Basic Education Board</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms & Conditions</Link>
            <Link to="/cookies" className="hover:text-foreground">Cookies Policy</Link>
            <span>Strength · Achievement · Excellence</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
