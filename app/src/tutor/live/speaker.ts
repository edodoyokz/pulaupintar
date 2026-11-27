import { AudioContext, type AudioBufferQueueSourceNode } from "react-native-audio-api";
import type { SpeechSegment } from "@/api/types";
import { openLiveConnection, type LiveConnection } from "./socket";
import { base64ToBytes, pcm16ToFloat, type LiveServerMessage } from "./pcm";
import { meterAnalyser } from "./levels";
import { getLine, lineKey, putLine } from "./line-cache";

const OUTPUT_RATE = 24_000;
/** Audio waiting before playback starts, so a slow chunk does not make the voice stutter. */
const PREBUFFER_SECONDS = 0.25;
const TURN_TIMEOUT_MS = 40_000;
const END_GRACE_MS = 3_000;
/** A cached line is queued in chunks of this length, so the beak meter sees steady audio. */
const CACHED_CHUNK_SAMPLES = OUTPUT_RATE / 4;

export type SpeakOptions = {
  /** The line's text never changes, so its audio is also kept on disk for the next app run. */
  persist?: boolean;
};

/** One line playing through the queue source, with the beak meter attached. */
type Playback = {
  enqueue: (samples: Float32Array<ArrayBuffer>) => void;
  /** Every buffer of the line is queued; playback ends after the last one. */
  complete: () => void;
  finish: (error?: Error) => void;
  queued: () => number;
};

const joinChunks = (chunks: Uint8Array[]) => {
  const joined = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.length;
  }
  return joined;
};

/**
 * Kak Pinta's voice: Gemini Live speaks each line and its audio plays while it is still arriving.
 * The session only reads lines aloud (the Worker relay only passes approved lines), and a stopped line closes the socket
 * so nothing queued behind it can still be heard.
 * Every line gets its own session, closed as soon as Gemini has sent the whole line: a session left idle through the
 * Worker is dropped by Gemini after about 10 s, and a fresh one carries no earlier lines the model could answer.
 * A line heard before plays from the line cache without a session.
 */
export class LiveSpeaker {
  private context: AudioContext | null = null;
  private connection: LiveConnection | null = null;
  private opening: Promise<LiveConnection> | null = null;
  private onMessage: (message: LiveServerMessage) => void = () => undefined;
  private cancel: (() => void) | null = null;
  private failTurn: ((error: Error) => void) | null = null;
  /** Bumped by stop and dispose, so a line that was still connecting is abandoned. */
  private epoch = 0;
  /** Lines play one after another, so two never share the socket. */
  private queue: Promise<unknown> = Promise.resolve();

  private ensureConnection(): Promise<LiveConnection> {
    if (this.connection?.isOpen()) return Promise.resolve(this.connection);
    // One socket at a time: a warm-up still connecting is the one the next line uses.
    this.opening ??= this.open().finally(() => {
      this.opening = null;
    });
    return this.opening;
  }

  private async open(): Promise<LiveConnection> {
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

  private audioContext() {
    return (this.context ??= new AudioContext({ sampleRate: OUTPUT_RATE }));
  }

  /**
   * Opens the next line's session while the tutor is still writing it, so the half second of setup
   * overlaps the wait instead of adding to it. A line that never comes leaves the session to the idle timeouts.
   */
  prepare() {
    if (!this.cancel && !this.connection?.isOpen()) void this.ensureConnection().catch(() => undefined);
  }

  /** Resolves when the line has been spoken or stopped; rejects if Live can't be reached or sends nothing. */
  speak(segments: SpeechSegment[], options: SpeakOptions = {}): Promise<void> {
    const epoch = this.epoch;
    const run = this.queue.then(() => this.speakNow(segments, options, epoch));
    this.queue = run.catch(() => undefined);
    return run;
  }

  /** A short rising three-note chime, played the moment a right answer is recognised. */
  chime() {
    const context = this.audioContext();
    void context
      .resume()
      .then(() => {
        const now = context.currentTime;
        [1046.5, 1318.5, 1568].forEach((frequency, index) => {
          const at = now + index * 0.09;
          const tone = context.createOscillator();
          tone.type = "sine";
          tone.frequency.setValueAtTime(frequency, at);
          const gain = context.createGain();
          gain.gain.setValueAtTime(0, at);
          gain.gain.linearRampToValueAtTime(0.22, at + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, at + 0.35);
          tone.connect(gain);
          gain.connect(context.destination);
          tone.start(at);
          tone.stop(at + 0.4);
        });
      })
      .catch(() => undefined);
  }

  private async speakNow(segments: SpeechSegment[], options: SpeakOptions, epoch: number): Promise<void> {
    if (epoch !== this.epoch) return;
    const key = lineKey(segments);
    const cached = await getLine(key);
    if (epoch !== this.epoch) return;
    if (cached) return this.playCached(cached, options, key);

    const connection = await this.ensureConnection();
    if (epoch !== this.epoch) return this.closeIfIdle();
    const context = this.audioContext();
    await context.resume();
    if (epoch !== this.epoch) return this.closeIfIdle();

    await new Promise<void>((resolve, reject) => {
      const received: Uint8Array[] = [];
      let turnDone = false;
      const playback = this.startPlayback(context, (error) => {
        if (error) {
          // Gemini may still be generating this line; a fresh session keeps its audio out of the next one.
          this.connection?.close();
          this.connection = null;
          reject(error);
          return;
        }
        // Only a line that arrived whole is worth replaying.
        if (turnDone) putLine(key, joinChunks(received), options.persist === true);
        resolve();
      });

      this.cancel = () => {
        this.connection?.close(); // drop whatever Gemini is still generating for this line
        this.connection = null;
        playback.finish();
      };
      this.failTurn = playback.finish;
      this.onMessage = (message) => {
        if (message.error) {
          playback.finish(new Error(`live relay error: ${message.error}`));
          return;
        }
        const content = message.serverContent;
        for (const part of content?.modelTurn?.parts ?? []) {
          if (!part.inlineData) continue;
          const bytes = base64ToBytes(part.inlineData.data);
          const samples = pcm16ToFloat(bytes);
          if (samples.length === 0) continue;
          received.push(bytes);
          playback.enqueue(samples);
        }
        if (content?.turnComplete) {
          turnDone = true;
          // The whole line has arrived; free the session now instead of letting it idle until Gemini drops it.
          if (this.connection === connection) this.connection = null;
          connection.close();
          if (playback.queued() === 0) playback.finish(new Error("live sent no audio"));
          else playback.complete();
        }
      };
      // The Worker checks the lines (same rules as /v1/tts) before Gemini sees them.
      connection.send({ segments });
    });
  }

  private async playCached(pcm: Uint8Array, options: SpeakOptions, key: string) {
    const context = this.audioContext();
    await context.resume();
    await new Promise<void>((resolve) => {
      const playback = this.startPlayback(context, () => resolve());
      this.cancel = () => playback.finish();
      const samples = pcm16ToFloat(pcm);
      for (let start = 0; start < samples.length; start += CACHED_CHUNK_SAMPLES) {
        playback.enqueue(samples.slice(start, start + CACHED_CHUNK_SAMPLES));
      }
      if (playback.queued() === 0) playback.finish();
      else playback.complete();
    });
    // A static line played from memory is still worth keeping on disk for the next run.
    if (options.persist) putLine(key, pcm, true);
  }

  private startPlayback(context: AudioContext, onFinish: (error?: Error) => void): Playback {
    // The beak follows what is actually playing, so it opens on syllables and closes on pauses.
    const analyser = context.createAnalyser();
    const stopMeter = meterAnalyser("speech", analyser);
    const source: AudioBufferQueueSourceNode = context.createBufferQueueSource();
    source.connect(analyser);
    analyser.connect(context.destination);
    let queuedSeconds = 0;
    let queuedBuffers = 0;
    let endedBuffers = 0;
    let started = false;
    let complete = false;
    let settled = false;
    let endTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(turnTimer);
      clearTimeout(endTimer);
      stopMeter();
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
      onFinish(error);
    };
    const turnTimer = setTimeout(() => finish(new Error("live turn timed out")), TURN_TIMEOUT_MS);
    const startIfReady = () => {
      if (!started && (queuedSeconds >= PREBUFFER_SECONDS || complete)) {
        started = true;
        source.start();
      }
    };
    const finishIfPlayed = () => {
      if (complete && endedBuffers >= queuedBuffers) finish();
    };
    source.onbufferended = () => {
      endedBuffers += 1;
      finishIfPlayed();
    };

    return {
      enqueue: (samples) => {
        const buffer = context.createBuffer(1, samples.length, OUTPUT_RATE);
        buffer.copyToChannel(samples, 0);
        source.enqueueBuffer(buffer);
        queuedBuffers += 1;
        queuedSeconds += samples.length / OUTPUT_RATE;
        startIfReady();
      },
      complete: () => {
        complete = true;
        startIfReady();
        // Safety net if the end events are lost (calls, lost audio focus).
        endTimer = setTimeout(() => finish(), END_GRACE_MS + queuedSeconds * 1000);
        finishIfPlayed();
      },
      finish,
      queued: () => queuedBuffers,
    };
  }

  /** A line abandoned while connecting, or a warm-up nobody used, leaves an open socket; close it. */
  private closeIfIdle() {
    if (!this.cancel) {
      this.connection?.close();
      this.connection = null;
    }
  }

  stop() {
    this.epoch += 1;
    this.cancel?.();
    this.closeIfIdle();
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
