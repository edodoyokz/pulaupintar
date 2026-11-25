import type { SpeechSegment, SttRequest, TutorTurnRequest, TutorTurnResponse } from "./types";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787";
const APP_TOKEN = process.env.EXPO_PUBLIC_APP_TOKEN ?? "";
// Covers the Worker's worst case when every model falls back (about 21.5 s, see backend/src/tutor.ts).
const TIMEOUT_MS = 23_000;

const post = async <T>(path: string, body: unknown): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-app-token": APP_TOKEN },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`${path} failed with ${response.status}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
};

export const requestTutorTurn = (request: TutorTurnRequest) =>
  post<TutorTurnResponse>("/v1/tutor/turn", request);

export const requestSpeech = (segments: SpeechSegment[]) =>
  post<{ audioBase64: string; mimeType: "audio/mpeg" | "audio/wav" }>("/v1/tts", { segments });

export const requestTranscript = (request: SttRequest) =>
  post<{ transcript: string }>("/v1/stt", request);

/** Websocket address and headers for the Worker's Gemini Live relay (the phone holds no Gemini token). */
export const liveRelay = (role: "speak" | "listen") => ({
  url: `${API_URL.replace(/^http/, "ws")}/v1/live/${role}`,
  headers: { "x-app-token": APP_TOKEN },
});
