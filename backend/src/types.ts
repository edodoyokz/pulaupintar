export type Env = {
  ANTHROPIC_API_KEY: string;
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
