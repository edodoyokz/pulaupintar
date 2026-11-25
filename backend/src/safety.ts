import type { SpeechSegment, TutorStepKind } from "./types";

const MAX_SEGMENTS = 6;
const MAX_SEGMENT_CHARS = 160;
const MAX_TOTAL_CHARS = 400;

const URL_PATTERN = /(https?:\/\/|www\.|\.com\b|\.id\b)/i;
const CONTACT_PATTERN = /(@|\b\d{6,}\b|whatsapp|instagram|tiktok|alamat|nomor telepon|password)/i;
const BLOCKED_WORDS = /\b(bodoh|goblok|tolol|bego|mati|bunuh|darah|seks|stupid|kill|dumb)\b/i;

export const FALLBACK_LINES: Record<TutorStepKind, SpeechSegment[]> = {
  teach: [{ lang: "id", text: "Ayo kita belajar bersama! Dengarkan baik-baik, ya." }],
  ask: [{ lang: "id", text: "Sekarang giliran kamu. Coba jawab, ya!" }],
  praise: [{ lang: "id", text: "Hebat sekali! Kamu pintar!" }],
  hint: [{ lang: "id", text: "Hampir benar! Ayo coba sekali lagi, pelan-pelan saja." }],
  reveal: [{ lang: "id", text: "Tidak apa-apa. Ayo kita lihat jawabannya bersama." }],
  wrapup: [{ lang: "id", text: "Kerja bagus hari ini! Kamu dapat bintang!" }],
};

const isSafeText = (text: string): boolean =>
  !URL_PATTERN.test(text) && !CONTACT_PATTERN.test(text) && !BLOCKED_WORDS.test(text);

/**
 * Last check before anything the LLM wrote is spoken to a child.
 * Any segment that fails sends the whole turn to the prepared fallback line,
 * so a child never hears a half-filtered sentence.
 */
export const filterSegments = (
  segments: SpeechSegment[],
  kind: TutorStepKind,
): { segments: SpeechSegment[]; passed: boolean } => {
  const cleaned = segments
    .map((segment) => ({ lang: segment.lang, text: segment.text.trim() }))
    .filter((segment) => segment.text.length > 0);

  const totalChars = cleaned.reduce((sum, segment) => sum + segment.text.length, 0);
  const withinLimits =
    cleaned.length > 0 &&
    cleaned.length <= MAX_SEGMENTS &&
    totalChars <= MAX_TOTAL_CHARS &&
    cleaned.every((segment) => segment.text.length <= MAX_SEGMENT_CHARS);

  if (withinLimits && cleaned.every((segment) => isSafeText(segment.text))) {
    return { segments: cleaned, passed: true };
  }
  return { segments: FALLBACK_LINES[kind], passed: false };
};

const isSpeechSegment = (value: unknown): value is SpeechSegment =>
  typeof value === "object" &&
  value !== null &&
  ((value as SpeechSegment).lang === "id" || (value as SpeechSegment).lang === "en") &&
  typeof (value as SpeechSegment).text === "string";

/**
 * Checks text sent to /v1/tts before it costs money or is spoken as Kak Pinta.
 * Same limits and word filters as the tutor's own lines; returns null when anything fails.
 */
export const validateSpeechRequest = (segments: unknown): SpeechSegment[] | null => {
  if (!Array.isArray(segments) || !segments.every(isSpeechSegment)) return null;
  const { segments: cleaned, passed } = filterSegments(segments, "ask");
  return passed ? cleaned : null;
};
