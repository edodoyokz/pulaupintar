import type { Env } from "./types";


export type LiveRole = "speak" | "listen";

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
