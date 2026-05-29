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
