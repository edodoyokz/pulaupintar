import { describe, expect, it } from "vitest";
import { pcmToWav, synthesizeWithGemini, transcribeWithGemini, type LiveSocket } from "../src/gemini-speech";
import type { Env, SttRequest } from "../src/types";

const env = { APP_TOKEN: "t", GEMINI_API_KEY: "key" } as Env;
const b64 = (bytes: number[]) => btoa(String.fromCharCode(...bytes));

/** A fake Gemini Live socket: answers setup, then plays back audio for the text it is sent. */
const fakeLive = (sent: unknown[], audio: number[][]) => async (): Promise<LiveSocket> => {
  const listeners: Record<string, ((event: { data?: unknown }) => void)[]> = {};
  const emit = (type: string, data?: unknown) => listeners[type]?.forEach((listener) => listener({ data }));
  return {
    addEventListener: (type, listener) => (listeners[type] ??= []).push(listener),
    close: () => undefined,
    send: (data) => {
      const message = JSON.parse(data);
      sent.push(message);
      if (message.setup) queueMicrotask(() => emit("message", JSON.stringify({ setupComplete: {} })));
      if (message.realtimeInput) {
        queueMicrotask(() => {
          for (const chunk of audio) emit("message", JSON.stringify({ serverContent: { modelTurn: { parts: [{ inlineData: { data: b64(chunk) } }] } } }));
          emit("message", JSON.stringify({ serverContent: { turnComplete: true } }));
        });
      }
    },
  };
};

describe("pcmToWav", () => {
  it("adds a 44 byte WAV header for 24 kHz mono 16-bit audio", () => {
    const wav = pcmToWav(new Uint8Array([1, 2, 3, 4]));
    const view = new DataView(wav.buffer);
    expect(String.fromCharCode(...wav.slice(0, 4))).toBe("RIFF");
    expect(wav.length).toBe(48);
    expect(view.getUint32(24, true)).toBe(24_000);
    expect(view.getUint32(40, true)).toBe(4);
  });
});

describe("synthesizeWithGemini", () => {
  it("asks Live to speak each segment and returns one WAV", async () => {
    const sent: any[] = [];
    const wavBase64 = await synthesizeWithGemini(
      env,
      [{ lang: "id", text: "Halo adik" }],
      fakeLive(sent, [[1, 2], [3, 4]]),
    );
    const wav = Uint8Array.from(atob(wavBase64), (c) => c.charCodeAt(0));
    expect([...wav.slice(44)]).toEqual([1, 2, 3, 4]);
    expect(sent[0].setup.model).toBe("models/gemini-3.8-live");
    expect(sent[0].setup.generationConfig.speechConfig.languageCode).toBe("id-ID");
    expect(sent[1]).toEqual({ realtimeInput: { text: "Halo adik" } });
  });

  it("uses English for English segments", async () => {
    const sent: any[] = [];
    await synthesizeWithGemini(env, [{ lang: "en", text: "apple" }], fakeLive(sent, [[1, 2]]));
    expect(sent[0].setup.generationConfig.speechConfig.languageCode).toBe("en-US");
  });

  it("rejects a socket that closes before the line is finished, even after some audio", async () => {
    const socket = async (): Promise<LiveSocket> => {
      const listeners: Record<string, ((event: { data?: unknown }) => void)[]> = {};
      const emit = (type: string, data?: unknown) => listeners[type]?.forEach((listener) => listener({ data }));
      return {
        addEventListener: (type, listener) => (listeners[type] ??= []).push(listener),
        close: () => undefined,
        send: (data) => {
          const message = JSON.parse(data);
          if (message.setup) queueMicrotask(() => emit("message", JSON.stringify({ setupComplete: {} })));
          if (message.realtimeInput) {
            queueMicrotask(() => {
              emit("message", JSON.stringify({ serverContent: { modelTurn: { parts: [{ inlineData: { data: b64([1, 2]) } }] } } }));
              emit("close");
            });
          }
        },
      };
    };
    await expect(synthesizeWithGemini(env, [{ lang: "id", text: "Halo" }], socket)).rejects.toThrow("closed before");
  });

  it("fails when Live sends no audio, so the app falls back to the device voice", async () => {
    await expect(synthesizeWithGemini(env, [{ lang: "id", text: "Halo" }], fakeLive([], []))).rejects.toThrow("no audio");
  });
});

describe("transcribeWithGemini", () => {
  const request: SttRequest = { audioBase64: "AAA", encoding: "AAC", sampleRateHertz: 16000, expect: "id", hints: ["tiga"] };

  it("sends the recording and returns the transcript, with the key in a header", async () => {
    let call: { url: string; init: RequestInit } | undefined;
    const fakeFetch = (async (url: string, init: RequestInit) => {
      call = { url, init };
      return Response.json({ candidates: [{ content: { parts: [{ text: " tiga " }] } }] });
    }) as unknown as typeof fetch;
    expect(await transcribeWithGemini(env, request, fakeFetch)).toBe("tiga");
    expect(call?.url).toContain("gemini-3.5-transcribe:generateContent");
    expect(call?.url).not.toContain("key");
    expect((call?.init.headers as Record<string, string>)["x-goog-api-key"]).toBe("key");
    expect(JSON.parse(String(call?.init.body)).contents[0].parts[1].inlineData.mimeType).toBe("audio/aac");
  });

  it("throws on an error response so a failure never counts as a wrong answer", async () => {
    const fakeFetch = (async () => new Response("no", { status: 500 })) as unknown as typeof fetch;
    await expect(transcribeWithGemini(env, request, fakeFetch)).rejects.toThrow("500");
  });
});

describe("createLiveToken", () => {
  it("locks the token to the role's setup and keeps the key out of the result", async () => {
    const { createLiveToken } = await import("../src/live-token");
    let sent: any;
    const fakeFetch = (async (_url: string, init: RequestInit) => {
      sent = JSON.parse(String(init.body));
      return Response.json({ name: "auth_tokens/abc" });
    }) as unknown as typeof fetch;
    const speak = await createLiveToken(env, "speak", fakeFetch);
    expect(sent.uses).toBe(1);
    expect(sent.bidiGenerateContentSetup.model).toBe("models/gemini-3.8-live");
    expect(speak.url).toContain("access_token=auth_tokens%2Fabc");
    expect(JSON.stringify(speak)).not.toContain("key");
    const listen = await createLiveToken(env, "listen", fakeFetch);
    expect(listen.setup).toMatchObject({ model: "models/gemini-3.5-transcribe-live", inputAudioTranscription: {} });
  });
});
