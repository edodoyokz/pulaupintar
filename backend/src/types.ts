export type LlmProvider = "pollinations" | "sumopod" | "gemini";

export type Env = {
  /** Which LLM service writes Kak Pinta's lines: "sumopod" or "pollinations" (used when unset). */
  TUTOR_PROVIDER?: LlmProvider;
  POLLINATIONS_API_KEY?: string;
  SUMOPOD_API_KEY?: string;
  /** Model id at the chosen provider; defaults to GPT-5 Nano (openai/gpt-5-nano on Pollinations, gpt-5-nano on Sumopod). */
  TUTOR_MODEL?: string;
  /** Optional reasoning_effort for the main tutor model only (not its backup), e.g. "none" or "low". */
  TUTOR_REASONING_EFFORT?: string;
  /**
   * Optional second model that checks each line before a child hears it, e.g. "jev-1.14.0".
   * Uses SAFETY_PROVIDER (default: the tutor's provider).
   */
  SAFETY_MODEL?: string;
  SAFETY_PROVIDER?: LlmProvider;
  /** Backup provider and model, used when the main one errors, times out or is cut off. */
  TUTOR_FALLBACK_PROVIDER?: LlmProvider;
  TUTOR_FALLBACK_MODEL?: string;
  /**
   * Optional reasoning_effort for the backup tutor. Sumopod's claude-haiku-5-5 still reasons on "none"
   * (about 170 hidden tokens, 2.6 s) but not on "low" (0 tokens, 1.4 s).
   */
  TUTOR_FALLBACK_REASONING_EFFORT?: string;
  SAFETY_FALLBACK_PROVIDER?: LlmProvider;
  SAFETY_FALLBACK_MODEL?: string;
  GEMINI_API_KEY?: string;
  /** Who voices and hears Kak Pinta: "google" (Cloud TTS and STT, default) or "gemini" (Gemini Live voice and Gemini transcription). */
  SPEECH_PROVIDER?: "google" | "gemini";
  /** Gemini Live model that speaks; defaults to gemini-3.8-live. */
  GEMINI_LIVE_MODEL?: string;
  /** Gemini model that writes down the child's speech live; defaults to gemini-3.5-transcribe-live. */
  GEMINI_LISTEN_MODEL?: string;
  /** Prebuilt Gemini voice name; defaults to Aoede. */
  GEMINI_VOICE?: string;
  /** Gemini model that transcribes the child's recording; defaults to gemini-3.5-transcribe. */
  GEMINI_STT_MODEL?: string;
  GOOGLE_CLOUD_API_KEY?: string;
  APP_TOKEN: string;
  /** Per-IP rate limits (Workers Rate Limiting bindings, set in wrangler.jsonc). Missing locally: the limit is skipped. */
  TURN_LIMITER?: RateLimit;
  SPEECH_LIMITER?: RateLimit;
  LIVE_LIMITER?: RateLimit;
  TTS_VOICE_ID?: string;
  TTS_VOICE_EN?: string;
};

export type Subject = "berhitung" | "membaca" | "inggris";
export type Lang = "id" | "en";

export type SpeechSegment = { lang: Lang; text: string };

export type LessonItem = {
  question: string;
  answers: string[];
  visual?: string;
};

export type TutorStepKind = "teach" | "ask" | "praise" | "hint" | "reveal" | "wrapup";

export type TutorTurnRequest = {
  child: { name: string; age: number };
  subject: Subject;
  lesson: { title: string; goal: string };
  step: {
    kind: TutorStepKind;
    item?: LessonItem;
    childSaid?: string;
    attempt?: number;
  };
};

export type TutorTurnResponse = {
  segments: SpeechSegment[];
  fallbackUsed: boolean;
};

export type TtsRequest = { segments: SpeechSegment[] };
export type TtsResponse = { audioBase64: string; mimeType: "audio/mpeg" | "audio/wav" };

export type SttEncoding = "AMR_WB" | "LINEAR16" | "AAC";
export type SttRequest = {
  audioBase64: string;
  encoding: SttEncoding;
  sampleRateHertz: number;
  expect: Lang;
  hints?: string[];
};
export type SttResponse = { transcript: string };
