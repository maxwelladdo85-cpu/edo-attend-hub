import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "edosubeb.cookie-ack.v1";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // localStorage unavailable — don't show banner
    }
  }, []);

  if (!visible) return null;

  const acknowledge = () => {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      // ignore
    }
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie notice"
      className="fixed inset-x-3 bottom-3 z-[100] md:left-auto md:right-4 md:bottom-4 md:max-w-sm rounded-lg border border-border bg-background/95 backdrop-blur shadow-elegant p-4"
    >
      <p className="text-sm text-foreground">
        We use only essential cookies to keep you signed in and remember your
        preferences. No advertising or tracking.{" "}
        <Link to="/cookies" className="text-primary underline">Learn more</Link>.
      </p>
      <div className="mt-3 flex justify-end">
        <Button size="sm" onClick={acknowledge}>OK</Button>
      </div>
    </div>
  );
}
