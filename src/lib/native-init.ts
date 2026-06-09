// Initialise native-only UI niceties (status bar, keyboard behaviour) when
// running inside the Capacitor iOS/Android shell. No-op on the web.

export async function initNativeShell() {
  try {
    const cap = await import("@capacitor/core");
    if (!cap.Capacitor?.isNativePlatform?.()) return;

    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Light }).catch(() => {});
    await StatusBar.setBackgroundColor({ color: "#0B6B3A" }).catch(() => {});
    await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});

    const { Keyboard } = await import("@capacitor/keyboard");
    await Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => {});
  } catch {
    // Capacitor not installed / not running in native — ignore.
  }
}
