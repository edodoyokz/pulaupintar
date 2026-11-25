export type Env = {
  /** Which LLM service writes Kak Pinta's lines: "sumopod" or "pollinations" (used when unset). */
  TUTOR_PROVIDER?: "pollinations" | "sumopod";
  POLLINATIONS_API_KEY?: string;
  SUMOPOD_API_KEY?: string;
  /** Model id at the chosen provider; defaults to GPT-5 Nano (openai/gpt-5-nano on Pollinations, gpt-5-nano on Sumopod). */
  TUTOR_MODEL?: string;
  /** Optional reasoning_effort for Pollinations or Sumopod, e.g. "low". */
  TUTOR_REASONING_EFFORT?: string;
  /**
   * Optional second model that checks each line before a child hears it, e.g. "jev-1.14.0".
   * Uses SAFETY_PROVIDER (default: the tutor's provider).
   */
  SAFETY_MODEL?: string;
  SAFETY_PROVIDER?: "pollinations" | "sumopod";
  /** Backup provider and model, used when the main one errors, times out or is cut off. */
  TUTOR_FALLBACK_PROVIDER?: "pollinations" | "sumopod";
  TUTOR_FALLBACK_MODEL?: string;
  SAFETY_FALLBACK_PROVIDER?: "pollinations" | "sumopod";
  SAFETY_FALLBACK_MODEL?: string;
  GOOGLE_CLOUD_API_KEY: string;
  APP_TOKEN: string;
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
export type TtsResponse = { audioBase64: string; mimeType: "audio/mpeg" };

export type SttEncoding = "AMR_WB" | "LINEAR16";
export type SttRequest = {
  audioBase64: string;
  encoding: SttEncoding;
  sampleRateHertz: number;
  expect: Lang;
  hints?: string[];
};
export type SttResponse = { transcript: string };
