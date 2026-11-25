import { liveSetup, type LiveRole } from "./live-setup";
import { validateSpeechRequest } from "./safety";
import type { Env } from "./types";

/** What the relay needs from a websocket, so tests can use fakes and the Worker can use real sockets. */
export type RelaySocket = {
  send: (data: string) => void;
  close: (code?: number, reason?: string) => void;
  addEventListener: (type: "message" | "close" | "error", listener: (event: { data?: unknown }) => void) => void;
};

const LISTEN_MIME = "audio/pcm;rate=16000";
/** One 100 ms chunk is about 4 KB in base64; this leaves room for slow devices. */
const MAX_AUDIO_CHUNK_CHARS = 64_000;
/** About 45 seconds of a child's answer; a whole recording is far shorter. */
const MAX_AUDIO_TOTAL_CHARS = 1_500_000;
const SESSION_LIMIT_MS = { speak: 10 * 60_000, listen: 60_000 } as const;

const frameText = async (data: unknown): Promise<string> => {
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
  if (ArrayBuffer.isView(data)) return new TextDecoder().decode(data);
  if (data && typeof (data as Blob).text === "function") return (data as Blob).text();
  return String(data);
};

type Json = Record<string, any>;

const parse = async (data: unknown): Promise<Json | null> => {
  try {
    const value = JSON.parse(await frameText(data));
    return value && typeof value === "object" ? (value as Json) : null;
  } catch {
    return null;
  }
};

/**
 * Sits between the phone and Gemini Live. The phone never holds a Gemini token: it talks to the Worker,
 * which holds the key, opens the session with a fixed setup, and passes through only what each role may do.
 *
 * - speak: the phone sends `{segments}`; they go through the same checks as /v1/tts, and only audio and
 *   the end of the turn come back.
 * - listen: the phone sends microphone audio (16 kHz PCM, limited in size) and the end of the stream; only
 *   transcriptions come back.
 * Anything else, in either direction, is dropped.
 */
export const runLiveRelay = (env: Env, role: LiveRole, client: RelaySocket, upstream: RelaySocket): void => {
  let ready = false;
  let closed = false;
  let turnActive = false;
  let audioChars = 0;
  let chain: Promise<void> = Promise.resolve();

  const closeAll = (code = 1000, reason = "done") => {
    if (closed) return;
    closed = true;
    clearTimeout(limit);
    for (const socket of [client, upstream]) {
      try {
        socket.close(code, reason);
      } catch {
        // already closed
      }
    }
  };
  const toClient = (message: Json) => {
    if (!closed) client.send(JSON.stringify(message));
  };
  const toUpstream = (message: Json) => upstream.send(JSON.stringify(message));
  const limit = setTimeout(() => closeAll(1000, "session limit"), SESSION_LIMIT_MS[role]);

  const fromUpstream = async (data: unknown) => {
    const message = await parse(data);
    if (!message) return;
    if (message.setupComplete !== undefined) {
      ready = true;
      toClient({ setupComplete: {} });
      return;
    }
    const content = message.serverContent ?? {};
    if (role === "speak") {
      const parts = ((content.modelTurn?.parts ?? []) as Json[]).filter((part) => typeof part.inlineData?.data === "string");
      if (parts.length > 0) toClient({ serverContent: { modelTurn: { parts: parts.map((part) => ({ inlineData: { data: part.inlineData.data } })) } } });
      if (content.turnComplete) {
        turnActive = false;
        toClient({ serverContent: { turnComplete: true } });
      }
      return;
    }
    const pass: Json = {};
    if (typeof content.inputTranscription?.text === "string") pass.inputTranscription = { text: content.inputTranscription.text };
    if (typeof content.interimInputTranscription?.text === "string") pass.interimInputTranscription = { text: content.interimInputTranscription.text };
    if (Object.keys(pass).length > 0) toClient({ serverContent: pass });
  };

  const fromClient = async (data: unknown) => {
    const message = await parse(data);
    if (!message || !ready) return;
    if (role === "speak") {
      const segments = validateSpeechRequest(message.segments);
      if (!segments || turnActive) {
        toClient({ error: segments ? "busy" : "rejected" });
        return;
      }
      turnActive = true;
      toUpstream({ realtimeInput: { text: segments.map((segment) => segment.text).join(" ") } });
      return;
    }
    const input = message.realtimeInput;
    if (input?.audioStreamEnd === true) {
      toUpstream({ realtimeInput: { audioStreamEnd: true } });
      return;
    }
    const audio = input?.audio;
    if (audio?.mimeType !== LISTEN_MIME || typeof audio.data !== "string" || audio.data.length > MAX_AUDIO_CHUNK_CHARS) return;
    audioChars += audio.data.length;
    if (audioChars > MAX_AUDIO_TOTAL_CHARS) return;
    toUpstream({ realtimeInput: { audio: { data: audio.data, mimeType: LISTEN_MIME } } });
  };

  // Frames are handled in order, so a slow decode never reorders audio.
  const enqueue = (handler: (data: unknown) => Promise<void>) => (event: { data?: unknown }) => {
    chain = chain.then(() => handler(event.data)).catch((error) => console.error(JSON.stringify({ event: "relay_error", message: String(error) })));
  };
  upstream.addEventListener("message", enqueue(fromUpstream));
  client.addEventListener("message", enqueue(fromClient));
  for (const socket of [client, upstream]) {
    socket.addEventListener("close", () => closeAll());
    socket.addEventListener("error", () => closeAll(1011, "error"));
  }
  upstream.send(JSON.stringify({ setup: liveSetup(env, role) }));
};
