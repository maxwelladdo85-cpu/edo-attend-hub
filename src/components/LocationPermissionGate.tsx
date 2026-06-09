import { useEffect, useState } from "react";
import { MapPin, ShieldCheck, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getLocationPermissionState,
  requestLocation,
  type LocationResult,
} from "@/lib/geo";

type Mode = "rationale" | "denied" | null;

type Props = {
  /** Short label for the action that needs location, e.g. "Mark arrival". */
  actionLabel: string;
  /**
   * Called when the user agrees to share location OR explicitly chooses to
   * continue without it. `result` is `null` when the user opted to proceed
   * without GPS (record will be unverified).
   */
  onResolved: (result: LocationResult | null) => void;
  /** Trigger element — typically the action button. */
  children: React.ReactNode;
};

/**
 * Wraps an action button with a clear, store-compliant permission rationale
 * BEFORE the OS-level location prompt appears. Also shows a fallback dialog
 * with re-enable instructions when permission was previously denied, giving
 * the user the option to still record attendance without GPS verification.
 */
export function LocationPermissionGate({ actionLabel, onResolved, children }: Props) {
  const [mode, setMode] = useState<Mode>(null);
  const [busy, setBusy] = useState(false);
  const [permission, setPermission] = useState<"granted" | "denied" | "prompt" | "unknown">("unknown");

  useEffect(() => {
    void getLocationPermissionState().then(setPermission);
  }, []);

  const open = async (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const state = await getLocationPermissionState();
    setPermission(state);
    if (state === "granted") {
      setBusy(true);
      const result = await requestLocation();
      setBusy(false);
      onResolved(result);
      return;
    }
    setMode(state === "denied" ? "denied" : "rationale");
  };

  const allow = async () => {
    setBusy(true);
    const result = await requestLocation();
    setBusy(false);
    setMode(null);
    if (result.status === "denied") {
      // User dismissed the OS prompt → fall back to the denied dialog
      setPermission("denied");
      setMode("denied");
      return;
    }
    onResolved(result);
  };

  const continueWithout = () => {
    setMode(null);
    onResolved(null);
  };

  return (
    <>
      <span onClickCapture={open} className="contents">
        {children}
      </span>

      <AlertDialog open={mode === "rationale"} onOpenChange={(o) => !o && setMode(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-primary/10">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <AlertDialogTitle className="text-center">Allow location for attendance</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              EdoSUBEB uses your device's GPS <strong>only at the moment you {actionLabel.toLowerCase()}</strong>
              {" "}to confirm you are physically at your assigned school. Your location is not tracked at any other time and is never shared outside EdoSUBEB.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <ul className="space-y-2 text-sm text-muted-foreground rounded-lg bg-muted/40 p-3">
            <li className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span>Used only to verify school presence — not for background tracking.</span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span>You can revoke this permission anytime in your device settings.</span>
            </li>
          </ul>

          <AlertDialogFooter className="sm:flex-col sm:space-x-0 gap-2">
            <AlertDialogAction onClick={allow} disabled={busy}>
              {busy ? "Getting location…" : "Allow location"}
            </AlertDialogAction>
            <AlertDialogCancel onClick={continueWithout} className="mt-0">
              Continue without location (unverified)
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={mode === "denied"} onOpenChange={(o) => !o && setMode(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-amber-500/10">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <AlertDialogTitle className="text-center">Location is turned off</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Without GPS we can still record your attendance, but it will be marked
              <strong> unverified</strong> for your head teacher to review.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground space-y-2">
            <p className="font-semibold text-foreground">To re-enable location:</p>
            <p><strong>iPhone (Safari)</strong>: Settings → Safari → Location → Allow. Then reload this page.</p>
            <p><strong>iPhone (EdoSUBEB app)</strong>: Settings → EdoSUBEB → Location → While Using the App.</p>
            <p><strong>Android (Chrome)</strong>: tap the lock icon in the address bar → Permissions → Location → Allow.</p>
            <p><strong>Android (EdoSUBEB app)</strong>: Settings → Apps → EdoSUBEB → Permissions → Location → Allow.</p>
          </div>

          <AlertDialogFooter className="sm:flex-col sm:space-x-0 gap-2">
            <AlertDialogAction onClick={continueWithout}>
              Record without location (unverified)
            </AlertDialogAction>
            <AlertDialogCancel className="mt-0">Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
