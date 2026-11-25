import { Hono, type Context } from "hono";
import { validateSpeechRequest } from "./safety";
import { synthesize, transcribe } from "./speech";
import { runLiveRelay, type RelaySocket } from "./live-relay";
import { connectLive, synthesizeWithGemini, transcribeWithGemini } from "./gemini-speech";
import {
  openAiCompatibleModel,
  isSafetyReply,
  isTutorReply,
  qwenGuardModel,
  runTutorTurn,
  SAFETY_CALL_TIMEOUT_MS,
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
  (provider === "sumopod" ? env.SUMOPOD_API_KEY : provider === "gemini" ? env.GEMINI_API_KEY : env.POLLINATIONS_API_KEY) ?? "";

/** The tutor's own provider unless a provider is named; "pollinations" when nothing is set. */
const providerOrDefault = (env: Env, named?: OpenAiCompatibleProvider): OpenAiCompatibleProvider =>
  named ?? (env.TUTOR_PROVIDER === "sumopod" || env.TUTOR_PROVIDER === "gemini" ? env.TUTOR_PROVIDER : "pollinations");

const tutorBackup = (env: Env): TutorModel | undefined => {
  const provider = env.TUTOR_FALLBACK_PROVIDER;
  if (!provider) return undefined;
  return openAiCompatibleModel({
    provider,
    apiKey: apiKeyFor(env, provider),
    model: env.TUTOR_FALLBACK_MODEL,
    reasoningEffort: env.TUTOR_REASONING_EFFORT,
  });
};

const tutorModelFor = (env: Env): TutorModel => {
  const backup = tutorBackup(env);
  const provider = providerOrDefault(env);
  const primary = openAiCompatibleModel({
    provider,
    apiKey: apiKeyFor(env, provider),
    model: env.TUTOR_MODEL,
    reasoningEffort: env.TUTOR_REASONING_EFFORT,
  });
  return withFallback(primary, backup, isTutorReply);
};

/** Backup safety checker; a Qwen3Guard model is called in its own classifier format. */
const safetyBackup = (env: Env): TutorModel | undefined => {
  const provider = env.SAFETY_FALLBACK_PROVIDER;
  const model = env.SAFETY_FALLBACK_MODEL;
  if (!provider) return undefined;
  const apiKey = apiKeyFor(env, provider);
  if (model?.toLowerCase().includes("qwen3guard")) return qwenGuardModel({ provider, apiKey, model });
  return openAiCompatibleModel({ provider, apiKey, model, schema: SAFETY_OUTPUT_SCHEMA, timeoutMs: SAFETY_CALL_TIMEOUT_MS });
};

const safetyGuardFor = (env: Env): SafetyGuard | undefined => {
  if (!env.SAFETY_MODEL) return undefined;
  const provider = providerOrDefault(env, env.SAFETY_PROVIDER);
  const primary = openAiCompatibleModel({
    provider,
    apiKey: apiKeyFor(env, provider),
    model: env.SAFETY_MODEL,
    schema: SAFETY_OUTPUT_SCHEMA,
    timeoutMs: SAFETY_CALL_TIMEOUT_MS,
  });
  return safetyGuard(withFallback(primary, safetyBackup(env), isSafetyReply));
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
  if (c.env.SPEECH_PROVIDER === "gemini") {
    return c.json({ audioBase64: await synthesizeWithGemini(c.env, segments), mimeType: "audio/wav" });
  }
  const audioBase64 = await synthesize(c.env, segments);
  return c.json({ audioBase64, mimeType: "audio/mpeg" });
});

app.post("/v1/stt", async (c) => {
  const request = await c.req.json<SttRequest>();
  if (!request.audioBase64 || request.audioBase64.length > MAX_AUDIO_BASE64_CHARS) {
    return c.json({ error: "audio missing or too long" }, 400);
  }
  if (c.env.SPEECH_PROVIDER === "gemini" && request.encoding === "AMR_WB") {
    // Gemini's transcription models don't list AMR-WB; the app records AAC for them.
    return c.json({ error: "AMR_WB is not supported with SPEECH_PROVIDER=gemini; record AAC" }, 400);
  }
  const transcript = c.env.SPEECH_PROVIDER === "gemini" ? await transcribeWithGemini(c.env, request) : await transcribe(c.env, request);
  return c.json({ transcript });
});

// Live voice: the phone streams to the Worker, which relays to Gemini Live with the key and a fixed setup,
// so the phone holds no Gemini token and every spoken line passes the same checks as /v1/tts.
const liveRoute = (role: "speak" | "listen") => async (c: Context<{ Bindings: Env }>) => {
  if (c.req.header("upgrade")?.toLowerCase() !== "websocket") return c.json({ error: "websocket required" }, 426);
  if (!c.env.GEMINI_API_KEY) return c.json({ error: "live voice not configured" }, 503);
  const upstream = await connectLive(c.env);
  const { 0: client, 1: server } = new WebSocketPair();
  server.accept();
  runLiveRelay(c.env, role, server as unknown as RelaySocket, upstream);
  return new Response(null, { status: 101, webSocket: client });
};
app.get("/v1/live/speak", liveRoute("speak"));
app.get("/v1/live/listen", liveRoute("listen"));

app.onError((error, c) => {
  console.error(JSON.stringify({ event: "error", path: c.req.path, message: error.message }));
  return c.json({ error: "internal" }, 500);
});

export default app;
