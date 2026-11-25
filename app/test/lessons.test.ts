import { describe, expect, it } from "vitest";
import type { Subject } from "../src/api/types";
import {
  completedCount,
  findLesson,
  isUnlocked,
  LEVELS_PER_SUBJECT,
  nextLevel,
  pickSessionItems,
  SESSION_SIZE,
  starsFor,
} from "../src/lessons/catalog";
import { isCorrectAnswer } from "../src/tutor/grading";

describe("grading", () => {
  it.each([
    ["Tiga!", ["3"], true],
    ["tiga apel", ["3"], true],
    ["dua belas", ["12"], true],
    ["dua", ["12"], false],
    ["dua puluh", ["20"], true],
    ["it's red", ["red"], true],
    ["kiri", ["kiri"], true],
    ["kanan", ["kiri"], false],
    ["", ["3"], false],
    ["a", ["a"], true],
    ["huruf a", ["a"], true],
    ["i", ["a"], false],
  ])("%s vs %j -> %s", (said, answers, expected) => {
    expect(isCorrectAnswer(said, answers)).toBe(expected);
  });

  it("does not count saying every option", () => {
    expect(isCorrectAnswer("kiri atau kanan", ["kiri"], ["kiri", "kanan"])).toBe(false);
    expect(isCorrectAnswer("yang kiri", ["kiri"], ["kiri", "kanan"])).toBe(true);
    expect(isCorrectAnswer("red blue yellow", ["red"], ["red", "blue", "yellow"])).toBe(false);
  });

  it("reads numbers only in the lesson's language", () => {
    expect(isCorrectAnswer("three", ["3"], [], "en")).toBe(true);
    expect(isCorrectAnswer("tiga", ["3"], [], "en")).toBe(false);
    expect(isCorrectAnswer("em", ["m", "em"])).toBe(true);
    expect(isCorrectAnswer("em, be", ["b", "be"], ["m", "em", "b", "be"])).toBe(true);
    expect(isCorrectAnswer("Kak", ["k", "ka", "kak"], ["k", "ka", "kak", "b", "be"])).toBe(true);
    expect(isCorrectAnswer("kak tiga", ["3"])).toBe(true);
  });

  it("takes the last number when a child counts aloud", () => {
    expect(isCorrectAnswer("satu dua tiga empat", ["2"])).toBe(false);
    expect(isCorrectAnswer("satu dua tiga, tiga!", ["3"])).toBe(true);
    expect(isCorrectAnswer("tiga apel", ["3"])).toBe(true);
  });
});

describe("every built lesson", () => {
  const subjects: Subject[] = ["berhitung", "membaca", "inggris"];
  const lessons = subjects.flatMap((subject) =>
    Array.from({ length: LEVELS_PER_SUBJECT }, (_, index) => findLesson(subject, index + 1)).filter(
      (lesson) => lesson !== undefined,
    ),
  );

  it("accepts each item's own answer and rejects the other answers in the lesson", () => {
    expect(lessons).toHaveLength(15);
    for (const lesson of lessons) {
      const lessonAnswers = lesson.pool.flatMap((item) => item.answers);
      for (const item of lesson.pool) {
        for (const answer of item.answers) {
          expect(isCorrectAnswer(answer, item.answers, lessonAnswers, lesson.answerLang), `${lesson.id} ${answer}`).toBe(true);
        }
        for (const other of lessonAnswers.filter((answer) => !item.answers.includes(answer))) {
          expect(isCorrectAnswer(other, item.answers, lessonAnswers, lesson.answerLang), `${lesson.id} ${other}`).toBe(false);
        }
      }
    }
  });
});

describe("berhitung curriculum", () => {
  it("has five levels, each with enough items for one session", () => {
    for (let level = 1; level <= LEVELS_PER_SUBJECT; level += 1) {
      const lesson = findLesson("berhitung", level);
      expect(lesson).toBeDefined();
      expect(lesson!.pool.length).toBeGreaterThanOrEqual(SESSION_SIZE);
      expect(pickSessionItems(lesson!)).toHaveLength(SESSION_SIZE);
    }
  });

  it("gives every item an answer the grader accepts", () => {
    for (let level = 1; level <= LEVELS_PER_SUBJECT; level += 1) {
      for (const item of findLesson("berhitung", level)!.pool) {
        expect(isCorrectAnswer(item.answers[0], item.answers)).toBe(true);
      }
    }
  });

  it("checks addition and comparison answers against the pictures", () => {
    for (const item of findLesson("berhitung", 5)!.pool) {
      if (item.picture.kind !== "sum") throw new Error("level 5 must be sums");
      expect(item.answers[0]).toBe(String(item.picture.a + item.picture.b));
      expect(item.picture.a + item.picture.b).toBeLessThanOrEqual(10);
    }
    for (const item of findLesson("berhitung", 3)!.pool) {
      if (item.picture.kind !== "compare") throw new Error("level 3 must be comparisons");
      const { left, right } = item.picture;
      const asksMore = item.question.includes("banyak");
      expect(item.answers[0]).toBe((left > right) === asksMore ? "kiri" : "kanan");
    }
  });
});

describe("level progression", () => {
  it("opens the next level only after the previous one is passed", () => {
    expect(isUnlocked("berhitung", 1, [])).toBe(true);
    expect(isUnlocked("berhitung", 2, [])).toBe(false);
    expect(isUnlocked("berhitung", 2, ["berhitung-1"])).toBe(true);
    expect(nextLevel("berhitung", ["berhitung-1", "berhitung-2"])).toBe(3);
    expect(completedCount("berhitung", ["berhitung-1", "membaca-1"])).toBe(1);
  });

  it("keeps levels that are not built yet locked", () => {
    expect(isUnlocked("membaca", 6, ["membaca-5"])).toBe(false);
  });

  it("builds all five levels of every subject", () => {
    for (const subject of ["berhitung", "membaca", "inggris"] as const) {
      for (let level = 1; level <= LEVELS_PER_SUBJECT; level += 1) {
        const lesson = findLesson(subject, level);
        expect(lesson, `${subject}-${level}`).toBeDefined();
        expect(lesson!.pool.length).toBeGreaterThanOrEqual(SESSION_SIZE);
      }
    }
  });

  it("passes at 80% and awards stars", () => {
    expect(starsFor(5, 5)).toEqual({ passed: true, stars: 3 });
    expect(starsFor(4, 5)).toEqual({ passed: true, stars: 2 });
    expect(starsFor(3, 5)).toEqual({ passed: false, stars: 1 });
  });
});
