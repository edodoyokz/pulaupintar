import {
  AudioQuality,
  createAudioPlayer,
  IOSOutputFormat,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  type RecordingOptions,
} from "expo-audio";
import { File, Paths } from "expo-file-system";
import * as Speech from "expo-speech";
import { useRef } from "react";
import { Platform } from "react-native";
import { requestSpeech, requestTranscript } from "@/api/client";
import type { ListenHints, SpeechSegment, SttEncoding } from "@/api/types";
import { levelFromSamples, meterSyllables, setAudioLevel } from "./live/levels";

const SAMPLE_RATE = 16_000;

// Gemini Live streaming needs a native audio module, so it only exists in a development or release build.
// Expo Go, a missing module or EXPO_PUBLIC_VOICE=rest all fall back to the request-and-reply voice.
type LiveVoice = { speaker: import("./live/speaker").LiveSpeaker; Listener: typeof import("./live/listener").LiveListener };
let liveVoice: LiveVoice | null | undefined;
const getLiveVoice = (): LiveVoice | null => {
  if (liveVoice !== undefined) return liveVoice;
  if (process.env.EXPO_PUBLIC_VOICE === "rest") return (liveVoice = null);
  try {
    const { LiveSpeaker } = require("./live/speaker") as typeof import("./live/speaker");
    const { LiveListener } = require("./live/listener") as typeof import("./live/listener");
    liveVoice = { speaker: new LiveSpeaker(), Listener: LiveListener };
  } catch {
    liveVoice = null;
  }
  return liveVoice;
};
/** Turned off for the rest of the run when the live microphone can't start, so the child is not stuck. */
let liveListeningBroken = false;
let liveFailures = 0;

// Formats the speech-to-text service reads directly. Gemini: AAC (ADTS) on Android, WAV (PCM) on iOS.
// Google Cloud Speech (EXPO_PUBLIC_SPEECH=google, with SPEECH_PROVIDER=google on the backend): AMR-WB on Android.
const USE_GOOGLE_STT = process.env.EXPO_PUBLIC_SPEECH === "google";
const RECORDING_OPTIONS: RecordingOptions = {
  extension: Platform.OS === "ios" ? ".wav" : USE_GOOGLE_STT ? ".amr" : ".aac",
  sampleRate: SAMPLE_RATE,
  numberOfChannels: 1,
  bitRate: Platform.OS === "android" && !USE_GOOGLE_STT ? 64_000 : 23_850,
  android: USE_GOOGLE_STT ? { outputFormat: "amrwb", audioEncoder: "amr_wb" } : { outputFormat: "aac_adts", audioEncoder: "aac" },
  ios: {
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: AudioQuality.HIGH,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  // The level drives Kak Pinta's crest and the automatic end of the child's answer on this path too.
  isMeteringEnabled: true,
  web: {},
};

const ENCODING: SttEncoding = Platform.OS === "ios" ? "LINEAR16" : USE_GOOGLE_STT ? "AMR_WB" : "AAC";

export const prepareAudio = async (): Promise<boolean> => {
  const live = getLiveVoice();
  if (live && !liveListeningBroken) {
    try {
      const { AudioManager } = require("react-native-audio-api") as typeof import("react-native-audio-api");
      AudioManager.setSystemOptions({ ios: { category: "playAndRecord", mode: "spokenAudio", options: ["defaultToSpeaker", "allowBluetoothA2DP"] } });
      return await live.Listener.requestPermission();
    } catch {
      liveListeningBroken = true;
    }
  }
  const permission = await requestRecordingPermissionsAsync();
  await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: permission.granted });
  return permission.granted;
};

const LOAD_TIMEOUT_MS = 8_000;
const END_GRACE_MS = 3_000;

// The clip playing now, so a lesson can silence Kak Pinta when the child leaves.
let stopActiveClip: (() => void) | null = null;
// Bumped by stopSpeaking, so a speak() that was cut short does not fall back to the device voice.
let speechGeneration = 0;

/**
 * Resolves when the clip ends, is stopped, or stalls past its length.
 * Rejects when the clip never loads, so the caller can use the device voice.
 */
const playFile = (uri: string) =>
  new Promise<void>((resolve, reject) => {
    const player = createAudioPlayer({ uri });
    let settled = false;
    let timer = setTimeout(() => finish(new Error("audio did not load")), LOAD_TIMEOUT_MS);
    // The beak keeps a syllable rhythm until the player hands over real samples, if it ever does.
    let stopSyllables: (() => void) | null = null;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      subscription.remove();
      samples?.remove();
      stopSyllables?.();
      setAudioLevel("speech", 0);
      player.remove();
      if (stopActiveClip === stop) stopActiveClip = null;
      if (error) reject(error);
      else resolve();
    };
    const stop = () => finish();

    let samples: { remove: () => void } | null = null;
    if (player.isAudioSamplingSupported) {
      try {
        player.setAudioSamplingEnabled(true);
        samples = player.addListener("audioSampleUpdate", (sample) => {
          stopSyllables?.();
          stopSyllables = null;
          const frames = sample.channels[0]?.frames;
          if (frames) setAudioLevel("speech", levelFromSamples(frames));
        });
      } catch {
        samples = null;
      }
    }

    const subscription = player.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish) {
        finish();
        return;
      }
      if (status.isLoaded && status.duration > 0) {
        // Loaded: wait at most the clip length plus a grace period (covers calls and lost audio focus).
        clearTimeout(timer);
        const remainingMs = Math.max(0, (status.duration - status.currentTime) * 1000);
        timer = setTimeout(() => finish(), remainingMs + END_GRACE_MS);
      }
    });

    stopActiveClip?.();
    stopActiveClip = stop;
    stopSyllables = meterSyllables("speech");
    player.play();
  });

/** Silences Kak Pinta right away, cloud voice and device voice alike. */
export const stopSpeaking = () => {
  speechGeneration += 1;
  stopActiveClip?.();
  getLiveVoice()?.speaker.stop();
  Speech.stop();
};

// Device voice, used only when the cloud voice can't be reached.
// Checks the generation before each segment, so stopSpeaking also cancels the segments not yet spoken.
const speakOnDevice = async (segments: SpeechSegment[], generation: number) => {
  for (const segment of segments) {
    if (generation !== speechGeneration) return;
    await new Promise<void>((resolve) => {
      const stopSyllables = meterSyllables("speech");
      const done = () => {
        stopSyllables();
        resolve();
      };
      Speech.speak(segment.text, {
        language: segment.lang === "en" ? "en-US" : "id-ID",
        rate: 0.9,
        onDone: done,
        onError: done,
        onStopped: done,
      });
    });
  }
};

/** Opens the voice session ahead of a line whose text is still being written by the tutor. */
export const prepareVoice = () => getLiveVoice()?.speaker.prepare();

/** The right-answer chime; silent where the native audio module is missing (Expo Go). */
export const playChime = () => getLiveVoice()?.speaker.chime();

/** `persist`: the text never changes (a teaching line, a retry), so its audio is kept for later runs. */
export const speak = async (segments: SpeechSegment[], options: { persist?: boolean } = {}): Promise<void> => {
  const generation = speechGeneration;
  const live = getLiveVoice();
  if (live) {
    try {
      await live.speaker.speak(segments, options);
      return;
    } catch {
      // Live can't be reached: fall back to the voice that comes back as a file.
      if (generation !== speechGeneration) return;
    }
  }
  try {
    const { audioBase64, mimeType } = await requestSpeech(segments);
    if (generation !== speechGeneration) return;
    const file = new File(Paths.cache, `tutor-${Date.now()}.${mimeType === "audio/wav" ? "wav" : "mp3"}`);
    file.create();
    await file.write(audioBase64, { encoding: "base64" });
    try {
      await playFile(file.uri);
    } finally {
      file.delete();
    }
  } catch {
    if (generation !== speechGeneration) return;
    await speakOnDevice(segments, generation);
  }
};

export const useChildMicrophone = () => {
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const liveListener = useRef<InstanceType<LiveVoice["Listener"]> | null>(null);
  const meterTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopMeter = () => {
    clearInterval(meterTimer.current ?? undefined);
    meterTimer.current = null;
    setAudioLevel("listen", 0);
  };
  // The start still in progress, so stop and cancel never run while the microphone is half started.
  const pendingStart = useRef<Promise<void> | null>(null);
  const settleStart = async () => {
    await pendingStart.current?.catch(() => undefined);
  };

  /** `hints`: the lesson's answer language and every word a child may answer with, so speech is heard in that language. */
  const startRecording = async (hints: ListenHints) => {
    const live = getLiveVoice();
    if (live && !liveListeningBroken) {
      const listener = new live.Listener();
      // Stored before the await, so leaving the lesson while the microphone starts still stops it.
      liveListener.current = listener;
      try {
        await listener.start(hints);
        return;
      } catch {
        liveListeningBroken = true;
        if (liveListener.current === listener) liveListener.current = null;
        await listener.cancel().catch(() => undefined);
      }
    }
    await recorder.prepareToRecordAsync();
    recorder.record();
    stopMeter();
    meterTimer.current = setInterval(() => {
      const decibels = recorder.getStatus().metering;
      // Metering is dBFS (0 is full scale); the same RMS scale as the live microphone.
      if (decibels !== undefined) setAudioLevel("listen", Math.min(1, 10 ** (decibels / 20) * 3.4));
    }, 100);
  };

  const start = (hints: ListenHints): Promise<void> => {
    const pending = startRecording(hints);
    pendingStart.current = pending;
    return pending;
  };

  /** Throws when the recording or the speech-to-text call fails, so a failure never counts as a wrong answer. */
  const stopAndTranscribe = async (hints: ListenHints): Promise<string> => {
    await settleStart();
    const listener = liveListener.current;
    if (listener) {
      liveListener.current = null;
      try {
        const transcript = await listener.stopAndTranscribe();
        liveFailures = 0;
        return transcript;
      } catch (error) {
        // Two failures in a row mean Live isn't reachable; use the recorder path from the next answer on.
        liveFailures += 1;
        if (liveFailures >= 2) liveListeningBroken = true;
        throw error;
      }
    }
    stopMeter();
    await recorder.stop();
    if (!recorder.uri) throw new Error("nothing was recorded");
    const audioBase64 = await new File(recorder.uri).base64();
    const { transcript } = await requestTranscript({
      audioBase64,
      encoding: ENCODING,
      sampleRateHertz: SAMPLE_RATE,
      expect: hints.lang,
      hints: hints.words,
    });
    return transcript;
  };

  const cancel = async () => {
    await settleStart();
    const listener = liveListener.current;
    liveListener.current = null;
    await listener?.cancel().catch(() => undefined);
    stopMeter();
    if (recorder.isRecording) await recorder.stop().catch(() => undefined);
  };

  return { start, stopAndTranscribe, cancel };
};
