/**
 * Live audio levels for Kak Pinta's face: how loud the tutor's voice is while it plays, and how loud
 * the child is while they speak. Both are read from a real AnalyserNode on the audio graph, so the
 * mouth follows the voice instead of a canned loop.
 */
import type { AnalyserNode as AudioApiAnalyser } from "react-native-audio-api";
type Listener = (level: number) => void;
/** Only the members the meter needs, so the DOM AnalyserNode type does not leak into the app. */
export type LevelAnalyser = Pick<AudioApiAnalyser, "fftSize" | "getFloatTimeDomainData">;

/** 0..1 from a window of samples: RMS scaled by a fixed reference, so a quiet voice still opens the mouth. */
export const levelFromSamples = (samples: Float32Array): number => {
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  const rms = Math.sqrt(sum / Math.max(1, samples.length));
  return Math.min(1, rms * 3.4);
};

/** How often the level is sampled. 30 Hz is enough for a mouth and cheap on a mid-range phone. */
const INTERVAL_MS = 33;

const levels = { speech: 0, listen: 0 };
const subscribers = { speech: new Set<Listener>(), listen: new Set<Listener>() };

export const getAudioLevel = (channel: "speech" | "listen") => levels[channel];

export const subscribeAudioLevel = (channel: "speech" | "listen", listener: Listener) => {
  subscribers[channel].add(listener);
  listener(levels[channel]);
  return () => {
    subscribers[channel].delete(listener);
  };
};

const emit = (channel: "speech" | "listen", level: number) => {
  const next = Math.max(0, Math.min(1, level));
  levels[channel] = next;
  for (const listener of subscribers[channel]) listener(next);
};

/** Reads an analyser until stopped. Returns a stop function. */
export const meterAnalyser = (channel: "speech" | "listen", analyser: LevelAnalyser) => {
  analyser.fftSize = 512;
  const window = new Float32Array(analyser.fftSize);
  const timer = setInterval(() => {
    analyser.getFloatTimeDomainData(window);
    emit(channel, levelFromSamples(window));
  }, INTERVAL_MS);
  return () => {
    clearInterval(timer);
    emit(channel, 0);
  };
};

/** For sources without an analyser (platform TTS), a plain value setter keeps the mouth moving. */
export const setAudioLevel = (channel: "speech" | "listen", level: number) => emit(channel, level);
