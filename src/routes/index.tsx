import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { MapPin, Shield, Activity, ArrowRight, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EdoSUBEB Smart Attendance — Real-time school attendance for Edo State" },
      { name: "description", content: "Digitally capture and monitor teacher and student attendance in real time across Edo State public primary schools, with GPS verification and instant analytics." },
      { property: "og:title", content: "EdoSUBEB Smart Attendance" },
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
              <div className="font-display font-bold text-foreground">EdoSUBEB</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Smart Attendance</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/signup"><Button size="sm" className="bg-gradient-primary hover:opacity-90">Get started</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-[0.03]" />
        <div className="container mx-auto px-4 py-20 lg:py-28 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-glow animate-pulse" />
              Live across Edo State public primary schools
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
              Real-time attendance, <span className="bg-gradient-primary bg-clip-text text-transparent">verified by GPS.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
              EdoSUBEB Smart Attendance digitally captures teacher arrivals, departures, and student presence — with location verification, lateness flags, and statewide analytics.
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
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {["GPS-verified check-in", "Head Teacher review", "Statewide dashboards"].map((t) => (
                <div key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary-glow" /> {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="container mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: MapPin, title: "GPS Verification", desc: "Attendance is only valid when teachers are within the school's approved radius." },
            { icon: Activity, title: "Real-time Monitoring", desc: "Head Teachers and Admins see arrivals, departures, and absences as they happen." },
            { icon: Shield, title: "Role-based Access", desc: "Teachers, Head Teachers, and EdoSUBEB Admins each get a focused, secure workspace." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6 shadow-card hover:shadow-elegant transition-shadow">
              <div className="h-11 w-11 rounded-xl bg-primary/10 grid place-items-center mb-4">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-lg text-foreground">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="container mx-auto px-4 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} Edo State Universal Basic Education Board</span>
          <span>Strength · Achievement · Excellence</span>
        </div>
      </footer>
    </div>
  );
}
