import { useEffect, useState } from "react";
import { getSyncState, subscribeSync, syncNow, type SyncState } from "./syncEngine";

export function useSyncState(): SyncState {
  const [s, setS] = useState<SyncState>(getSyncState());
  useEffect(() => subscribeSync(setS), []);
  return s;
}

export { syncNow };
