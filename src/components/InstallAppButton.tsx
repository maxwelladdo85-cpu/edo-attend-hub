import { useState, useEffect, useCallback } from "react";
import { Download, Smartphone, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
      toast.success("App installed successfully!");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      toast.info("Install option not available. Try using Chrome's menu: ⋮ → Add to Home screen.");
      return;
    }
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        toast.success("App is being installed!");
      }
      setDeferredPrompt(null);
    } catch {
      toast.error("Install failed. Please use Chrome menu → Add to Home screen.");
    }
  }, [deferredPrompt]);

  return { deferredPrompt, isInstalled, promptInstall };
}

export function InstallAppButton({ variant = "default" }: { variant?: "default" | "outline" | "ghost" }) {
  const { deferredPrompt, isInstalled, promptInstall } = useInstallPrompt();

  // Don't show if already installed
  if (isInstalled) {
    return (
      <Button variant="outline" disabled className="w-full">
        <CheckCircle2 className="h-4 w-4 mr-2" /> App installed
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      onClick={promptInstall}
      className="w-full"
    >
      <Download className="h-4 w-4 mr-2" />
      {deferredPrompt ? "Install App" : "Install App (Chrome only)"}
    </Button>
  );
}

export function InstallAppCard() {
  const { deferredPrompt, isInstalled, promptInstall } = useInstallPrompt();

  if (isInstalled) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center flex-shrink-0">
          <Smartphone className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="font-medium text-sm">Install EdoSAS on your phone</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add to your home screen for quick access and offline attendance.
          </p>
        </div>
      </div>
      <Button onClick={promptInstall} className="w-full">
        <Download className="h-4 w-4 mr-2" />
        {deferredPrompt ? "Install App" : "How to install"}
      </Button>
    </div>
  );
}
