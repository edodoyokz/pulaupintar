/**
 * Audio levels for Kak Pinta's face: how loud the tutor's voice is while it plays, and how loud the
 * child is while they speak. Kak Pinta reads them about 16 times a second, so the beak opens on
 * syllables and closes on pauses instead of flapping on a canned loop.
 */
import type { AnalyserNode as AudioApiAnalyser } from "react-native-audio-api";

export type LevelChannel = "speech" | "listen";

/** Only the members the meter needs, so the DOM AnalyserNode type does not leak into the app. */
export type LevelAnalyser = Pick<AudioApiAnalyser, "fftSize" | "getFloatTimeDomainData">;

/** 0..1 from a window of samples: RMS scaled by a fixed reference, so a quiet voice still opens the mouth. */
export const levelFromSamples = (samples: ArrayLike<number>): number => {
  let sum = 0;
  for (let index = 0; index < samples.length; index += 1) sum += samples[index] * samples[index];
  const rms = Math.sqrt(sum / Math.max(1, samples.length));
  return Math.min(1, rms * 3.4);
};

/** How often an analyser is read. 30 Hz is enough for a mouth and cheap on a mid-range phone. */
const INTERVAL_MS = 33;

const levels: Record<LevelChannel, number> = { speech: 0, listen: 0 };

export const getAudioLevel = (channel: LevelChannel) => levels[channel];

export const setAudioLevel = (channel: LevelChannel, level: number) => {
  levels[channel] = Math.max(0, Math.min(1, level));
};

/** Reads an analyser on the audio graph until stopped. Returns the stop function. */
export const meterAnalyser = (channel: LevelChannel, analyser: LevelAnalyser) => {
  analyser.fftSize = 512;
  const window = new Float32Array(analyser.fftSize);
  const timer = setInterval(() => {
    analyser.getFloatTimeDomainData(window);
    setAudioLevel(channel, levelFromSamples(window));
  }, INTERVAL_MS);
  return () => {
    clearInterval(timer);
    setAudioLevel(channel, 0);
  };
};

/** Syllable length in ms; Indonesian at the tutor's slow rate runs about 4 to 5 syllables a second. */
const SYLLABLE_MS = { min: 150, max: 260 };

/**
 * The device voice gives no audio to measure, so the beak follows a syllable rhythm instead:
 * open for most of each beat with a varied height, closed briefly between beats.
 * Returns the stop function.
 */
export const meterSyllables = (channel: LevelChannel, random: () => number = Math.random) => {
  let timer: ReturnType<typeof setTimeout>;
  const beat = () => {
    const length = SYLLABLE_MS.min + random() * (SYLLABLE_MS.max - SYLLABLE_MS.min);
    setAudioLevel(channel, 0.35 + random() * 0.5);
    timer = setTimeout(() => {
      setAudioLevel(channel, 0.05);
      timer = setTimeout(beat, length * 0.3);
    }, length * 0.7);
  };
  beat();
  return () => {
    clearTimeout(timer);
    setAudioLevel(channel, 0);
  };
};
