// Cross-platform haptic feedback.
// - Uses Capacitor Haptics when running inside the native iOS/Android app.
// - Falls back to navigator.vibrate() on supported browsers.
// - Silently no-ops otherwise (e.g. iOS Safari, desktop).

type Style = "light" | "medium" | "heavy" | "success" | "warning" | "error";

let nativeHaptics: any | null = null;
let nativeStyleEnum: any | null = null;
let nativeNotifEnum: any | null = null;
let nativeProbed = false;

async function loadNative() {
  if (nativeProbed) return;
  nativeProbed = true;
  try {
    const cap = await import("@capacitor/core");
    if (!cap.Capacitor?.isNativePlatform?.()) return;
    const h = await import("@capacitor/haptics");
    nativeHaptics = h.Haptics;
    nativeStyleEnum = h.ImpactStyle;
    nativeNotifEnum = h.NotificationType;
  } catch {
    // Capacitor not available in this environment — ignore.
  }
}

export async function haptic(style: Style = "light") {
  await loadNative();

  if (nativeHaptics) {
    try {
      if (style === "success" || style === "warning" || style === "error") {
        const map: Record<string, any> = {
          success: nativeNotifEnum?.Success,
          warning: nativeNotifEnum?.Warning,
          error: nativeNotifEnum?.Error,
        };
        await nativeHaptics.notification({ type: map[style] });
      } else {
        const map: Record<string, any> = {
          light: nativeStyleEnum?.Light,
          medium: nativeStyleEnum?.Medium,
          heavy: nativeStyleEnum?.Heavy,
        };
        await nativeHaptics.impact({ style: map[style] });
      }
      return;
    } catch {
      // fall through to web fallback
    }
  }

  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    const pattern: Record<Style, number | number[]> = {
      light: 10,
      medium: 20,
      heavy: 40,
      success: [15, 40, 15],
      warning: [25, 60, 25],
      error: [40, 60, 40, 60, 40],
    };
    try { navigator.vibrate(pattern[style]); } catch { /* ignore */ }
  }
}
