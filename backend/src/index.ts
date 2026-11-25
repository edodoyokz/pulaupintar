import Anthropic from "@anthropic-ai/sdk";
import { Hono } from "hono";
import { validateSpeechRequest } from "./safety";
import { synthesize, transcribe } from "./speech";
import {
  claudeModel,
  openAiCompatibleModel,
  qwenGuardModel,
  runTutorTurn,
  SAFETY_OUTPUT_SCHEMA,
  safetyGuard,
  withFallback,
  type OpenAiCompatibleProvider,
  type SafetyGuard,
  type TutorModel,
} from "./tutor";
import type { Env, SttRequest, TtsRequest, TutorTurnRequest } from "./types";

const MAX_AUDIO_BASE64_CHARS = 1_500_000; // about 1 MB of audio, far above a child's short answer

const apiKeyFor = (env: Env, provider: OpenAiCompatibleProvider) =>
  (provider === "sumopod" ? env.SUMOPOD_API_KEY : env.POLLINATIONS_API_KEY) ?? "";

const backupModel = (
  env: Env,
  provider: OpenAiCompatibleProvider | undefined,
  model: string | undefined,
  schema?: { name: string; schema: object },
): TutorModel | undefined =>
  provider ? openAiCompatibleModel({ provider, apiKey: apiKeyFor(env, provider), model, schema }) : undefined;

const tutorModelFor = (env: Env): TutorModel => {
  const backup = backupModel(env, env.TUTOR_FALLBACK_PROVIDER, env.TUTOR_FALLBACK_MODEL);
  if (env.TUTOR_PROVIDER === "claude") {
    return withFallback(claudeModel(new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })), backup);
  }
  const provider = env.TUTOR_PROVIDER === "sumopod" ? "sumopod" : "pollinations";
  const primary = openAiCompatibleModel({
    provider,
    apiKey: apiKeyFor(env, provider),
    model: env.TUTOR_MODEL,
    reasoningEffort: env.TUTOR_REASONING_EFFORT,
  });
  return withFallback(primary, backup);
};

/** Backup safety checker; a Qwen3Guard model is called in its own classifier format. */
const safetyBackup = (env: Env): TutorModel | undefined => {
  const provider = env.SAFETY_FALLBACK_PROVIDER;
  const model = env.SAFETY_FALLBACK_MODEL;
  if (!provider) return undefined;
  if (model?.includes("qwen3guard")) return qwenGuardModel({ provider, apiKey: apiKeyFor(env, provider), model });
  return backupModel(env, provider, model, SAFETY_OUTPUT_SCHEMA);
};

const safetyGuardFor = (env: Env): SafetyGuard | undefined => {
  if (!env.SAFETY_MODEL) return undefined;
  const provider = env.SAFETY_PROVIDER ?? (env.TUTOR_PROVIDER === "sumopod" ? "sumopod" : "pollinations");
  const primary = openAiCompatibleModel({
    provider,
    apiKey: apiKeyFor(env, provider),
    model: env.SAFETY_MODEL,
    schema: SAFETY_OUTPUT_SCHEMA,
  });
  return safetyGuard(withFallback(primary, safetyBackup(env)));
};

const app = new Hono<{ Bindings: Env }>();

app.get("/health", (c) => c.json({ ok: true }));

// Every other route needs the app's shared token, so the AI keys can't be used by strangers.
app.use("/v1/*", async (c, next) => {
  if (!c.env.APP_TOKEN || c.req.header("x-app-token") !== c.env.APP_TOKEN) {
    return c.json({ error: "unauthorized" }, 401);
  }
  await next();
});

app.post("/v1/tutor/turn", async (c) => {
  const request = await c.req.json<TutorTurnRequest>();
  return c.json(await runTutorTurn(tutorModelFor(c.env), request, safetyGuardFor(c.env)));
});

app.post("/v1/tts", async (c) => {
  const { segments: requested } = await c.req.json<TtsRequest>();
  // Only short, filtered lines can be voiced, so the app token can't run up the TTS bill or speak anything.
  const segments = validateSpeechRequest(requested);
  if (!segments) {
    return c.json({ error: "segments missing, too long, or not allowed" }, 400);
  }
  const audioBase64 = await synthesize(c.env, segments);
  return c.json({ audioBase64, mimeType: "audio/mpeg" });
});

app.post("/v1/stt", async (c) => {
  const request = await c.req.json<SttRequest>();
  if (!request.audioBase64 || request.audioBase64.length > MAX_AUDIO_BASE64_CHARS) {
    return c.json({ error: "audio missing or too long" }, 400);
  }
  return c.json({ transcript: await transcribe(c.env, request) });
});

app.onError((error, c) => {
  console.error(JSON.stringify({ event: "error", path: c.req.path, message: error.message }));
  return c.json({ error: "internal" }, 500);
});

export default app;
