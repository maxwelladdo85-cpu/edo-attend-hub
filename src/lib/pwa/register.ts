// Guarded service-worker registration.
//
// The PWA service worker is what lets the app cold-launch with no internet:
// HTML, JS, CSS, fonts, and icons are cached on first online visit and served
// from cache afterwards. The same code runs inside the Capacitor WebView on
// Android/iOS, where it complements the bundled assets.
//
// CRITICAL: this must NEVER register inside the Lovable in-editor preview or
// during dev, otherwise stale workers serve deleted chunks and break the live
// preview. The guards below mirror the built-in PWA skill.

const SW_PATH = "/sw.js";

function isUnsafeContext(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  // Inside an iframe (Lovable editor preview is iframed)
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true; // cross-origin frame access throws -> we're framed
  }
  const host = window.location.hostname;
  const url = new URL(window.location.href);
  if (url.searchParams.get("sw") === "off") return true;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;
  return false;
}

async function unregisterOurWorkers() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      const scriptURL = reg.active?.scriptURL ?? reg.installing?.scriptURL ?? reg.waiting?.scriptURL ?? "";
      if (scriptURL.endsWith(SW_PATH)) await reg.unregister();
    }
  } catch {
    /* ignore */
  }
}

export async function registerPwa(): Promise<void> {
  if (isUnsafeContext()) {
    await unregisterOurWorkers();
    return;
  }
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
  } catch (err) {
    // Non-fatal — app still works online without the cache.
    console.warn("[pwa] service worker registration failed", err);
  }
}
