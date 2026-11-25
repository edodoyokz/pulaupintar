import { liveRelay } from "@/api/client";
import type { ListenHints } from "@/api/types";
import { frameToText, type LiveServerMessage } from "./pcm";

const SETUP_TIMEOUT_MS = 6_000;

// React Native's WebSocket takes request headers as a third argument; the DOM typings don't know it.
const NativeWebSocket = WebSocket as unknown as new (url: string, protocols: null, options: { headers: Record<string, string> }) => WebSocket;

export type LiveConnection = {
  send: (message: object) => void;
  close: () => void;
  isOpen: () => boolean;
};

/**
 * Opens the Worker's Gemini Live relay. The Worker holds the key, sets the session up itself and
 * answers `setupComplete` once Gemini is ready, so callers can send right away.
 */
export const openLiveConnection = async (
  role: "speak" | "listen",
  handlers: { onMessage: (message: LiveServerMessage) => void; onClose: () => void },
  hints?: ListenHints,
): Promise<LiveConnection> => {
  const { url, headers } = liveRelay(role, hints);
  return new Promise<LiveConnection>((resolve, reject) => {
    const socket = new NativeWebSocket(url, null, { headers });
    socket.binaryType = "arraybuffer";
    let ready = false;
    const timer = setTimeout(() => fail(new Error("live setup timed out")), SETUP_TIMEOUT_MS);
    const connection: LiveConnection = {
      send: (message) => socket.send(JSON.stringify(message)),
      close: () => socket.close(),
      isOpen: () => socket.readyState === WebSocket.OPEN,
    };
    const fail = (error: Error) => {
      clearTimeout(timer);
      socket.close();
      if (!ready) reject(error);
    };
    socket.onerror = () => fail(new Error("live socket error"));
    socket.onclose = () => {
      clearTimeout(timer);
      if (!ready) reject(new Error("live socket closed before setup"));
      else handlers.onClose();
    };
    socket.onmessage = (event) => {
      const message = JSON.parse(frameToText(event.data)) as LiveServerMessage;
      if (!ready && message.setupComplete !== undefined) {
        ready = true;
        clearTimeout(timer);
        resolve(connection);
        return;
      }
      handlers.onMessage(message);
    };
  });
};
