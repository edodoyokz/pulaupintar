import { useRef, useState } from "react";
import { requestTutorTurn } from "@/api/client";
import type { SpeechSegment, TutorTurnRequest } from "@/api/types";
import { starsFor, type AppItem, type Lesson } from "@/lessons/catalog";
import type { ChildProfile } from "@/profile/storage";
import { isCorrectAnswer } from "./grading";
import { speak, useChildMicrophone } from "./voice";

export type SessionPhase = "idle" | "speaking" | "your-turn" | "listening" | "checking" | "done";

const MAX_ATTEMPTS = 2;

const toApiItem = ({ question, answers, visual }: AppItem) => ({ question, answers, visual });

/**
 * One lesson session, as in the spec: teach, then for each item ask, listen,
 * and praise, hint (first miss) or reveal (second miss), then wrap up.
 */
export const useTutorSession = (lesson: Lesson, child: ChildProfile, items: AppItem[]) => {
  const microphone = useChildMicrophone();
  const [phase, setPhase] = useState<SessionPhase>("idle");
  const [itemIndex, setItemIndex] = useState(0);
  const [caption, setCaption] = useState("");
  const [heard, setHeard] = useState("");
  const [correctCount, setCorrectCount] = useState(0);
  const attemptRef = useRef(1);
  const lastSpeech = useRef<SpeechSegment[]>([]);
  const startedAt = useRef(Date.now());

  const say = async (step: Omit<TutorTurnRequest["step"], "item"> & { item?: AppItem }) => {
    setPhase("speaking");
    const { segments } = await requestTutorTurn({
      child: { name: child.name, age: child.age },
      subject: lesson.subject,
      lesson: { title: lesson.title, goal: lesson.goal },
      step: { ...step, item: step.item ? toApiItem(step.item) : undefined },
    }).catch(() => ({ segments: [{ lang: "id" as const, text: "Ayo kita lanjut belajar!" }] }));
    lastSpeech.current = segments;
    setCaption(segments.map((segment) => segment.text).join(" "));
    await speak(segments);
  };

  const askItem = async (index: number) => {
    attemptRef.current = 1;
    setItemIndex(index);
    setHeard("");
    await say({ kind: "ask", item: items[index] });
    setPhase("your-turn");
  };

  const finish = async (score: number) => {
    setCorrectCount(score);
    await say({ kind: "wrapup" });
    setPhase("done");
  };

  const goToNext = async (index: number, score: number) => {
    if (index + 1 < items.length) await askItem(index + 1);
    else await finish(score);
  };

  const start = async () => {
    startedAt.current = Date.now();
    await say({ kind: "teach" });
    await askItem(0);
  };

  const startListening = async () => {
    setPhase("listening");
    await microphone.start();
  };

  const stopListening = async () => {
    setPhase("checking");
    const item = items[itemIndex];
    const childSaid = await microphone
      .stopAndTranscribe(lesson.answerLang, item.answers)
      .catch(() => "");
    setHeard(childSaid);
    const attempt = attemptRef.current;

    if (isCorrectAnswer(childSaid, item.answers)) {
      const score = correctCount + 1;
      setCorrectCount(score);
      await say({ kind: "praise", item, childSaid, attempt });
      await goToNext(itemIndex, score);
    } else if (attempt < MAX_ATTEMPTS) {
      attemptRef.current = attempt + 1;
      await say({ kind: "hint", item, childSaid, attempt });
      setPhase("your-turn");
    } else {
      await say({ kind: "reveal", item, childSaid, attempt });
      await goToNext(itemIndex, correctCount);
    }
  };

  const replay = async () => {
    if (phase !== "your-turn" || lastSpeech.current.length === 0) return;
    setPhase("speaking");
    await speak(lastSpeech.current);
    setPhase("your-turn");
  };

  const result = starsFor(correctCount, items.length);

  return {
    phase,
    item: items[itemIndex],
    itemNumber: itemIndex + 1,
    itemTotal: items.length,
    caption,
    heard,
    correctCount,
    passed: result.passed,
    stars: result.stars,
    elapsedSeconds: () => Math.round((Date.now() - startedAt.current) / 1000),
    start,
    startListening,
    stopListening,
    replay,
  };
};
