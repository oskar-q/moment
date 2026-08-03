import { useEffect } from "react";
import { onRemoteUpdate, onStorageUpdate } from "../store/sync";
import { useServiceStore } from "../store/useServiceStore";

/** Keep multiple role tabs in sync without a backend. */
export function useSync() {
  const hydrateFromStorage = useServiceStore((s) => s.hydrateFromStorage);

  useEffect(() => {
    const refresh = () => hydrateFromStorage();
    const offRemote = onRemoteUpdate(refresh);
    const offStorage = onStorageUpdate(refresh);
    return () => {
      offRemote();
      offStorage();
    };
  }, [hydrateFromStorage]);
}
