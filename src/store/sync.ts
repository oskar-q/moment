const CHANNEL = "moment-service";
const STORAGE_KEY = "moment-service";

export { STORAGE_KEY };

type Listener = () => void;

let channel: BroadcastChannel | null = null;

export function getChannel() {
  if (typeof BroadcastChannel === "undefined") return null;
  if (!channel) channel = new BroadcastChannel(CHANNEL);
  return channel;
}

export function broadcastState() {
  getChannel()?.postMessage({ type: "state-updated", at: Date.now() });
}

export function onRemoteUpdate(listener: Listener) {
  const ch = getChannel();
  if (!ch) return () => undefined;
  const handler = (event: MessageEvent) => {
    if (event.data?.type === "state-updated") listener();
  };
  ch.addEventListener("message", handler);
  return () => ch.removeEventListener("message", handler);
}

export function onStorageUpdate(listener: Listener) {
  const handler = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
