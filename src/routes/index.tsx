import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { MapPin, Shield, Activity, ArrowRight, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import cardGps from "@/assets/card-gps.jpg";
import cardMonitoring from "@/assets/card-monitoring.jpg";
import cardRoles from "@/assets/card-roles.jpg";

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
              <div className="font-display font-bold text-3xl text-foreground">EdoSUBEB</div>
              <div className="text-xl uppercase tracking-wider text-muted-foreground">Smart Attendance</div>
            </div>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-[0.03]" />
        <div className="container mx-auto px-4 py-20 lg:py-28 relative">
          <div className="max-w-3xl">
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
            { icon: MapPin, title: "GPS Verification", desc: "Attendance is only valid when teachers are within the school's approved radius.", bg: cardGps },
            { icon: Activity, title: "Real-time Monitoring", desc: "Head Teachers and Admins see arrivals, departures, and absences as they happen.", bg: cardMonitoring },
            { icon: Shield, title: "Role-based Access", desc: "Teachers, Head Teachers, and EdoSUBEB Admins each get a focused, secure workspace.", bg: cardRoles },
          ].map(({ icon: Icon, title, desc, bg }) => (
            <div
              key={title}
              className="relative overflow-hidden rounded-2xl border border-border shadow-card hover:shadow-elegant transition-shadow min-h-[260px] flex flex-col justify-end p-6"
            >
              <img
                src={bg}
                alt=""
                loading="lazy"
                width={800}
                height={600}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/20" />
              <div className="relative">
                <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur grid place-items-center mb-4">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-display font-semibold text-lg text-white">{title}</h3>
                <p className="mt-1.5 text-sm text-white/85">{desc}</p>
              </div>
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
