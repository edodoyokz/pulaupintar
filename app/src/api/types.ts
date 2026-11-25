// Mirrors backend/src/types.ts. Keep the two in sync when the contract changes.
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

export type TutorTurnResponse = { segments: SpeechSegment[]; fallbackUsed: boolean };

export type SttEncoding = "AMR_WB" | "LINEAR16" | "AAC";
export type SttRequest = {
  audioBase64: string;
  encoding: SttEncoding;
  sampleRateHertz: number;
  expect: Lang;
  hints?: string[];
};

/** What the listener is told about a lesson: the answer language and every word a child may answer with. */
export type ListenHints = { lang: Lang; words: string[] };
