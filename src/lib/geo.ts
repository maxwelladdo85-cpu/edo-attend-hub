// Haversine distance in meters
export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation is not supported by this device"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

export type LocationStatus = "granted" | "denied" | "unsupported" | "unavailable" | "timeout";

export type LocationResult =
  | { status: "granted"; position: GeolocationPosition }
  | { status: Exclude<LocationStatus, "granted">; errorMessage: string };

/**
 * Best-effort permission state lookup. Falls back to `"unknown"` when the
 * Permissions API isn't available (iOS Safari prior to 16, some embedded
 * webviews). Callers should treat `"unknown"` the same as `"prompt"`.
 */
export async function getLocationPermissionState(): Promise<
  "granted" | "denied" | "prompt" | "unknown"
> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) return "unknown";
  const perms = (navigator as Navigator & { permissions?: Permissions }).permissions;
  if (!perms?.query) return "unknown";
  try {
    const status = await perms.query({ name: "geolocation" as PermissionName });
    return status.state;
  } catch {
    return "unknown";
  }
}

/** Request a single position, returning a structured result instead of throwing. */
export async function requestLocation(): Promise<LocationResult> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    return { status: "unsupported", errorMessage: "Geolocation is not supported by this device." };
  }
  try {
    const position = await getCurrentPosition();
    return { status: "granted", position };
  } catch (e) {
    const err = e as GeolocationPositionError | Error;
    // GeolocationPositionError has a numeric `code`
    if ("code" in err) {
      if (err.code === 1) {
        return {
          status: "denied",
          errorMessage:
            "Location permission was denied. Re-enable it from your browser or device settings to verify attendance.",
        };
      }
      if (err.code === 3) {
        return {
          status: "timeout",
          errorMessage: "Couldn't get a location fix in time. Step outside or check your GPS signal and try again.",
        };
      }
      return {
        status: "unavailable",
        errorMessage: "Your location is unavailable right now. Check your GPS or network signal and try again.",
      };
    }
    return { status: "unavailable", errorMessage: err.message ?? "Location unavailable." };
  }
}

export function classifyArrival(
  arrivalISO: string,
  resumptionTime: string, // 'HH:MM' or 'HH:MM:SS'
): "early" | "on_time" | "late" {
  const d = new Date(arrivalISO);
  const [h, m] = resumptionTime.split(":").map(Number);
  const ref = new Date(d);
  ref.setHours(h, m, 0, 0);
  const diffMin = (d.getTime() - ref.getTime()) / 60000;
  if (diffMin < -10) return "early";
  if (diffMin <= 0) return "on_time";
  return "late";
}

export function classifyDeparture(
  depISO: string,
  closingTime: string,
): "left_early" | "on_time" | "overtime" {
  const d = new Date(depISO);
  const [h, m] = closingTime.split(":").map(Number);
  const ref = new Date(d);
  ref.setHours(h, m, 0, 0);
  const diffMin = (d.getTime() - ref.getTime()) / 60000;
  if (diffMin < -5) return "left_early";
  if (diffMin <= 15) return "on_time";
  return "overtime";
}
