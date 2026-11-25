import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import app from "../src/index";
import { FALLBACK_LINES, filterSegments } from "../src/safety";
import {
  claudeModel,
  openAiCompatibleModel,
  qwenGuardModel,
  runTutorTurn,
  safetyGuard,
  withFallback,
  type TutorModel,
} from "../src/tutor";
import type { TutorTurnRequest } from "../src/types";

const turn: TutorTurnRequest = {
  child: { name: "Aya", age: 5 },
  subject: "berhitung",
  lesson: { title: "Angka 1 sampai 10", goal: "Menyebut angka 1-10" },
  step: { kind: "praise", item: { question: "Ada berapa apel?", answers: ["3", "tiga"] }, childSaid: "tiga" },
};

const fakeClient = (reply: { stop_reason: string; text: string } | Error) =>
  ({
    beta: {
      messages: {
        create: async () => {
          if (reply instanceof Error) throw reply;
          return {
            model: "claude-opus-5-5",
            stop_reason: reply.stop_reason,
            usage: { input_tokens: 10, cache_read_input_tokens: 0, output_tokens: 5 },
            content: [{ type: "text", text: reply.text }],
          };
        },
      },
    },
  }) as unknown as Anthropic;

describe("filterSegments", () => {
  it("keeps short, safe Indonesian and English lines", () => {
    const result = filterSegments(
      [
        { lang: "id", text: " Hebat, Aya! Itu warna " },
        { lang: "en", text: "red" },
      ],
      "praise",
    );
    expect(result.passed).toBe(true);
    expect(result.segments[0].text).toBe("Hebat, Aya! Itu warna");
  });

  it.each([
    "Kunjungi www.contoh.com ya",
    "Kamu bodoh sekali",
    "Kirim nomor telepon ibumu",
    "x".repeat(200),
  ])("replaces unsafe output %#", (text) => {
    const result = filterSegments([{ lang: "id", text }], "hint");
    expect(result.passed).toBe(false);
    expect(result.segments).toEqual(FALLBACK_LINES.hint);
  });

  it("falls back when the model returns nothing", () => {
    expect(filterSegments([], "ask").segments).toEqual(FALLBACK_LINES.ask);
  });
});

describe("runTutorTurn", () => {
  it("returns the model's segments when they pass the filter", async () => {
    const client = fakeClient({
      stop_reason: "end_turn",
      text: JSON.stringify({ segments: [{ lang: "id", text: "Betul, ada tiga apel!" }] }),
    });
    const result = await runTutorTurn(claudeModel(client), turn);
    expect(result).toEqual({ segments: [{ lang: "id", text: "Betul, ada tiga apel!" }], fallbackUsed: false });
  });

  it("uses the prepared line on a refusal", async () => {
    const result = await runTutorTurn(claudeModel(fakeClient({ stop_reason: "refusal", text: "" })), turn);
    expect(result).toEqual({ segments: FALLBACK_LINES.praise, fallbackUsed: true });
  });

  it("uses the prepared line when the API call fails", async () => {
    const result = await runTutorTurn(claudeModel(fakeClient(new Error("network"))), turn);
    expect(result.fallbackUsed).toBe(true);
  });

  it("uses the prepared line on malformed JSON", async () => {
    const result = await runTutorTurn(claudeModel(fakeClient({ stop_reason: "end_turn", text: "{oops" })), turn);
    expect(result.segments).toEqual(FALLBACK_LINES.praise);
  });
});

describe("openAiCompatibleModel", () => {
  const reply = (body: unknown, status = 200) =>
    (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

  it("sends a strict JSON-schema request and returns the segments", async () => {
    let sent: { url: string; init: RequestInit } | undefined;
    const fetchSpy = (async (url: string, init: RequestInit) => {
      sent = { url, init };
      return new Response(
        JSON.stringify({
          model: "openai/gpt-5-nano",
          choices: [{ message: { content: JSON.stringify({ segments: [{ lang: "id", text: "Betul!" }] }) }, finish_reason: "stop" }],
          usage: { prompt_tokens: 100, completion_tokens: 10 },
        }),
      );
    }) as unknown as typeof fetch;

    const result = await runTutorTurn(openAiCompatibleModel({ provider: "pollinations", apiKey: "sk_test", reasoningEffort: "low", fetch: fetchSpy }), turn);
    expect(result).toEqual({ segments: [{ lang: "id", text: "Betul!" }], fallbackUsed: false });
    expect(sent!.url).toBe("https://gen.pollinations.ai/v1/chat/completions");
    expect((sent!.init.headers as Record<string, string>).authorization).toBe("Bearer sk_test");
    const body = JSON.parse(String(sent!.init.body));
    expect(body.model).toBe("openai/gpt-5-nano");
    expect(body.reasoning_effort).toBe("low");
    expect(body.response_format.json_schema.strict).toBe(true);
  });

  it("sends Sumopod requests to its own endpoint and model", async () => {
    let sent: { url: string; body: { model: string } } | undefined;
    const fetchSpy = (async (url: string, init: RequestInit) => {
      sent = { url, body: JSON.parse(String(init.body)) };
      return new Response(
        JSON.stringify({ choices: [{ message: { content: JSON.stringify({ segments: [{ lang: "id", text: "Hebat!" }] }) }, finish_reason: "stop" }] }),
      );
    }) as unknown as typeof fetch;
    const result = await runTutorTurn(openAiCompatibleModel({ provider: "sumopod", apiKey: "sk-x", fetch: fetchSpy }), turn);
    expect(result.fallbackUsed).toBe(false);
    expect(sent!.url).toBe("https://ai.sumopod.com/v1/chat/completions");
    expect(sent!.body.model).toBe("gpt-5-nano");
  });

  it("uses the prepared line when the reply is cut off or the call fails", async () => {
    const cutOff = reply({ choices: [{ message: { content: "{\"segm" }, finish_reason: "length" }] });
    expect((await runTutorTurn(openAiCompatibleModel({ provider: "pollinations", apiKey: "k", fetch: cutOff }), turn)).fallbackUsed).toBe(true);
    const failed = reply({ error: "budget" }, 402);
    expect((await runTutorTurn(openAiCompatibleModel({ provider: "sumopod", apiKey: "k", fetch: failed }), turn)).fallbackUsed).toBe(true);
  });
});

describe("safety guard", () => {
  const tutor: TutorModel = async () => ({
    text: JSON.stringify({ segments: [{ lang: "id", text: "Betul, ada tiga apel!" }] }),
    complete: true,
  });
  const guardReplying = (reply: { text: string; complete: boolean } | Error): TutorModel => async () => {
    if (reply instanceof Error) throw reply;
    return reply;
  };

  it("lets a line through when the guard says it is safe", async () => {
    const result = await runTutorTurn(tutor, turn, safetyGuard(guardReplying({ text: '{"safe":true}', complete: true })));
    expect(result).toEqual({ segments: [{ lang: "id", text: "Betul, ada tiga apel!" }], fallbackUsed: false });
  });

  it.each([
    ["says unsafe", { text: '{"safe":false}', complete: true }],
    ["is cut off", { text: '{"saf', complete: false }],
    ["returns garbage", { text: "maybe", complete: true }],
    ["fails", new Error("timeout")],
  ])("uses the prepared line when the guard %s", async (_, reply) => {
    const result = await runTutorTurn(tutor, turn, safetyGuard(guardReplying(reply)));
    expect(result).toEqual({ segments: FALLBACK_LINES.praise, fallbackUsed: true });
  });
});

describe("qwenGuardModel", () => {
  const lines = [{ lang: "id" as const, text: "Hebat, Aya!" }];
  const guardSaying = (content: string) =>
    safetyGuard(
      qwenGuardModel({
        provider: "pollinations",
        apiKey: "k",
        model: "qwen/qwen3guard-gen-8b",
        fetch: (async () =>
          new Response(JSON.stringify({ choices: [{ message: { content }, finish_reason: "stop" }] }))) as unknown as typeof fetch,
      }),
    );

  it.each([
    ["Safety: Safe\nCategories: None", true],
    ["Safety: Unsafe\nCategories: Violent", false],
    ["Safety: Controversial\nCategories: Politically Sensitive Topics", false],
    ["I am not sure", false],
  ])("reads %j as safe=%s", async (content, safe) => {
    expect(await guardSaying(content)(lines)).toBe(safe);
  });
});

describe("withFallback", () => {
  const good: TutorModel = async () => ({
    text: JSON.stringify({ segments: [{ lang: "id", text: "Dari cadangan!" }] }),
    complete: true,
  });

  it.each([
    ["errors", (async () => { throw new Error("sumopod 503"); }) as TutorModel],
    ["is cut off", (async () => ({ text: "{", complete: false })) as TutorModel],
  ])("uses the backup provider when the main one %s", async (_, primary) => {
    const result = await runTutorTurn(withFallback(primary, good), turn);
    expect(result).toEqual({ segments: [{ lang: "id", text: "Dari cadangan!" }], fallbackUsed: false });
  });

  it("does not call the backup when the main one works", async () => {
    let backupCalls = 0;
    const backup: TutorModel = async () => {
      backupCalls += 1;
      return good("", "");
    };
    await runTutorTurn(withFallback(good, backup), turn);
    expect(backupCalls).toBe(0);
  });
});

describe("routes", () => {
  const env = { ANTHROPIC_API_KEY: "k", GOOGLE_CLOUD_API_KEY: "g", APP_TOKEN: "secret" };

  it("serves health without a token", async () => {
    const response = await app.request("/health", {}, env);
    expect(response.status).toBe(200);
  });

  it("rejects API calls without the app token", async () => {
    const response = await app.request("/v1/tts", { method: "POST", body: "{}" }, env);
    expect(response.status).toBe(401);
  });

  it("rejects empty TTS requests", async () => {
    const response = await app.request(
      "/v1/tts",
      { method: "POST", body: JSON.stringify({ segments: [] }), headers: { "x-app-token": "secret" } },
      env,
    );
    expect(response.status).toBe(400);
  });

  it.each([
    ["too long", [{ lang: "id", text: "a".repeat(500) }]],
    ["too many segments", Array.from({ length: 7 }, () => ({ lang: "id", text: "Halo" }))],
    ["unsafe text", [{ lang: "id", text: "Buka www.contoh.com ya" }]],
    ["unknown language", [{ lang: "fr", text: "Bonjour" }]],
    ["not text", [{ lang: "id", text: 42 }]],
  ])("rejects TTS requests that are %s", async (_, segments) => {
    const response = await app.request(
      "/v1/tts",
      { method: "POST", body: JSON.stringify({ segments }), headers: { "x-app-token": "secret" } },
      env,
    );
    expect(response.status).toBe(400);
  });
});
