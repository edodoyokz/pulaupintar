import { useEffect, useMemo, useRef, useState } from "react";
import { requestTutorTurn } from "@/api/client";
import type { SpeechSegment, TutorTurnRequest } from "@/api/types";
import { starsFor, type AppItem, type Lesson } from "@/lessons/catalog";
import type { ChildProfile } from "@/profile/storage";
import { createEndOfSpeech } from "./end-of-speech";
import { isCorrectAnswer, speechVocabulary } from "./grading";
import { getAudioLevel } from "./live/levels";
import { playChime, prepareVoice, speak, stopSpeaking, useChildMicrophone } from "./voice";

export type SessionPhase = "idle" | "speaking" | "your-turn" | "listening" | "checking" | "done";
export type TurnFeedback = "none" | "correct" | "hint" | "reveal";

const MAX_ATTEMPTS = 2;

const RETRY_LINE: SpeechSegment[] = [{ lang: "id", text: "Maaf, Kak Pinta belum dengar. Coba jawab sekali lagi, ya!" }];
/** The microphone opened but the child said nothing; this does not use up an attempt. */
const SILENT_LINE: SpeechSegment[] = [
  { lang: "id", text: "Kak Pinta belum dengar suaramu. Tekan mikrofon, lalu jawab yang keras, ya!" },
];
/** The child has not pressed the microphone for a while. */
const NUDGE_LINE: SpeechSegment[] = [{ lang: "id", text: "Ayo, tekan tombol mikrofon yang besar, lalu jawab, ya!" }];
const NUDGE_AFTER_MS = 9_000;
const MAX_NUDGES = 2;
/** How often the microphone level is checked for the end of the child's answer (one live audio chunk). */
const LISTEN_POLL_MS = 100;

const toApiItem = ({ question, answers, visual }: AppItem) => ({ question, answers, visual });

/** Thrown inside the session chain once the child has left the lesson, to stop it quietly. */
class SessionClosed extends Error {}

type Step = Omit<TutorTurnRequest["step"], "item"> & { item?: AppItem };

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
  const [feedback, setFeedback] = useState<TurnFeedback>("none");
  const [correctCount, setCorrectCount] = useState(0);
  const phaseRef = useRef<SessionPhase>("idle");
  const attemptRef = useRef(1);
  const nudges = useRef(0);
  const lastSpeech = useRef<SpeechSegment[]>([]);
  const startedAt = useRef(0);
  const closed = useRef(false);
  const answerWatch = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Ask lines requested while the child was busy with the previous item, keyed by item index. */
  const prefetchedAsks = useRef(new Map<number, Promise<SpeechSegment[]>>());
  const lessonAnswers = useMemo(() => lesson.pool.flatMap((item) => item.answers), [lesson]);
  const listenHints = useMemo(
    () => ({ lang: lesson.answerLang, words: speechVocabulary(lessonAnswers, lesson.answerLang) }),
    [lesson, lessonAnswers],
  );

  const setPhase = (next: SessionPhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  };

  const ensureOpen = () => {
    if (closed.current) throw new SessionClosed();
  };

  const stopWatchingAnswer = () => {
    clearInterval(answerWatch.current ?? undefined);
    answerWatch.current = null;
  };

  // Leaving the lesson silences Kak Pinta and stops the rest of the session.
  useEffect(() => {
    closed.current = false;
    return () => {
      closed.current = true;
      stopWatchingAnswer();
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

  /** `persist`: the text never changes, so its audio is kept and the next time plays at once. */
  const playLine = async (segments: SpeechSegment[], persist = false) => {
    ensureOpen();
    setPhase("speaking");
    setCaption(segments.map((segment) => segment.text).join(" "));
    await speak(segments, { persist });
    ensureOpen();
  };

  const fallbackForStep = (step: Step): SpeechSegment[] => {
    switch (step.kind) {
      case "teach":
        return [{ lang: "id", text: `Ayo kita belajar ${lesson.title}! Dengarkan baik-baik, ya.` }];
      case "ask":
        return [{ lang: "id", text: step.item?.question ?? "Sekarang giliran kamu. Coba jawab, ya!" }];
      case "praise":
        return [{ lang: "id", text: `Hebat, ${child.name}! Jawabanmu benar!` }];
      case "hint":
        return [{ lang: "id", text: "Hampir benar! Ayo coba sekali lagi, pelan-pelan saja." }];
      case "reveal":
        return step.item
          ? [
              { lang: "id", text: "Jawabannya adalah" },
              { lang: lesson.answerLang, text: step.item.answers[0] },
            ]
          : [{ lang: "id", text: "Ayo kita lihat jawabannya bersama." }];
      case "wrapup":
        return [{ lang: "id", text: `Kerja bagus hari ini, ${child.name}! Kamu dapat bintang!` }];
    }
  };

  const tutorLine = (step: Step): Promise<SpeechSegment[]> =>
    requestTutorTurn({
      child: { name: child.name, age: child.age },
      subject: lesson.subject,
      lesson: { title: lesson.title, goal: lesson.goal },
      // The Worker accepts at most 200 characters of what the child said; a long ramble is cut, not rejected.
      step: { ...step, childSaid: step.childSaid?.slice(0, 200), item: step.item ? toApiItem(step.item) : undefined },
    })
      .then(({ segments }) => segments)
      .catch(() => fallbackForStep(step));

  const say = async (step: Step) => {
    ensureOpen();
    setPhase("speaking");
    // The voice session opens while the tutor writes the line, so its setup does not add to the wait.
    prepareVoice();
    const segments = await tutorLine(step);
    lastSpeech.current = segments;
    await playLine(segments);
  };

  // A level the child has not passed yet teaches each answer first ("Ini kucing… Coba ucapkan: cat"); once passed,
  // replaying it quizzes recall with the plain question.
  const teachesAnswers = !child.completedLessons.includes(lesson.id);
  const modelLineFor = (index: number) => (teachesAnswers ? items[index]?.model : undefined);

  /** Asks for an item's question line early, so it is ready when the previous item ends. */
  const prefetchAsk = (index: number) => {
    if (index >= items.length || modelLineFor(index) || prefetchedAsks.current.has(index)) return;
    prefetchedAsks.current.set(index, tutorLine({ kind: "ask", item: items[index] }));
  };

  const askItem = async (index: number) => {
    attemptRef.current = 1;
    nudges.current = 0;
    setItemIndex(index);
    setHeard("");
    setFeedback("none");
    const model = modelLineFor(index);
    if (model) {
      lastSpeech.current = model;
      await playLine(model, true);
    } else {
      ensureOpen();
      setPhase("speaking");
      const prefetched = prefetchedAsks.current.get(index);
      if (!prefetched) prepareVoice();
      const segments = await (prefetched ?? tutorLine({ kind: "ask", item: items[index] }));
      lastSpeech.current = segments;
      await playLine(segments);
    }
    setPhase("your-turn");
    // The next question is fetched while this child thinks, so it can follow the praise without a wait.
    prefetchAsk(index + 1);
  };

  const finish = async (score: number) => {
    setFeedback("none");
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
      prefetchAsk(0);
      await say({ kind: "teach" });
      await askItem(0);
    });

  /** Recording or speech-to-text failed: ask again without using up an attempt. */
  const retryTurn = async (line = RETRY_LINE) => {
    await playLine(line, true);
    setPhase("your-turn");
  };

  /** The child pressed the microphone but said nothing: close it and ask again, without counting a wrong answer. */
  const silentTurn = () =>
    runSafely(async () => {
      if (phaseRef.current !== "listening") return;
      stopWatchingAnswer();
      await microphone.cancel();
      ensureOpen();
      await retryTurn(SILENT_LINE);
    });

  const stopListening = () =>
    runSafely(async () => {
      if (phaseRef.current !== "listening") return;
      stopWatchingAnswer();
      setPhase("checking");
      const item = items[itemIndex];
      let childSaid: string;
      try {
        childSaid = await microphone.stopAndTranscribe(listenHints);
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
        setFeedback("correct");
        // Heard at once, while the tutor is still writing the praise.
        playChime();
        await say({ kind: "praise", item, childSaid, attempt });
        await goToNext(itemIndex, score);
      } else if (attempt < MAX_ATTEMPTS) {
        attemptRef.current = attempt + 1;
        setFeedback("hint");
        await say({ kind: "hint", item, childSaid, attempt });
        setPhase("your-turn");
      } else {
        setFeedback("reveal");
        await say({ kind: "reveal", item, childSaid, attempt });
        await goToNext(itemIndex, correctCount);
      }
    });

  /** The child presses the microphone once; the answer ends by itself when they stop talking. */
  const watchAnswer = () => {
    stopWatchingAnswer();
    const detect = createEndOfSpeech(Date.now());
    answerWatch.current = setInterval(() => {
      const result = detect(getAudioLevel("listen"), Date.now());
      if (result === "ended") void stopListening();
      else if (result === "silent") void silentTurn();
    }, LISTEN_POLL_MS);
  };

  const startListening = () =>
    runSafely(async () => {
      if (phaseRef.current !== "your-turn") return;
      setFeedback("none");
      setPhase("listening");
      try {
        await microphone.start(listenHints);
      } catch {
        await retryTurn();
        return;
      }
      // The microphone start may have been cut short (silence, leaving the lesson) while it was awaited.
      if ((phaseRef.current as SessionPhase) === "listening") watchAnswer();
    });

  // A child who does not press the microphone gets a spoken reminder, at most twice per question.
  useEffect(() => {
    if (phase !== "your-turn" || nudges.current >= MAX_NUDGES) return;
    const timer = setTimeout(() => {
      void runSafely(async () => {
        if (phaseRef.current !== "your-turn") return;
        nudges.current += 1;
        await playLine(NUDGE_LINE, true);
        setPhase("your-turn");
      });
    }, NUDGE_AFTER_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, itemIndex]);

  const replay = () =>
    runSafely(async () => {
      if (phaseRef.current !== "your-turn" || lastSpeech.current.length === 0) return;
      // The line is still in the audio cache, so it plays at once without a new voice session.
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
    feedback,
    correctCount,
    passed: result.passed,
    stars: result.stars,
    elapsedSeconds: () => (startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : 0),
    start,
    startListening,
    stopListening,
    replay,
  };
};
