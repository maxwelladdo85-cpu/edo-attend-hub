export const SENATORIAL_DISTRICTS = {
  "Edo North": ["Akoko-Edo", "Etsako Central", "Etsako East", "Etsako West", "Owan East", "Owan West"],
  "Edo Central": ["Esan Central", "Esan North-East", "Esan South-East", "Esan West", "Igueben"],
  "Edo South": ["Egor", "Ikpoba-Okha", "Oredo", "Orhionmwon", "Ovia North-East", "Ovia South-West", "Uhunmwonde"],
} as const;
export type SenatorialDistrict = keyof typeof SENATORIAL_DISTRICTS;
export const DISTRICT_NAMES = Object.keys(SENATORIAL_DISTRICTS) as SenatorialDistrict[];
const norm = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, "");
export function lgaInDistrict(lga: string | null | undefined, d: string | null | undefined) {
  if (!d || !(d in SENATORIAL_DISTRICTS)) return true;
  return SENATORIAL_DISTRICTS[d as SenatorialDistrict].some((l) => norm(l) === norm(lga ?? ""));
}
const KEY = "edosas.senatorialDistrict";
export const getActiveDistrict = () => (typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null);
export const setActiveDistrict = (d: string | null) => (d ? localStorage.setItem(KEY, d) : localStorage.removeItem(KEY));

/** Raw LGA values as stored in the schools table for the active district, or null when unscoped. */
export function districtLgaValues(d: string | null = getActiveDistrict()): string[] | null {
  if (!d || !(d in SENATORIAL_DISTRICTS)) return null;
  return SENATORIAL_DISTRICTS[d as SenatorialDistrict].map((l) => l.toUpperCase().replace(/\s+/g, "-"));
}
/** Append an inner join on schools so rows can be filtered by district LGA server-side. */
export function distSel(cols: string): string {
  return districtLgaValues() ? `${cols},dsch:schools!inner(lga)` : cols;
}
/** Apply the district LGA filter to a query built with distSel (or directly on schools with col="lga"). */
export function distFilter<Q extends { in: (c: string, v: string[]) => Q }>(q: Q, col = "dsch.lga"): Q {
  const lgas = districtLgaValues();
  return lgas ? q.in(col, lgas) : q;
}
/** True when the signed-in user is viewing as a (read-only) Senatorial District Head. */
export const isDistrictView = () => !!districtLgaValues();
