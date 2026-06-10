import { createContext, useContext, useState, useMemo, ReactNode } from "react";

export const PLATFORM_START = "2026-01-01";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

type Ctx = {
  from: string;
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
  reset: () => void;
  isToday: boolean;
};

const AdminDateRangeContext = createContext<Ctx | null>(null);

export function AdminDateRangeProvider({ children }: { children: ReactNode }) {
  const today = todayStr();
  const [from, setFrom] = useState<string>(today);
  const [to, setTo] = useState<string>(today);

  const value = useMemo<Ctx>(
    () => ({
      from,
      to,
      setFrom,
      setTo,
      reset: () => {
        setFrom(today);
        setTo(today);
      },
      isToday: from === today && to === today,
    }),
    [from, to, today],
  );

  return (
    <AdminDateRangeContext.Provider value={value}>{children}</AdminDateRangeContext.Provider>
  );
}

export function useAdminDateRange() {
  const ctx = useContext(AdminDateRangeContext);
  if (!ctx) throw new Error("useAdminDateRange must be used inside AdminDateRangeProvider");
  return ctx;
}
