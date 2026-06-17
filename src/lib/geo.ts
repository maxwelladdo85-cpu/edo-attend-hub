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

    const geo = navigator.geolocation;
    let settled = false;
    const done = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    // Try high-accuracy GPS first (longer timeout for phones acquiring a fix)
    geo.getCurrentPosition(
      (pos) => done(() => resolve(pos)),
      () => {
        // Fallback: low-accuracy (cell/wifi) with a cached position allowed
        geo.getCurrentPosition(
          (pos) => done(() => resolve(pos)),
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
          { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 },
        );
      },
      { enableHighAccuracy: true, timeout: 25000, maximumAge: 10000 },
    );
  });
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
