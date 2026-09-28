import { useCallback, useEffect, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { getPendingCount, runSync } from "./queue";

export type SyncState = "synced" | "syncing" | "offline";

export function useSyncStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [pending, setPending] = useState(0);
  const [state, setState] = useState<SyncState>("synced");
  const syncingRef = useRef(false);

  const refreshPending = useCallback(async () => {
    const count = await getPendingCount();
    setPending(count);
    return count;
  }, []);

  const trySync = useCallback(async () => {
    if (syncingRef.current) return;
    const count = await refreshPending();
    if (count === 0) {
      setState(isConnected ? "synced" : "offline");
      return;
    }
    if (!isConnected) {
      setState("offline");
      return;
    }
    syncingRef.current = true;
    setState("syncing");
    await runSync();
    const remaining = await refreshPending();
    setState(remaining === 0 ? "synced" : "offline");
    syncingRef.current = false;
  }, [isConnected, refreshPending]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((netState) => {
      setIsConnected(Boolean(netState.isConnected && netState.isInternetReachable !== false));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial async sync check
    trySync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  return { state, pending, isConnected, refreshPending, trySync };
}
