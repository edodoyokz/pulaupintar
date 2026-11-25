import { useEffect, useMemo, useRef, useState } from "react";
import { requestTutorTurn } from "@/api/client";
import type { SpeechSegment, TutorTurnRequest } from "@/api/types";
import { starsFor, type AppItem, type Lesson } from "@/lessons/catalog";
import type { ChildProfile } from "@/profile/storage";
import { isCorrectAnswer } from "./grading";
import { speak, stopSpeaking, useChildMicrophone } from "./voice";

export type SessionPhase = "idle" | "speaking" | "your-turn" | "listening" | "checking" | "done";

const MAX_ATTEMPTS = 2;

const RETRY_LINE: SpeechSegment[] = [{ lang: "id", text: "Maaf, Kak Pinta belum dengar. Coba jawab sekali lagi, ya!" }];

const toApiItem = ({ question, answers, visual }: AppItem) => ({ question, answers, visual });

/** Thrown inside the session chain once the child has left the lesson, to stop it quietly. */
class SessionClosed extends Error {}

/**
 * One lesson session, as in the spec: teach, then for each item ask, listen,
 * and praise, hint (first miss) or reveal (second miss), then wrap up.
 */
export const useTutorSession = (lesson: Lesson, child: ChildProfile, items: AppItem[]) => {
  const microphone = useChildMicrophone();
  const [phase, setPhaseState] = useState<SessionPhase>("idle");
  const [itemIndex, setItemIndex] = useState(0);
  const [caption, setCaption] = useState("");
  const [heard, setHeard] = useState("");
  const [correctCount, setCorrectCount] = useState(0);
  const phaseRef = useRef<SessionPhase>("idle");
  const attemptRef = useRef(1);
  const lastSpeech = useRef<SpeechSegment[]>([]);
  const startedAt = useRef(Date.now());
  const closed = useRef(false);
  const lessonAnswers = useMemo(() => lesson.pool.flatMap((item) => item.answers), [lesson]);

  const setPhase = (next: SessionPhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  };

  const ensureOpen = () => {
    if (closed.current) throw new SessionClosed();
  };

  // Leaving the lesson silences Kak Pinta and stops the rest of the session.
  useEffect(() => {
    closed.current = false;
    return () => {
      closed.current = true;
      stopSpeaking();
      microphone.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runSafely = async (work: () => Promise<void>) => {
    try {
      await work();
    } catch (error) {
      if (!(error instanceof SessionClosed)) throw error;
    }
  };

  const playLine = async (segments: SpeechSegment[]) => {
    ensureOpen();
    setPhase("speaking");
    setCaption(segments.map((segment) => segment.text).join(" "));
    await speak(segments);
    ensureOpen();
  };

  const say = async (step: Omit<TutorTurnRequest["step"], "item"> & { item?: AppItem }) => {
    ensureOpen();
    setPhase("speaking");
    const { segments } = await requestTutorTurn({
      child: { name: child.name, age: child.age },
      subject: lesson.subject,
      lesson: { title: lesson.title, goal: lesson.goal },
      step: { ...step, item: step.item ? toApiItem(step.item) : undefined },
    }).catch(() => ({ segments: [{ lang: "id" as const, text: "Ayo kita lanjut belajar!" }] }));
    lastSpeech.current = segments;
    await playLine(segments);
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

  const start = () =>
    runSafely(async () => {
      startedAt.current = Date.now();
      await say({ kind: "teach" });
      await askItem(0);
    });

  /** Recording or speech-to-text failed: ask again without using up an attempt. */
  const retryTurn = async () => {
    await playLine(RETRY_LINE);
    setPhase("your-turn");
  };

  const startListening = () =>
    runSafely(async () => {
      if (phaseRef.current !== "your-turn") return;
      setPhase("listening");
      try {
        await microphone.start();
      } catch {
        await retryTurn();
      }
    });

  const stopListening = () =>
    runSafely(async () => {
      if (phaseRef.current !== "listening") return;
      setPhase("checking");
      const item = items[itemIndex];
      let childSaid: string;
      try {
        childSaid = await microphone.stopAndTranscribe(lesson.answerLang, item.answers);
      } catch {
        await retryTurn();
        return;
      }
      ensureOpen();
      setHeard(childSaid);
      const attempt = attemptRef.current;

      if (isCorrectAnswer(childSaid, item.answers, lessonAnswers, lesson.answerLang)) {
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
    });

  const replay = () =>
    runSafely(async () => {
      if (phaseRef.current !== "your-turn" || lastSpeech.current.length === 0) return;
      await playLine(lastSpeech.current);
      setPhase("your-turn");
    });

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
