import type { Env, SpeechSegment, SttRequest } from "./types";

const TTS_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";
const STT_URL = "https://speech.googleapis.com/v1p1beta1/speech:recognize";

const LANGUAGE_CODES = { id: "id-ID", en: "en-US" } as const;

const voiceFor = (env: Env, lang: SpeechSegment["lang"]) => {
  const name = lang === "id" ? env.TTS_VOICE_ID : env.TTS_VOICE_EN;
  return name
    ? { languageCode: LANGUAGE_CODES[lang], name }
    : { languageCode: LANGUAGE_CODES[lang], ssmlGender: "FEMALE" };
};

const base64ToBytes = (base64: string): Uint8Array =>
  Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return btoa(binary);
};

const synthesizeSegment = async (env: Env, segment: SpeechSegment): Promise<Uint8Array> => {
  const response = await fetch(TTS_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": env.GOOGLE_CLOUD_API_KEY ?? "" },
    body: JSON.stringify({
      input: { text: segment.text },
      voice: voiceFor(env, segment.lang),
      audioConfig: { audioEncoding: "MP3", speakingRate: 0.9, pitch: 2 },
    }),
  });
  if (!response.ok) throw new Error(`TTS failed: ${response.status} ${await response.text()}`);
  const { audioContent } = (await response.json()) as { audioContent: string };
  return base64ToBytes(audioContent);
};

/**
 * Each segment is voiced in its own language, so English words get English
 * pronunciation. MP3 frames can be concatenated, which gives the app one clip.
 */
export const synthesize = async (env: Env, segments: SpeechSegment[]): Promise<string> => {
  const clips = await Promise.all(segments.map((segment) => synthesizeSegment(env, segment)));
  const total = clips.reduce((sum, clip) => sum + clip.length, 0);
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const clip of clips) {
    joined.set(clip, offset);
    offset += clip.length;
  }
  const characters = segments.reduce((sum, segment) => sum + segment.text.length, 0);
  console.log(JSON.stringify({ event: "cost", kind: "tts", characters }));
  return bytesToBase64(joined);
};

export const transcribe = async (env: Env, request: SttRequest): Promise<string> => {
  const primary = LANGUAGE_CODES[request.expect];
  const secondary = request.expect === "id" ? LANGUAGE_CODES.en : LANGUAGE_CODES.id;
  const response = await fetch(STT_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": env.GOOGLE_CLOUD_API_KEY ?? "" },
    body: JSON.stringify({
      config: {
        encoding: request.encoding,
        sampleRateHertz: request.sampleRateHertz,
        languageCode: primary,
        alternativeLanguageCodes: [secondary],
        // Expected answers bias recognition toward short, child-spoken words.
        speechContexts: request.hints?.length ? [{ phrases: request.hints.slice(0, 50), boost: 15 }] : [],
        maxAlternatives: 1,
      },
      audio: { content: request.audioBase64 },
    }),
  });
  if (!response.ok) throw new Error(`STT failed: ${response.status} ${await response.text()}`);
  const body = (await response.json()) as {
    results?: { alternatives?: { transcript?: string }[] }[];
    totalBilledTime?: string;
  };
  console.log(JSON.stringify({ event: "cost", kind: "stt", billed: body.totalBilledTime ?? "0s" }));
  return (body.results ?? [])
    .map((result) => result.alternatives?.[0]?.transcript ?? "")
    .join(" ")
    .trim();
};
