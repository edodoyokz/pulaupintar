import { describe, expect, it } from "vitest";
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
  ])("%s vs %j -> %s", (said, answers, expected) => {
    expect(isCorrectAnswer(said, answers)).toBe(expected);
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
    expect(isUnlocked("membaca", 2, ["membaca-1"])).toBe(false);
  });

  it("passes at 80% and awards stars", () => {
    expect(starsFor(5, 5)).toEqual({ passed: true, stars: 3 });
    expect(starsFor(4, 5)).toEqual({ passed: true, stars: 2 });
    expect(starsFor(3, 5)).toEqual({ passed: false, stars: 1 });
  });
});
