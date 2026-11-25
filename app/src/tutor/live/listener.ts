import { AudioManager, AudioRecorder } from "react-native-audio-api";
import { bytesToBase64, floatToPcm16, type LiveServerMessage } from "./pcm";
import { openLiveConnection, type LiveConnection } from "./socket";

const INPUT_RATE = 16_000;
/** 100 ms of audio per chunk. */
const CHUNK_SAMPLES = 1_600;
const FINAL_TIMEOUT_MS = 4_000;

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
  private onTranscript: (() => void) | null = null;

  static async requestPermission(): Promise<boolean> {
    return (await AudioManager.requestRecordingPermissions()) === "Granted";
  }

  /** Opens the session while the recorder starts, so the child can talk right away. */
  async start() {
    this.finalText = "";
    this.interimText = "";
    this.closed = false;
    this.waiting = [];
    this.live = null;
    const opening = openLiveConnection("listen", {
      onMessage: (message) => this.handle(message),
      onClose: () => {
        this.closed = true;
        this.onTranscript?.();
      },
    });
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
      const data = bytesToBase64(floatToPcm16(buffer.getChannelData(0)));
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
    const finished = new Promise<void>((resolve) => {
      this.onTranscript = resolve;
      setTimeout(resolve, FINAL_TIMEOUT_MS);
    });
    connection.send({ realtimeInput: { audioStreamEnd: true } });
    await finished;
    this.onTranscript = null;
    connection.close();
    this.live = null;
    const text = (this.finalText || this.interimText).trim();
    if (text === "" && this.closed) throw new Error("live session closed before a transcript");
    return text;
  }

  async cancel() {
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
    await recorder.stop().catch(() => undefined);
  }

  private handle(message: LiveServerMessage) {
    const content = message.serverContent;
    if (content?.interimInputTranscription?.text) this.interimText = content.interimInputTranscription.text;
    if (content?.inputTranscription?.text) {
      // A pause can split the answer into several finished parts; keep them all.
      this.finalText = `${this.finalText} ${content.inputTranscription.text}`.trim();
      this.onTranscript?.();
    }
  }
}
