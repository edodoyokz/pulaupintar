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
import { Platform } from "react-native";
import { requestSpeech, requestTranscript } from "@/api/client";
import type { Lang, SpeechSegment, SttEncoding } from "@/api/types";

const SAMPLE_RATE = 16_000;

// Formats the speech-to-text service reads directly: AMR-WB on Android, WAV (PCM) on iOS.
const RECORDING_OPTIONS: RecordingOptions = {
  extension: Platform.OS === "ios" ? ".wav" : ".amr",
  sampleRate: SAMPLE_RATE,
  numberOfChannels: 1,
  bitRate: 23_850,
  android: { outputFormat: "amrwb", audioEncoder: "amr_wb" },
  ios: {
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: AudioQuality.HIGH,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {},
};

const ENCODING: SttEncoding = Platform.OS === "ios" ? "LINEAR16" : "AMR_WB";

export const prepareAudio = async (): Promise<boolean> => {
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

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      subscription.remove();
      player.remove();
      if (stopActiveClip === stop) stopActiveClip = null;
      if (error) reject(error);
      else resolve();
    };
    const stop = () => finish();

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
    player.play();
  });

/** Silences Kak Pinta right away, cloud voice and device voice alike. */
export const stopSpeaking = () => {
  speechGeneration += 1;
  stopActiveClip?.();
  Speech.stop();
};

// Device voice, used only when the cloud voice can't be reached.
const speakOnDevice = (segments: SpeechSegment[]) =>
  segments.reduce<Promise<void>>(
    (previous, segment) =>
      previous.then(
        () =>
          new Promise<void>((resolve) => {
            Speech.speak(segment.text, {
              language: segment.lang === "en" ? "en-US" : "id-ID",
              rate: 0.9,
              onDone: resolve,
              onError: () => resolve(),
              onStopped: resolve,
            });
          }),
      ),
    Promise.resolve(),
  );

export const speak = async (segments: SpeechSegment[]): Promise<void> => {
  const generation = speechGeneration;
  try {
    const { audioBase64 } = await requestSpeech(segments);
    if (generation !== speechGeneration) return;
    const file = new File(Paths.cache, `tutor-${Date.now()}.mp3`);
    file.create();
    await file.write(audioBase64, { encoding: "base64" });
    try {
      await playFile(file.uri);
    } finally {
      file.delete();
    }
  } catch {
    if (generation !== speechGeneration) return;
    await speakOnDevice(segments);
  }
};

export const useChildMicrophone = () => {
  const recorder = useAudioRecorder(RECORDING_OPTIONS);

  const start = async () => {
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  /** Throws when the recording or the speech-to-text call fails, so a failure never counts as a wrong answer. */
  const stopAndTranscribe = async (expect: Lang, hints: string[]): Promise<string> => {
    await recorder.stop();
    if (!recorder.uri) throw new Error("nothing was recorded");
    const audioBase64 = await new File(recorder.uri).base64();
    const { transcript } = await requestTranscript({
      audioBase64,
      encoding: ENCODING,
      sampleRateHertz: SAMPLE_RATE,
      expect,
      hints,
    });
    return transcript;
  };

  const cancel = async () => {
    if (recorder.isRecording) await recorder.stop().catch(() => undefined);
  };

  return { start, stopAndTranscribe, cancel };
};
