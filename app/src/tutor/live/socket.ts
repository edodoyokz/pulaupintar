import { requestLiveToken } from "@/api/client";
import { frameToText, type LiveServerMessage } from "./pcm";

const SETUP_TIMEOUT_MS = 6_000;

export type LiveConnection = {
  send: (message: object) => void;
  close: () => void;
  isOpen: () => boolean;
};

/**
 * Opens a Gemini Live socket with a one-time token and sends the locked setup.
 * Resolves once Gemini confirms the setup, so callers can send right away.
 */
export const openLiveConnection = async (
  role: "speak" | "listen",
  handlers: { onMessage: (message: LiveServerMessage) => void; onClose: () => void },
): Promise<LiveConnection> => {
  const { url, setup } = await requestLiveToken(role);
  return new Promise<LiveConnection>((resolve, reject) => {
    const socket = new WebSocket(url);
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
    socket.onopen = () => socket.send(JSON.stringify({ setup }));
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
