import { AudioContext, type AudioBufferQueueSourceNode } from "react-native-audio-api";
import type { SpeechSegment } from "@/api/types";
import { openLiveConnection, type LiveConnection } from "./socket";
import { base64ToBytes, pcm16ToFloat, type LiveServerMessage } from "./pcm";

const OUTPUT_RATE = 24_000;
/** Audio waiting before playback starts, so a slow chunk does not make the voice stutter. */
const PREBUFFER_SECONDS = 0.25;
const TURN_TIMEOUT_MS = 40_000;
const END_GRACE_MS = 3_000;

/**
 * Kak Pinta's voice: Gemini Live speaks each line and its audio plays while it is still arriving.
 * The session only reads lines aloud (the token is locked to that), and a stopped line closes the socket
 * so nothing queued behind it can still be heard.
 */
export class LiveSpeaker {
  private context: AudioContext | null = null;
  private connection: LiveConnection | null = null;
  private onMessage: (message: LiveServerMessage) => void = () => undefined;
  private cancel: (() => void) | null = null;

  private async ensureConnection(): Promise<LiveConnection> {
    if (this.connection?.isOpen()) return this.connection;
    this.connection = await openLiveConnection("speak", {
      onMessage: (message) => this.onMessage(message),
      onClose: () => {
        this.connection = null;
      },
    });
    return this.connection;
  }

  /** Resolves when the line has been spoken or stopped; rejects if Live can't be reached or sends nothing. */
  async speak(segments: SpeechSegment[]): Promise<void> {
    const connection = await this.ensureConnection();
    const context = (this.context ??= new AudioContext({ sampleRate: OUTPUT_RATE }));
    await context.resume();
    const text = segments.map((segment) => segment.text).join(" ");

    await new Promise<void>((resolve, reject) => {
      const source: AudioBufferQueueSourceNode = context.createBufferQueueSource();
      source.connect(context.destination);
      let queuedSeconds = 0;
      let queuedBuffers = 0;
      let endedBuffers = 0;
      let started = false;
      let turnDone = false;
      let settled = false;
      let endTimer: ReturnType<typeof setTimeout> | undefined;

      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(turnTimer);
        clearTimeout(endTimer);
        this.cancel = null;
        this.onMessage = () => undefined;
        if (started) {
          try {
            source.stop();
          } catch {
            // already finished
          }
        }
        if (error) reject(error);
        else resolve();
      };
      const turnTimer = setTimeout(() => finish(new Error("live turn timed out")), TURN_TIMEOUT_MS);
      const startIfReady = () => {
        if (!started && (queuedSeconds >= PREBUFFER_SECONDS || turnDone)) {
          started = true;
          source.start();
        }
      };
      const finishIfPlayed = () => {
        if (turnDone && endedBuffers >= queuedBuffers) finish();
      };

      source.onbufferended = () => {
        endedBuffers += 1;
        finishIfPlayed();
      };
      this.cancel = () => {
        this.connection?.close(); // drop whatever Gemini is still generating for this line
        this.connection = null;
        finish();
      };
      this.onMessage = (message) => {
        const content = message.serverContent;
        for (const part of content?.modelTurn?.parts ?? []) {
          if (!part.inlineData) continue;
          const samples = pcm16ToFloat(base64ToBytes(part.inlineData.data));
          if (samples.length === 0) continue;
          const buffer = context.createBuffer(1, samples.length, OUTPUT_RATE);
          buffer.copyToChannel(samples, 0);
          source.enqueueBuffer(buffer);
          queuedBuffers += 1;
          queuedSeconds += samples.length / OUTPUT_RATE;
        }
        startIfReady();
        if (content?.turnComplete) {
          turnDone = true;
          if (queuedBuffers === 0) finish(new Error("live sent no audio"));
          else {
            startIfReady();
            // Safety net if the end events are lost (calls, lost audio focus).
            endTimer = setTimeout(() => finish(), END_GRACE_MS + Math.max(0, queuedSeconds) * 1000);
            finishIfPlayed();
          }
        }
      };
      connection.send({ realtimeInput: { text } });
    });
  }

  stop() {
    this.cancel?.();
  }

  dispose() {
    this.cancel?.();
    this.connection?.close();
    this.connection = null;
    void this.context?.close().catch(() => undefined);
    this.context = null;
  }
}
