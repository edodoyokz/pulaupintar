import { liveSetup, type ListenHints, type LiveRole } from "./live-setup";
import { validateSpeechRequest } from "./safety";
import { extraWordCount } from "./speech-drift";
import type { Env } from "./types";

/** What the relay needs from a websocket, so tests can use fakes and the Worker can use real sockets. */
export type RelaySocket = {
  send: (data: string) => void;
  close: (code?: number, reason?: string) => void;
  addEventListener: (
    type: "message" | "close" | "error",
    listener: (event: { data?: unknown; code?: number; reason?: string }) => void,
  ) => void;
};

const LISTEN_MIME = "audio/pcm;rate=16000";
/** One 100 ms chunk is about 4 KB in base64; this leaves room for slow devices. */
const MAX_AUDIO_CHUNK_CHARS = 64_000;
/** About 45 seconds of a child's answer; a whole recording is far shorter. */
const MAX_AUDIO_TOTAL_CHARS = 1_500_000;
const SESSION_LIMIT_MS = { speak: 10 * 60_000, listen: 60_000 } as const;
/** A speaker with no line to say for this long is closed; the app opens a new one for the next line. */
const SPEAK_IDLE_MS = 60_000;
/** A listener that has heard no audio by now will not hear any. */
const LISTEN_FIRST_AUDIO_MS = 15_000;
/** Audio the model may produce for one line: 24 kHz 16-bit mono is 48,000 bytes a second, at least 6 s and 0.25 s per character. */
const SPEAK_BYTES_PER_SECOND = 48_000;
const SPEAK_MIN_SECONDS = 6;
const SPEAK_SECONDS_PER_CHAR = 0.25;
/** Words the model may add to a line (a greeting's "ya", a transcription slip) before it counts as answering. */
const DRIFT_EXTRA_WORDS = 2;

/** Base64 characters of audio allowed for a line of this many characters. */
const speakAudioBudgetChars = (lineChars: number): number =>
  Math.ceil((Math.max(SPEAK_MIN_SECONDS, lineChars * SPEAK_SECONDS_PER_CHAR) * SPEAK_BYTES_PER_SECOND * 4) / 3);

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
 *   transcriptions come back. The session is held to the lesson's language and answer words (`hints`).
 * Anything else, in either direction, is dropped.
 *
 * A speaker is also held to its line: the audio is capped by the line's length, and the model's own transcript
 * of what it said (never sent on) is compared with the approved line; a model that starts answering the
 * question instead of asking it ends the session.
 */
export const runLiveRelay = (env: Env, role: LiveRole, client: RelaySocket, upstream: RelaySocket, hints?: ListenHints): void => {
  let ready = false;
  let closed = false;
  let turnActive = false;
  let audioChars = 0;
  let turnChars = 0;
  let turnTokens = 0;
  let totalTokens = 0;
  let turnAudioChars = 0;
  let turnAudioBudget = 0;
  let turnTranscript = "";
  /** Approved lines of this and the previous turn: the transcript can lag, so a late word of the last line is not drift. */
  let approvedLines: string[] = [];
  let chain: Promise<void> = Promise.resolve();

  const closeAll = (code = 1000, reason = "done") => {
    if (closed) return;
    closed = true;
    clearTimeout(limit);
    clearTimeout(idle);
    if (role === "listen" && audioChars > 0) {
      console.log(
        JSON.stringify({ event: "cost", kind: "stt", provider: "gemini-live-relay", audioChars, tokens: totalTokens }),
      );
    }
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
  let idle: ReturnType<typeof setTimeout> | null = null;
  const restartIdle = (ms: number) => {
    clearTimeout(idle);
    if (!closed) idle = setTimeout(() => closeAll(1000, "idle"), ms);
  };
  restartIdle(role === "speak" ? SPEAK_IDLE_MS : LISTEN_FIRST_AUDIO_MS);
  /** The speaker stopped on purpose: tell the phone why, log it, and end the session. */
  const stopSpeaker = (error: string, log: Json) => {
    console.log(JSON.stringify(log));
    toClient({ error });
    closeAll(1011, error);
  };

  const fromUpstream = async (data: unknown) => {
    const message = await parse(data);
    if (!message || closed) return;
    if (message.setupComplete !== undefined) {
      ready = true;
      toClient({ setupComplete: {} });
      return;
    }
    if (typeof message.usageMetadata?.totalTokenCount === "number") {
      turnTokens = message.usageMetadata.totalTokenCount;
      totalTokens = message.usageMetadata.totalTokenCount;
    }
    const content = message.serverContent ?? {};
    if (role === "speak") {
      if (turnActive && typeof content.outputTranscription?.text === "string") {
        turnTranscript += content.outputTranscription.text;
        const extra = extraWordCount(approvedLines, turnTranscript, content.turnComplete === true);
        if (extra >= DRIFT_EXTRA_WORDS) return stopSpeaker("drift", { event: "speech_drift", extra });
      }
      const parts = ((content.modelTurn?.parts ?? []) as Json[]).filter((part) => typeof part.inlineData?.data === "string");
      turnAudioChars += parts.reduce((sum, part) => sum + part.inlineData.data.length, 0);
      if (turnActive && turnAudioChars > turnAudioBudget) return stopSpeaker("audio limit", { event: "audio_limit" });
      if (parts.length > 0) toClient({ serverContent: { modelTurn: { parts: parts.map((part) => ({ inlineData: { data: part.inlineData.data } })) } } });
      if (content.turnComplete) {
        console.log(
          JSON.stringify({ event: "cost", kind: "tts", provider: "gemini-live-relay", characters: turnChars, tokens: turnTokens }),
        );
        turnActive = false;
        turnChars = 0;
        turnTokens = 0;
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
    if (!message || !ready || closed) return;
    if (role === "speak") {
      const segments = validateSpeechRequest(message.segments);
      if (!segments || turnActive) {
        toClient({ error: segments ? "busy" : "rejected" });
        return;
      }
      turnActive = true;
      turnChars = segments.reduce((sum, segment) => sum + segment.text.length, 0);
      turnTokens = 0;
      turnAudioChars = 0;
      turnAudioBudget = speakAudioBudgetChars(turnChars);
      turnTranscript = "";
      approvedLines = [...approvedLines.slice(-1), segments.map((segment) => segment.text).join(" ")];
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
    clearTimeout(idle); // audio is flowing; the session limit covers the rest
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
  if (role === "speak") client.addEventListener("message", () => restartIdle(SPEAK_IDLE_MS));
  for (const [side, socket] of [["phone", client], ["gemini", upstream]] as const) {
    socket.addEventListener("close", (event) => {
      if (!closed) console.log(JSON.stringify({ event: "live_closed", role, by: side, code: event.code, reason: event.reason }));
      closeAll();
    });
    socket.addEventListener("error", () => closeAll(1011, "error"));
  }
  upstream.send(JSON.stringify({ setup: liveSetup(env, role, hints) }));
};
