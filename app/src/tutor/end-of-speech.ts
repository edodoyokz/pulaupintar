/**
 * Decides when a child has finished answering, from the microphone level (0..1, about 10 readings a
 * second), so a 4-year-old only has to press the microphone once.
 *
 * - "ended": the child spoke and then stayed quiet for a moment, or the answer ran too long.
 * - "silent": nothing was said at all; the caller asks again instead of counting a wrong answer.
 */
export type EndOfSpeechResult = "listening" | "ended" | "silent";

export type EndOfSpeechOptions = {
  /** Quiet time after speech that ends the answer. */
  pauseMs: number;
  /** Loud time needed before the quiet counts as the end of an answer, so a cough is not an answer. */
  minSpeechMs: number;
  /** Hard cap on one answer; also keeps the microphone from staying open when the child walks away. */
  maxMs: number;
  /** Give up when nothing louder than the room was heard for this long. */
  silentMs: number;
  /** A level counts as speech above max(minThreshold, room floor x floorFactor), never above maxThreshold. */
  minThreshold: number;
  floorFactor: number;
  /** Caps the threshold, because a child who talks from the first moment sets the "room" floor to their own voice. */
  maxThreshold: number;
};

export const END_OF_SPEECH_DEFAULTS: EndOfSpeechOptions = {
  pauseMs: 1_200,
  minSpeechMs: 250,
  maxMs: 8_000,
  silentMs: 7_000,
  minThreshold: 0.1,
  floorFactor: 3,
  maxThreshold: 0.25,
};

export const createEndOfSpeech = (startedAt: number, options: EndOfSpeechOptions = END_OF_SPEECH_DEFAULTS) => {
  let floor = Number.POSITIVE_INFINITY;
  let lastAt = startedAt;
  let loudMs = 0;
  let lastLoudAt = startedAt;

  return (level: number, now: number): EndOfSpeechResult => {
    const elapsed = now - startedAt;
    const step = Math.max(0, now - lastAt);
    lastAt = now;

    // The quietest reading so far is the room; a child talking is several times louder.
    floor = Math.min(floor, level);
    const threshold = Math.min(options.maxThreshold, Math.max(options.minThreshold, floor * options.floorFactor));
    if (level >= threshold) {
      loudMs += step;
      lastLoudAt = now;
    }

    const heardSpeech = loudMs >= options.minSpeechMs;
    if (heardSpeech && now - lastLoudAt >= options.pauseMs) return "ended";
    if (elapsed >= options.maxMs) return heardSpeech ? "ended" : "silent";
    if (!heardSpeech && elapsed >= options.silentMs) return "silent";
    return "listening";
  };
};
