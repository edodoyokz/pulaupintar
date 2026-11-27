import { describe, expect, it } from "vitest";
import { createEndOfSpeech } from "../src/tutor/end-of-speech";

/** Feeds one level every 100 ms (the microphone chunk size) and returns the first non-listening result with its time. */
const run = (levels: number[]) => {
  const detect = createEndOfSpeech(0);
  for (const [index, level] of levels.entries()) {
    const at = (index + 1) * 100;
    const result = detect(level, at);
    if (result !== "listening") return { result, at };
  }
  return { result: "listening" as const, at: levels.length * 100 };
};

const repeat = (level: number, count: number) => Array.from({ length: count }, () => level);

describe("end of speech", () => {
  it("ends 1.2 s after the child stops talking", () => {
    const { result, at } = run([...repeat(0.02, 5), ...repeat(0.4, 8), ...repeat(0.03, 20)]);
    expect(result).toBe("ended");
    expect(at).toBe(1_300 + 1_200);
  });

  it("keeps listening through a short pause between words", () => {
    const { result } = run([...repeat(0.02, 3), ...repeat(0.4, 5), ...repeat(0.03, 8), ...repeat(0.4, 5)]);
    expect(result).toBe("listening");
  });

  it("does not take a single cough as an answer", () => {
    const { result, at } = run([...repeat(0.02, 3), 0.6, ...repeat(0.02, 80)]);
    expect(result).toBe("silent");
    expect(at).toBe(7_000);
  });

  it("reports silence when the child says nothing", () => {
    expect(run(repeat(0.02, 80))).toEqual({ result: "silent", at: 7_000 });
  });

  it("stops a long answer at 8 s", () => {
    expect(run(repeat(0.5, 100))).toEqual({ result: "ended", at: 8_000 });
  });

  it("raises the threshold in a noisy room so the room itself is not speech", () => {
    // Fan noise at 0.12 sits above the fixed minimum; the child at 0.6 is well above three times the floor.
    const { result, at } = run([...repeat(0.12, 10), ...repeat(0.6, 6), ...repeat(0.12, 15)]);
    expect(result).toBe("ended");
    expect(at).toBe(1_600 + 1_200);
  });
});
