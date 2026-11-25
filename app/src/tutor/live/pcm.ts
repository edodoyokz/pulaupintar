/** Helpers for streaming 16-bit PCM to and from Gemini Live, kept free of native modules so they can be tested. */

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export const bytesToBase64 = (bytes: Uint8Array): string => {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += BASE64_CHARS[(n >> 18) & 63] + BASE64_CHARS[(n >> 12) & 63];
    out += i + 1 < bytes.length ? BASE64_CHARS[(n >> 6) & 63] : "=";
    out += i + 2 < bytes.length ? BASE64_CHARS[n & 63] : "=";
  }
  return out;
};

export const base64ToBytes = (base64: string): Uint8Array => {
  const clean = base64.replace(/=+$/, "");
  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let index = 0;
  for (const char of clean) {
    buffer = (buffer << 6) | BASE64_CHARS.indexOf(char);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[index++] = (buffer >> bits) & 0xff;
    }
  }
  return bytes;
};

/** Microphone samples (-1..1) to little-endian 16-bit PCM bytes. */
export const floatToPcm16 = (samples: Float32Array): Uint8Array => {
  const out = new Uint8Array(samples.length * 2);
  const view = new DataView(out.buffer);
  samples.forEach((sample, i) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  });
  return out;
};

/** Little-endian 16-bit PCM bytes to playable samples (-1..1). An odd trailing byte is dropped. */
export const pcm16ToFloat = (bytes: Uint8Array): Float32Array<ArrayBuffer> => {
  const count = Math.floor(bytes.length / 2);
  const view = new DataView(bytes.buffer, bytes.byteOffset, count * 2);
  const out = new Float32Array(count);
  for (let i = 0; i < count; i++) out[i] = view.getInt16(i * 2, true) / 0x8000;
  return out;
};

/** Gemini sends JSON in text or binary frames; decodes either to a string. */
export const frameToText = (data: unknown): string => {
  if (typeof data === "string") return data;
  const bytes =
    data instanceof ArrayBuffer ? new Uint8Array(data) : ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : null;
  if (!bytes) throw new Error("unsupported websocket frame");
  if (typeof TextDecoder !== "undefined") return new TextDecoder().decode(bytes);
  let latin1 = "";
  for (const byte of bytes) latin1 += String.fromCharCode(byte);
  return decodeURIComponent(escape(latin1));
};

export type LiveToken = { token: string; url: string; setup: Record<string, unknown> };

export type LiveServerMessage = {
  setupComplete?: unknown;
  serverContent?: {
    modelTurn?: { parts?: { inlineData?: { data: string } }[] };
    turnComplete?: boolean;
    interrupted?: boolean;
    generationComplete?: boolean;
    inputTranscription?: { text?: string };
    interimInputTranscription?: { text?: string };
  };
  goAway?: unknown;
};
