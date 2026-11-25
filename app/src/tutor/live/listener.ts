import { AudioManager, AudioRecorder } from "react-native-audio-api";
import { bytesToBase64, floatToPcm16, type LiveServerMessage } from "./pcm";
import { openLiveConnection, type LiveConnection } from "./socket";
import { levelFromSamples, setAudioLevel } from "./levels";
import type { ListenHints } from "@/api/types";

const INPUT_RATE = 16_000;
/** 100 ms of audio per chunk. */
const CHUNK_SAMPLES = 1_600;
const FINAL_TIMEOUT_MS = 4_000;
const SETTLE_AFTER_TRANSCRIPT_MS = 450;

const audioMessage = (data: string) => ({ realtimeInput: { audio: { data, mimeType: `audio/pcm;rate=${INPUT_RATE}` } } });

/**
 * Hears the child: the microphone streams to Gemini Live (a transcription-only session) while the
 * child talks, and the final transcript comes back moments after they stop. The text is graded by code.
 */
export class LiveListener {
  private recorder: AudioRecorder | null = null;
  private opening: Promise<LiveConnection> | null = null;
  private live: LiveConnection | null = null;
  /** Audio recorded before the socket was ready. */
  private waiting: string[] = [];
  private finalText = "";
  private interimText = "";
  /** Set when the socket closes. A close before any transcript is a failure, not a wrong answer. */
  private closed = false;
  private stopping = false;
  private settleResolve: (() => void) | null = null;
  private deadlineTimer: ReturnType<typeof setTimeout> | null = null;
  private settleTimer: ReturnType<typeof setTimeout> | null = null;

  static async requestPermission(): Promise<boolean> {
    return (await AudioManager.requestRecordingPermissions()) === "Granted";
  }

  private clearWaitTimers() {
    if (this.deadlineTimer) {
      clearTimeout(this.deadlineTimer);
      this.deadlineTimer = null;
    }
    if (this.settleTimer) {
      clearTimeout(this.settleTimer);
      this.settleTimer = null;
    }
  }

  private resolveWait() {
    this.clearWaitTimers();
    this.stopping = false;
    const resolve = this.settleResolve;
    this.settleResolve = null;
    resolve?.();
  }

  private armSettleTimer() {
    if (!this.stopping || !this.settleResolve) return;
    if (this.settleTimer) clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => this.resolveWait(), SETTLE_AFTER_TRANSCRIPT_MS);
  }

  /** Opens the session while the recorder starts, so the child can talk right away. `hints` hold it to the lesson's language and answers. */
  async start(hints: ListenHints) {
    this.clearWaitTimers();
    this.finalText = "";
    this.interimText = "";
    this.closed = false;
    this.stopping = false;
    this.settleResolve = null;
    this.waiting = [];
    this.live = null;
    const opening = openLiveConnection(
      "listen",
      {
        onMessage: (message) => this.handle(message),
        onClose: () => {
          this.closed = true;
          this.resolveWait();
        },
      },
      hints,
    );
    this.opening = opening;
    opening.then(
      (connection) => {
        if (this.opening !== opening) return connection.close();
        this.live = connection;
        for (const data of this.waiting.splice(0)) connection.send(audioMessage(data));
      },
      () => undefined,
    );

    const recorder = new AudioRecorder();
    this.recorder = recorder;
    recorder.onAudioReady({ sampleRate: INPUT_RATE, bufferLength: CHUNK_SAMPLES, channelCount: 1 }, ({ buffer }) => {
      const samples = buffer.getChannelData(0);
      // Kak Pinta leans in while the child is speaking.
      setAudioLevel("listen", levelFromSamples(samples));
      const data = bytesToBase64(floatToPcm16(samples));
      if (this.live) this.live.send(audioMessage(data));
      else this.waiting.push(data);
    });
    const started = await recorder.start();
    if (started.status === "error") throw new Error("could not start the microphone");
  }

  /** Stops recording and returns what the child said. Throws if the session failed or closed before any transcript, so a failure never counts as a wrong answer; an open session that hears nothing returns an empty string, like a silent child. */
  async stopAndTranscribe(): Promise<string> {
    await this.stopRecorder();
    const connection = await this.opening;
    this.opening = null;
    if (!connection) throw new Error("no live session");
    for (const data of this.waiting.splice(0)) connection.send(audioMessage(data));
    if (!this.closed) {
      this.stopping = true;
      const finished = new Promise<void>((resolve) => {
        this.settleResolve = resolve;
        this.deadlineTimer = setTimeout(() => this.resolveWait(), FINAL_TIMEOUT_MS);
        if (this.finalText !== "") this.armSettleTimer();
      });
      connection.send({ realtimeInput: { audioStreamEnd: true } });
      await finished;
    }
    connection.close();
    this.live = null;
    const text = (this.finalText || this.interimText).trim();
    if (text === "" && this.closed) throw new Error("live session closed before a transcript");
    return text;
  }

  async cancel() {
    this.resolveWait();
    await this.stopRecorder();
    const opening = this.opening;
    this.opening = null;
    this.live?.close();
    this.live = null;
    (await opening?.catch(() => undefined))?.close();
  }

  private async stopRecorder() {
    const recorder = this.recorder;
    this.recorder = null;
    if (!recorder) return;
    recorder.clearOnAudioReady();
    setAudioLevel("listen", 0);
    await recorder.stop().catch(() => undefined);
  }

  private handle(message: LiveServerMessage) {
    const content = message.serverContent;
    if (content?.interimInputTranscription?.text) this.interimText = content.interimInputTranscription.text;
    if (content?.inputTranscription?.text) {
      // A pause can split the answer into several finished parts; keep them all.
      this.finalText = `${this.finalText} ${content.inputTranscription.text}`.trim();
      if (this.stopping) this.armSettleTimer();
    }
  }
}
