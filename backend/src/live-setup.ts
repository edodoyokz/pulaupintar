import type { Env } from "./types";

export type LiveRole = "speak" | "listen";

/** What the listener is told about the lesson: its answer language and the words a child may answer with. */
export type ListenHints = { lang?: "id" | "en"; words: string[] };

const LANGUAGE_CODES = { id: "id-ID", en: "en-US" } as const;
/** Gemini works best with up to 100 biasing terms; a lesson has far fewer answers. */
const MAX_WORDS = 100;
const MAX_WORD_CHARS = 40;
const WORD_PATTERN = /^[\p{L}\p{N}' -]+$/u;

/** The phone sends the hints in the URL; only a known language and short, plain words get through. */
export const parseListenHints = (lang: string | undefined, words: string[]): ListenHints => ({
  lang: lang === "id" || lang === "en" ? lang : undefined,
  words: [...new Set(words.map((word) => word.trim()))]
    .filter((word) => word.length > 0 && word.length <= MAX_WORD_CHARS && WORD_PATTERN.test(word))
    .slice(0, MAX_WORDS),
});

const SPEAKER_INSTRUCTION =
  "Kamu adalah suara Kak Pinta, tutor ramah untuk anak usia 4-7 tahun. Setiap pesan teks yang kamu terima adalah kalimat yang harus kamu ucapkan. Ucapkan persis kalimat itu, dengan hangat, ceria, tempo pelan dan jelas. Kata atau kalimat Bahasa Inggris diucapkan dengan aksen Inggris. Jangan menambah, mengurangi, atau menjawab apa pun.";

/**
 * What each socket is allowed to do: the speaker only reads lines aloud, the listener only writes down speech.
 * The listener is held to the lesson's language (so "dua" is not heard as English, or "red" as Indonesian)
 * and biased toward every answer of the lesson, not only the right one, so a wrong answer is still heard as said.
 */
export const liveSetup = (env: Env, role: LiveRole, hints: ListenHints = { words: [] }): Record<string, unknown> =>
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
        inputAudioTranscription: {
          languageCodes: hints.lang ? [LANGUAGE_CODES[hints.lang]] : [],
          ...(hints.words.length > 0 ? { customVocabulary: hints.words } : {}),
        },
      };
