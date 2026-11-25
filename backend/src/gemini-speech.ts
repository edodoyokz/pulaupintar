import { SPEAKER_INSTRUCTION } from "./live-setup";
import type { Env, SpeechSegment, SttRequest } from "./types";

const HOST = "https://generativelanguage.googleapis.com";
const LIVE_URL = `${HOST}/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent`;
const LIVE_SAMPLE_RATE = 24_000;
const LIVE_TIMEOUT_MS = 30_000;
const CONNECT_TIMEOUT_MS = 10_000;

const LANGUAGE_CODES = { id: "id-ID", en: "en-US" } as const;

/** Minimal WebSocket shape, so tests can stand in for Gemini. */
export type LiveSocket = {
  send: (data: string) => void;
  close: () => void;
  addEventListener: (type: "message" | "close" | "error", listener: (event: { data?: unknown }) => void) => void;
};
export type LiveConnect = (env: Env) => Promise<LiveSocket>;

/** Opens the Live websocket from the Worker; the key goes in a header, never in the app. */
export const connectLive: LiveConnect = async (env) => {
  const response = await fetch(LIVE_URL, {
    headers: { upgrade: "websocket", "x-goog-api-key": env.GEMINI_API_KEY ?? "" },
    signal: AbortSignal.timeout(CONNECT_TIMEOUT_MS),
  });
  const socket = (response as unknown as { webSocket?: LiveSocket & { accept: () => void } }).webSocket;
  if (!socket) throw new Error(`Gemini Live refused the connection: ${response.status}`);
  socket.accept();
  return socket;
};

/** Gemini sends JSON in text or binary frames, depending on the runtime. */
const frameText = async (data: unknown): Promise<string> => {
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
  if (ArrayBuffer.isView(data)) return new TextDecoder().decode(data);
  if (data && typeof (data as Blob).text === "function") return (data as Blob).text();
  return String(data);
};

const base64ToBytes = (base64: string): Uint8Array => Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return btoa(binary);
};

/** Wraps 16-bit mono PCM in a WAV header so the phone can play it as a file. */
export const pcmToWav = (pcm: Uint8Array, sampleRate = LIVE_SAMPLE_RATE): Uint8Array => {
  const wav = new Uint8Array(44 + pcm.length);
  const view = new DataView(wav.buffer);
  const text = (offset: number, value: string) => [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, 36 + pcm.length, true);
  text(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, pcm.length, true);
  wav.set(pcm, 44);
  return wav;
};

const concat = (parts: Uint8Array[]): Uint8Array => {
  const joined = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.length;
  }
  return joined;
};

type LiveMessage = {
  serverContent?: { modelTurn?: { parts?: { inlineData?: { data: string } }[] }; turnComplete?: boolean };
  usageMetadata?: { totalTokenCount?: number };
};

const speakSegment = async (env: Env, segment: SpeechSegment, connect: LiveConnect): Promise<Uint8Array> => {
  const socket = await connect(env);
  return new Promise<Uint8Array>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    let tokens = 0;
    let turnComplete = false;
    const timer = setTimeout(() => finish(new Error("Gemini Live timed out")), LIVE_TIMEOUT_MS);
    let done = false;
    const finish = (error?: Error) => {
      // The close event follows our own close(); only the first call settles the line and logs its cost.
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        socket.close();
      } catch {
        // already closed
      }
      if (error) reject(error);
      else if (!turnComplete) reject(new Error("Gemini Live closed before the line was finished"));
      else if (chunks.length === 0) reject(new Error("Gemini Live sent no audio"));
      else {
        console.log(JSON.stringify({ event: "cost", kind: "tts", provider: "gemini-live", characters: segment.text.length, tokens }));
        resolve(concat(chunks));
      }
    };
    socket.addEventListener("error", () => finish(new Error("Gemini Live socket error")));
    socket.addEventListener("close", () => void queue.then(() => finish()));
    // Frames are decoded in order, so a slow decode never lets audio chunks swap places.
    let queue: Promise<void> = Promise.resolve();
    socket.addEventListener("message", (event) => {
      queue = queue.then(() => handle(event.data)).catch((error) => finish(error as Error));
    });
    const handle = async (data: unknown) => {
      const message = JSON.parse(await frameText(data)) as LiveMessage & { setupComplete?: unknown };
      if (message.setupComplete !== undefined) {
        socket.send(JSON.stringify({ realtimeInput: { text: segment.text } }));
        return;
      }
      for (const part of message.serverContent?.modelTurn?.parts ?? []) {
        if (part.inlineData) chunks.push(base64ToBytes(part.inlineData.data));
      }
      tokens = message.usageMetadata?.totalTokenCount ?? tokens;
      if (message.serverContent?.turnComplete) {
        turnComplete = true;
        finish();
      }
    };
    socket.send(
      JSON.stringify({
        setup: {
          model: `models/${env.GEMINI_LIVE_MODEL || "gemini-3.8-live"}`,
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              languageCode: LANGUAGE_CODES[segment.lang],
              voiceConfig: { prebuiltVoiceConfig: { voiceName: env.GEMINI_VOICE || "Aoede" } },
            },
          },
          systemInstruction: { parts: [{ text: SPEAKER_INSTRUCTION }] },
        },
      }),
    );
  });
};

/**
 * Speaks every segment in its own Live session (so English words get an English setup),
 * in parallel, and joins them into one WAV for the app.
 */
export const synthesizeWithGemini = async (env: Env, segments: SpeechSegment[], connect: LiveConnect = connectLive): Promise<string> => {
  const clips = await Promise.all(segments.map((segment) => speakSegment(env, segment, connect)));
  return bytesToBase64(pcmToWav(concat(clips)));
};

const AUDIO_MIME_TYPES = { AAC: "audio/aac", AMR_WB: "audio/amr-wb", LINEAR16: "audio/wav" } as const;

type GenerateContentResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
};

export const transcribeWithGemini = async (env: Env, request: SttRequest, doFetch: typeof fetch = fetch): Promise<string> => {
  const model = env.GEMINI_STT_MODEL || "gemini-3.5-transcribe";
  const hint = request.hints?.length ? ` Kata yang mungkin diucapkan anak: ${request.hints.slice(0, 20).join(", ")}.` : "";
  const response = await doFetch(`${HOST}/v1beta/models/${model}:generateContent`, {
    method: "POST",
    signal: AbortSignal.timeout(10_000),
    headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY ?? "" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: `Transkripsikan ucapan anak kecil ini persis, tanpa tambahan. Bahasa utama: ${request.expect === "id" ? "Indonesia" : "Inggris"}.${hint}` },
            { inlineData: { mimeType: AUDIO_MIME_TYPES[request.encoding], data: request.audioBase64 } },
          ],
        },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Gemini STT failed: ${response.status}`);
  const body = (await response.json()) as GenerateContentResponse;
  console.log(
    JSON.stringify({ event: "cost", kind: "stt", provider: "gemini", inputTokens: body.usageMetadata?.promptTokenCount, outputTokens: body.usageMetadata?.candidatesTokenCount }),
  );
  return (body.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? "").join(" ").trim();
};
