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
 * The session only reads lines aloud (the Worker relay only passes approved lines), and a stopped line closes the socket
 * so nothing queued behind it can still be heard.
 */
export class LiveSpeaker {
  private context: AudioContext | null = null;
  private connection: LiveConnection | null = null;
  private onMessage: (message: LiveServerMessage) => void = () => undefined;
  private cancel: (() => void) | null = null;
  private failTurn: ((error: Error) => void) | null = null;
  /** Bumped by stop and dispose, so a line that was still connecting is abandoned. */
  private epoch = 0;
  /** Lines play one after another, so two never share the socket. */
  private queue: Promise<unknown> = Promise.resolve();

  private async ensureConnection(): Promise<LiveConnection> {
    if (this.connection?.isOpen()) return this.connection;
    let opened: LiveConnection | null = null;
    opened = await openLiveConnection("speak", {
      onMessage: (message) => {
        if (this.connection === opened) this.onMessage(message);
      },
      onClose: () => {
        if (this.connection !== opened) return;
        this.connection = null;
        this.failTurn?.(new Error("live socket closed"));
      },
    });
    this.connection = opened;
    return opened;
  }

  /** Resolves when the line has been spoken or stopped; rejects if Live can't be reached or sends nothing. */
  speak(segments: SpeechSegment[]): Promise<void> {
    const epoch = this.epoch;
    const run = this.queue.then(() => this.speakNow(segments, epoch));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async speakNow(segments: SpeechSegment[], epoch: number): Promise<void> {
    if (epoch !== this.epoch) return;
    const connection = await this.ensureConnection();
    if (epoch !== this.epoch) return this.closeIfIdle();
    const context = (this.context ??= new AudioContext({ sampleRate: OUTPUT_RATE }));
    await context.resume();
    if (epoch !== this.epoch) return this.closeIfIdle();

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
        this.failTurn = null;
        this.onMessage = () => undefined;
        if (started) {
          try {
            source.stop();
          } catch {
            // already finished
          }
        }
        if (error) {
          // Gemini may still be generating this line; a fresh session keeps its audio out of the next one.
          this.connection?.close();
          this.connection = null;
          reject(error);
        } else resolve();
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
      this.failTurn = finish;
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
      // The Worker checks the lines (same rules as /v1/tts) before Gemini sees them.
      connection.send({ segments });
    });
  }

  /** A line abandoned while connecting leaves an open socket; close it so nothing plays later. */
  private closeIfIdle() {
    if (!this.cancel) {
      this.connection?.close();
      this.connection = null;
    }
  }

  stop() {
    this.epoch += 1;
    this.cancel?.();
  }

  dispose() {
    this.epoch += 1;
    this.cancel?.();
    this.connection?.close();
    this.connection = null;
    void this.context?.close().catch(() => undefined);
    this.context = null;
  }
}
