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

import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

type SimplePos = {
  coords: { latitude: number; longitude: number; accuracy: number };
  timestamp: number;
};

async function getNativePosition(): Promise<SimplePos> {
  // Ensure location permissions are granted on native devices
  try {
    const perm = await Geolocation.checkPermissions();
    if (perm.location !== "granted" && perm.coarseLocation !== "granted") {
      const req = await Geolocation.requestPermissions();
      if (req.location !== "granted" && req.coarseLocation !== "granted") {
        throw new Error(
          "Location permission denied. Open Settings and allow location access for EdoSAS.",
        );
      }
    }
  } catch (e: any) {
    if (e?.message?.toLowerCase().includes("permission")) throw e;
    // Some platforms may not implement checkPermissions — continue
  }

  // Try high accuracy first with a generous timeout
  try {
    const p = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 25000,
      maximumAge: 10000,
    });
    return p as unknown as SimplePos;
  } catch {
    // Fallback: low accuracy, allow a cached fix up to 5 minutes old
    const p = await Geolocation.getCurrentPosition({
      enableHighAccuracy: false,
      timeout: 20000,
      maximumAge: 300000,
    });
    return p as unknown as SimplePos;
  }
}

function getWebPosition(): Promise<SimplePos> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation is not supported by this device"));
      return;
    }
    const geo = navigator.geolocation;
    let settled = false;
    const done = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };
    geo.getCurrentPosition(
      (pos) => done(() => resolve(pos as unknown as SimplePos)),
      () => {
        geo.getCurrentPosition(
          (pos) => done(() => resolve(pos as unknown as SimplePos)),
          (err) => {
            const msg =
              err.code === err.TIMEOUT
                ? "Location request timed out. Please move to an open area, enable GPS/High-accuracy location, and try again."
                : err.code === err.PERMISSION_DENIED
                  ? "Location permission denied. Enable location access for this site in your browser settings."
                  : err.code === err.POSITION_UNAVAILABLE
                    ? "Location unavailable. Turn on GPS/Location services and try again."
                    : err.message || "Unable to get your location.";
            done(() => reject(new Error(msg)));
          },
          { enableHighAccuracy: false, timeout: 20000, maximumAge: 300000 },
        );
      },
      { enableHighAccuracy: true, timeout: 25000, maximumAge: 10000 },
    );
  });
}

export async function getCurrentPosition(): Promise<SimplePos> {
  if (Capacitor.isNativePlatform()) {
    try {
      return await getNativePosition();
    } catch (e: any) {
      const m = (e?.message || "").toLowerCase();
      if (m.includes("timeout") || m.includes("timed out")) {
        throw new Error(
          "Location request timed out. Make sure Location/GPS is ON, allow EdoSAS to access location 'While Using the App', step outside or near a window, then try again.",
        );
      }
      if (m.includes("permission") || m.includes("denied")) {
        throw new Error(
          "Location permission denied. Open Settings → EdoSAS → Location and choose 'While Using the App'.",
        );
      }
      if (m.includes("unavailable") || m.includes("disabled")) {
        throw new Error(
          "Location services are off. Turn on Location/GPS in your phone settings and try again.",
        );
      }
      throw new Error(e?.message || "Unable to capture your location.");
    }
  }
  return getWebPosition();
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
