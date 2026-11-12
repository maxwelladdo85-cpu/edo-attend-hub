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
