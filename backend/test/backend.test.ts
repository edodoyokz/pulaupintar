import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import app from "../src/index";
import { FALLBACK_LINES, filterSegments } from "../src/safety";
import { runTutorTurn } from "../src/tutor";
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
    const result = await runTutorTurn(client, turn);
    expect(result).toEqual({ segments: [{ lang: "id", text: "Betul, ada tiga apel!" }], fallbackUsed: false });
  });

  it("uses the prepared line on a refusal", async () => {
    const result = await runTutorTurn(fakeClient({ stop_reason: "refusal", text: "" }), turn);
    expect(result).toEqual({ segments: FALLBACK_LINES.praise, fallbackUsed: true });
  });

  it("uses the prepared line when the API call fails", async () => {
    const result = await runTutorTurn(fakeClient(new Error("network")), turn);
    expect(result.fallbackUsed).toBe(true);
  });

  it("uses the prepared line on malformed JSON", async () => {
    const result = await runTutorTurn(fakeClient({ stop_reason: "end_turn", text: "{oops" }), turn);
    expect(result.segments).toEqual(FALLBACK_LINES.praise);
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
});
