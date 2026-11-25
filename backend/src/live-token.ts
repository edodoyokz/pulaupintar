import type { Env } from "./types";

const AUTH_TOKENS_URL = "https://generativelanguage.googleapis.com/v1alpha/auth_tokens";
const LIVE_WS_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained";

export type LiveRole = "speak" | "listen";

export type LiveToken = {
  /** One-time token the phone uses instead of the API key. */
  token: string;
  url: string;
  /** The first message to send on the socket; the token only accepts this setup. */
  setup: Record<string, unknown>;
};

const SPEAKER_INSTRUCTION =
  "Kamu adalah suara Kak Pinta, tutor ramah untuk anak usia 4-7 tahun. Setiap pesan teks yang kamu terima adalah kalimat yang harus kamu ucapkan. Ucapkan persis kalimat itu, dengan hangat, ceria, tempo pelan dan jelas. Kata atau kalimat Bahasa Inggris diucapkan dengan aksen Inggris. Jangan menambah, mengurangi, atau menjawab apa pun.";

/** What each socket is allowed to do: the speaker only reads lines aloud, the listener only writes down speech. */
export const liveSetup = (env: Env, role: LiveRole): Record<string, unknown> =>
  role === "speak"
    ? {
        model: `models/${env.GEMINI_LIVE_MODEL || "gemini-3.8-live"}`,
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: env.GEMINI_VOICE || "Aoede" } } },
        },
        systemInstruction: { parts: [{ text: SPEAKER_INSTRUCTION }] },
      }
    : {
        model: `models/${env.GEMINI_LISTEN_MODEL || "gemini-3.5-transcribe-live"}`,
        generationConfig: { responseModalities: ["TEXT"] },
        inputAudioTranscription: {},
      };

/**
 * Asks Gemini for a short-lived token locked to one role's setup, so the phone never holds the API key
 * and a stolen token can't be used for open chat or other models.
 */
export const createLiveToken = async (env: Env, role: LiveRole, doFetch: typeof fetch = fetch, now = new Date()): Promise<LiveToken> => {
  const setup = liveSetup(env, role);
  const plus = (minutes: number) => new Date(now.getTime() + minutes * 60_000).toISOString();
  const response = await doFetch(AUTH_TOKENS_URL, {
    method: "POST",
    signal: AbortSignal.timeout(5_000),
    headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY ?? "" },
    body: JSON.stringify({
      uses: 1,
      expireTime: plus(role === "speak" ? 10 : 5),
      newSessionExpireTime: plus(2),
      bidiGenerateContentSetup: setup,
    }),
  });
  if (!response.ok) throw new Error(`Gemini token failed: ${response.status}`);
  const { name } = (await response.json()) as { name?: string };
  if (!name) throw new Error("Gemini token missing");
  return { token: name, url: `${LIVE_WS_URL}?access_token=${encodeURIComponent(name)}`, setup };
};
