import { Hono, type Context, type MiddlewareHandler } from "hono";
import { validateSpeechRequest } from "./safety";
import { synthesize, transcribe } from "./speech";
import { runLiveRelay, type RelaySocket } from "./live-relay";
import { parseListenHints } from "./live-setup";
import { connectLive, synthesizeWithGemini, transcribeWithGemini } from "./gemini-speech";
import {
  openAiCompatibleModel,
  isSafetyReply,
  isTutorReply,
  jevGuardModel,
  qwenGuardModel,
  runTutorTurn,
  SAFETY_BACKUP_TIMEOUT_MS,
  SAFETY_CALL_TIMEOUT_MS,
  TUTOR_BACKUP_TIMEOUT_MS,
  SAFETY_OUTPUT_SCHEMA,
  safetyGuard,
  withFallback,
  type OpenAiCompatibleProvider,
  type SafetyGuard,
  type TutorModel,
} from "./tutor";
import type { Env, SttRequest, TtsRequest, TutorTurnRequest } from "./types";

const MAX_AUDIO_BASE64_CHARS = 1_500_000; // about 1 MB of audio, far above a child's short answer
const MAX_JSON_BODY_BYTES = 8 * 1024;
const MAX_AUDIO_BODY_BYTES = 2 * 1024 * 1024;
const VALID_STT_ENCODINGS = new Set<string>(["AMR_WB", "LINEAR16", "AAC"]);
const MAX_HINTS = 50;
const MAX_HINT_CHARS = 40;
const VALID_SUBJECTS = new Set(["berhitung", "membaca", "inggris"]);
const VALID_STEP_KINDS = new Set(["teach", "ask", "praise", "hint", "reveal", "wrapup"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readJson = async <T>(c: Context<{ Bindings: Env }>): Promise<T | null> => {
  try {
    return await c.req.json<T>();
  } catch {
    return null;
  }
};

export const validateTutorTurnRequest = (body: unknown): TutorTurnRequest | null => {
  if (!isRecord(body)) return null;
  const { child, subject, lesson, step } = body;
  if (!isRecord(child) || typeof child.name !== "string") return null;
  const name = child.name.trim();
  if (name.length === 0 || name.length > 60) return null;
  if (typeof child.age !== "number" || !Number.isFinite(child.age) || child.age < 1 || child.age > 18) return null;
  if (typeof subject !== "string" || !VALID_SUBJECTS.has(subject)) return null;
  if (!isRecord(lesson) || typeof lesson.title !== "string" || typeof lesson.goal !== "string") return null;
  if (lesson.title.trim().length === 0 || lesson.goal.trim().length === 0) return null;
  if (lesson.title.length > 120 || lesson.goal.length > 120) return null;
  if (!isRecord(step) || typeof step.kind !== "string" || !VALID_STEP_KINDS.has(step.kind)) return null;

  let validItem: TutorTurnRequest["step"]["item"];
  if (step.item !== undefined) {
    if (!isRecord(step.item) || typeof step.item.question !== "string" || !Array.isArray(step.item.answers)) return null;
    if (step.item.question.length > 200) return null;
    if (step.item.answers.length === 0 || step.item.answers.length > 20) return null;
    if (!step.item.answers.every((answer) => typeof answer === "string" && answer.length <= 40)) return null;
    if (step.item.visual !== undefined && (typeof step.item.visual !== "string" || step.item.visual.length > 200)) return null;
    validItem = {
      question: step.item.question,
      answers: step.item.answers,
      ...(step.item.visual !== undefined ? { visual: step.item.visual } : {}),
    };
  }
  if (step.childSaid !== undefined && (typeof step.childSaid !== "string" || step.childSaid.length > 200)) return null;
  if (step.attempt !== undefined && (typeof step.attempt !== "number" || !Number.isInteger(step.attempt) || step.attempt < 1 || step.attempt > 10)) return null;

  return {
    child: { name, age: child.age },
    subject: subject as TutorTurnRequest["subject"],
    lesson: { title: lesson.title, goal: lesson.goal },
    step: {
      kind: step.kind as TutorTurnRequest["step"]["kind"],
      ...(validItem ? { item: validItem } : {}),
      ...(step.childSaid !== undefined ? { childSaid: step.childSaid } : {}),
      ...(step.attempt !== undefined ? { attempt: step.attempt } : {}),
    },
  };
};

export const validateSttRequest = (body: unknown): SttRequest | null => {
  if (!isRecord(body)) return null;
  const { audioBase64, encoding, sampleRateHertz, expect, hints } = body;
  if (typeof audioBase64 !== "string" || audioBase64.length === 0 || audioBase64.length > MAX_AUDIO_BASE64_CHARS) return null;
  if (typeof encoding !== "string" || !VALID_STT_ENCODINGS.has(encoding)) return null;
  if (typeof sampleRateHertz !== "number" || !Number.isInteger(sampleRateHertz) || sampleRateHertz <= 0) return null;
  if (expect !== "id" && expect !== "en") return null;
  if (hints !== undefined) {
    if (!Array.isArray(hints) || hints.length > MAX_HINTS) return null;
    if (!hints.every((hint) => typeof hint === "string" && hint.length <= MAX_HINT_CHARS)) return null;
  }
  return {
    audioBase64,
    encoding: encoding as SttRequest["encoding"],
    sampleRateHertz,
    expect,
    ...(hints !== undefined ? { hints: hints as string[] } : {}),
  };
};

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
    reasoningEffort: env.TUTOR_FALLBACK_REASONING_EFFORT,
    timeoutMs: TUTOR_BACKUP_TIMEOUT_MS,
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

/** A safety checker; Qwen3Guard and Jev models are called in their own formats. */
const safetyChecker = (
  env: Env,
  provider: OpenAiCompatibleProvider,
  model: string | undefined,
  timeoutMs: number,
  reasoningEffort?: string,
): TutorModel => {
  const apiKey = apiKeyFor(env, provider);
  if (model?.toLowerCase().includes("qwen3guard")) return qwenGuardModel({ provider, apiKey, model, timeoutMs });
  if (model?.toLowerCase().startsWith("jev-")) return jevGuardModel({ provider, apiKey, model, timeoutMs });
  return openAiCompatibleModel({ provider, apiKey, model, schema: SAFETY_OUTPUT_SCHEMA, timeoutMs, reasoningEffort });
};

/** Without a safety model nothing may be spoken from the tutor: the guard blocks every line, so children hear the prepared lines. */
export const safetyGuardFor = (env: Env): SafetyGuard => {
  if (!env.SAFETY_MODEL) {
    return async () => {
      console.error(JSON.stringify({ event: "safety_unconfigured" }));
      return false;
    };
  }
  const primary = safetyChecker(env, providerOrDefault(env, env.SAFETY_PROVIDER), env.SAFETY_MODEL, SAFETY_CALL_TIMEOUT_MS);
  const backupProvider = env.SAFETY_FALLBACK_PROVIDER;
  const backup = backupProvider
    ? safetyChecker(env, backupProvider, env.SAFETY_FALLBACK_MODEL, SAFETY_BACKUP_TIMEOUT_MS, env.SAFETY_FALLBACK_REASONING_EFFORT)
    : undefined;
  return safetyGuard(withFallback(primary, backup, isSafetyReply));
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

const warnedMissingLimiters = new Set<string>();

/** Per-IP, per-route-group limit. A missing binding (local `wrangler dev`) logs once and lets the request through. */
const rateLimit = (binding: "TURN_LIMITER" | "SPEECH_LIMITER" | "LIVE_LIMITER", group: string): MiddlewareHandler<{ Bindings: Env }> =>
  async (c, next) => {
    const limiter = c.env[binding];
    if (!limiter) {
      if (!warnedMissingLimiters.has(binding)) {
        warnedMissingLimiters.add(binding);
        console.warn(JSON.stringify({ event: "rate_limit_unconfigured", binding }));
      }
      return next();
    }
    const { success } = await limiter.limit({ key: `${group}:${c.req.header("cf-connecting-ip") ?? "unknown"}` });
    if (!success) return c.json({ error: "rate limited" }, 429);
    return next();
  };

/** Rejects a body over `maxBytes` with 413 before anything parses it, by its content-length and by what is actually read. */
const limitBody = (maxBytes: number): MiddlewareHandler<{ Bindings: Env }> => async (c, next) => {
  const tooLarge = () => c.json({ error: "payload too large" }, 413);
  const declared = Number(c.req.header("content-length"));
  if (declared > maxBytes) return tooLarge();
  const body = c.req.raw.body;
  if (!body) return next();
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBytes) {
      await reader.cancel();
      return tooLarge();
    }
    chunks.push(value);
  }
  c.req.raw = new Request(c.req.raw, { body: new Blob(chunks) });
  return next();
};

app.use("/v1/tutor/turn", rateLimit("TURN_LIMITER", "turn"), limitBody(MAX_JSON_BODY_BYTES));
app.use("/v1/tts", rateLimit("SPEECH_LIMITER", "speech"), limitBody(MAX_JSON_BODY_BYTES));
app.use("/v1/stt", rateLimit("SPEECH_LIMITER", "speech"), limitBody(MAX_AUDIO_BODY_BYTES));
// Only websocket upgrades count; a plain GET is answered with 426 below.
app.use("/v1/live/*", async (c, next) =>
  c.req.header("upgrade")?.toLowerCase() === "websocket" ? rateLimit("LIVE_LIMITER", "live")(c, next) : next(),
);

app.post("/v1/tutor/turn", async (c) => {
  const raw = await readJson<unknown>(c);
  const request = validateTutorTurnRequest(raw);
  if (!request) {
    return c.json({ error: "invalid request" }, 400);
  }
  return c.json(await runTutorTurn(tutorModelFor(c.env), request, safetyGuardFor(c.env)));
});

app.post("/v1/tts", async (c) => {
  const body = await readJson<Partial<TtsRequest>>(c);
  // Only short, filtered lines can be voiced, so the app token can't run up the TTS bill or speak anything.
  const segments = validateSpeechRequest(body?.segments);
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
  const request = validateSttRequest(await readJson<unknown>(c));
  if (!request) {
    return c.json({ error: "invalid audio request" }, 400);
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
  // The listener's lesson language and answer words (?lang=id&word=dua&word=tiga), checked before Gemini sees them.
  const hints = role === "listen" ? parseListenHints(c.req.query("lang"), c.req.queries("word") ?? []) : undefined;
  const upstream = await connectLive(c.env);
  const { 0: client, 1: server } = new WebSocketPair();
  server.accept();
  runLiveRelay(c.env, role, server as unknown as RelaySocket, upstream, hints);
  return new Response(null, { status: 101, webSocket: client });
};
app.get("/v1/live/speak", liveRoute("speak"));
app.get("/v1/live/listen", liveRoute("listen"));

app.onError((error, c) => {
  console.error(JSON.stringify({ event: "error", path: c.req.path, message: error.message }));
  return c.json({ error: "internal" }, 500);
});

export default app;
