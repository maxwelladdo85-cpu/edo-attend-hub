export function errorText(err: unknown): string {
  if (!err) return "";
  if (typeof err === "string") return err;
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

// Network-layer failures ("Failed to fetch", DNS errors, aborted requests, etc.)
// mean the device/browser could not reach the backend at that moment. They are
// not attendance validation errors, so the UI should keep the local save and
// retry sync later instead of alarming the teacher with a raw TypeError.
export function isTransientNetworkError(err: unknown): boolean {
  const m = errorText(err).toLowerCase();
  return (
    m.includes("failed to fetch") ||
    m.includes("network request failed") ||
    m.includes("networkerror") ||
    m.includes("load failed") ||
    m.includes("err_internet_disconnected") ||
    m.includes("err_network") ||
    m.includes("err_name_not_resolved") ||
    m.includes("err_connection") ||
    m.includes("the internet connection appears to be offline") ||
    m.includes("typeerror: fetch") ||
    m.includes("fetcherror")
  );
}

export function friendlyNetworkMessage(fallback = "Saved on this device. It will sync when the connection is stable.") {
  return fallback;
}