import type { LiveToken } from "@/tutor/live/pcm";
import type { SpeechSegment, SttRequest, TutorTurnRequest, TutorTurnResponse } from "./types";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787";
const APP_TOKEN = process.env.EXPO_PUBLIC_APP_TOKEN ?? "";
const TIMEOUT_MS = 15_000;

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

/** A one-time Gemini Live token for speaking or listening; the API key never leaves the server. */
export const requestLiveToken = (role: "speak" | "listen") => post<LiveToken>("/v1/live/token", { role });
