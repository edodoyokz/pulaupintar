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

const playFile = (uri: string) =>
  new Promise<void>((resolve) => {
    const player = createAudioPlayer({ uri });
    const subscription = player.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish) {
        subscription.remove();
        player.remove();
        resolve();
      }
    });
    player.play();
  });

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
  try {
    const { audioBase64 } = await requestSpeech(segments);
    const file = new File(Paths.cache, `tutor-${Date.now()}.mp3`);
    file.create();
    await file.write(audioBase64, { encoding: "base64" });
    await playFile(file.uri);
    file.delete();
  } catch {
    await speakOnDevice(segments);
  }
};

export const useChildMicrophone = () => {
  const recorder = useAudioRecorder(RECORDING_OPTIONS);

  const start = async () => {
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const stopAndTranscribe = async (expect: Lang, hints: string[]): Promise<string> => {
    await recorder.stop();
    if (!recorder.uri) return "";
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

  return { start, stopAndTranscribe };
};
