import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";

type LegalPageProps = {
  title: string;
  updated: string;
  children: ReactNode;
};

export function LegalPage({ title, updated, children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo className="h-9 w-9" />
            <div className="leading-tight">
              <div className="font-display font-bold text-xl text-foreground">EdoSUBEB</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Smart Attendance</div>
            </div>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 lg:py-14 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {updated}</p>

        <article className="prose prose-neutral dark:prose-invert mt-8 max-w-none [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_p]:text-foreground/85 [&_li]:text-foreground/85 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:space-y-1.5 [&_ol]:space-y-1.5 [&_p]:leading-relaxed [&_p]:mt-4">
          {children}
        </article>

        <div className="mt-12 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground border-t border-border/60 pt-6">
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <Link to="/cookies" className="hover:text-foreground">Cookies</Link>
          <Link to="/data-deletion" className="hover:text-foreground">Data Deletion</Link>
          <Link to="/support" className="hover:text-foreground">Support</Link>
        </div>
      </main>
    </div>
  );
}
