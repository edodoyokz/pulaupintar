import { describe, expect, it } from "vitest";
import { base64ToBytes, bytesToBase64, floatToPcm16, frameToText, pcm16ToFloat } from "../src/tutor/live/pcm";

describe("base64", () => {
  it.each([[[]], [[1]], [[1, 2]], [[1, 2, 3]], [[255, 0, 128, 7, 9]]])("round-trips %j like btoa", (bytes) => {
    const encoded = bytesToBase64(Uint8Array.from(bytes));
    expect(encoded).toBe(btoa(String.fromCharCode(...bytes)));
    expect([...base64ToBytes(encoded)]).toEqual(bytes);
  });
});

describe("pcm16", () => {
  it("converts microphone floats to 16-bit PCM, clamping loud samples", () => {
    const pcm = floatToPcm16(Float32Array.from([0, 1, -1, 2, -2]));
    const view = new DataView(pcm.buffer);
    expect([0, 1, 2, 3, 4].map((i) => view.getInt16(i * 2, true))).toEqual([0, 32767, -32768, 32767, -32768]);
  });

  it("round-trips samples closely", () => {
    const back = pcm16ToFloat(floatToPcm16(Float32Array.from([0.5, -0.25])));
    expect(back[0]).toBeCloseTo(0.5, 3);
    expect(back[1]).toBeCloseTo(-0.25, 3);
  });

  it("drops an odd trailing byte instead of throwing", () => {
    expect(pcm16ToFloat(Uint8Array.from([0, 64, 9])).length).toBe(1);
  });
});

describe("frameToText", () => {
  it("reads text and binary frames", () => {
    expect(frameToText("{}")).toBe("{}");
    expect(frameToText(new TextEncoder().encode('{"a":"é"}').buffer)).toBe('{"a":"é"}');
  });
});
