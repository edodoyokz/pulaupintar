import Anthropic from "@anthropic-ai/sdk";
import { Hono } from "hono";
import { validateSpeechRequest } from "./safety";
import { synthesize, transcribe } from "./speech";
import { claudeModel, openAiCompatibleModel, runTutorTurn, type TutorModel } from "./tutor";
import type { Env, SttRequest, TtsRequest, TutorTurnRequest } from "./types";

const MAX_AUDIO_BASE64_CHARS = 1_500_000; // about 1 MB of audio, far above a child's short answer

const tutorModelFor = (env: Env): TutorModel => {
  if (env.TUTOR_PROVIDER === "claude") return claudeModel(new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }));
  const provider = env.TUTOR_PROVIDER === "sumopod" ? "sumopod" : "pollinations";
  return openAiCompatibleModel({
    provider,
    apiKey: (provider === "sumopod" ? env.SUMOPOD_API_KEY : env.POLLINATIONS_API_KEY) ?? "",
    model: env.TUTOR_MODEL,
    reasoningEffort: env.TUTOR_REASONING_EFFORT,
  });
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
  return c.json(await runTutorTurn(tutorModelFor(c.env), request));
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
