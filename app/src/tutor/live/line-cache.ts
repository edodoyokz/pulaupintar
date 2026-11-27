import { Directory, File, Paths } from "expo-file-system";
import type { SpeechSegment } from "@/api/types";

/**
 * Kak Pinta's spoken lines as 24 kHz 16-bit PCM, so a line heard before plays again at once and costs
 * no Gemini session: "Dengar lagi", the static teaching lines of a replayed level, the retry and nudge lines.
 * Recent lines stay in memory; lines that never change are also kept on disk across app runs.
 */

/** About 85 s of audio at 24 kHz 16-bit. */
const MEMORY_BYTES = 4_000_000;
/** Static lines kept on disk; a level has at most 15 teaching lines, so this is several levels. */
const DISK_FILES = 200;

const memory = new Map<string, Uint8Array>();
let memoryBytes = 0;

export const lineKey = (segments: SpeechSegment[]) =>
  JSON.stringify(segments.map((segment) => [segment.lang, segment.text]));

/** Two FNV-1a passes with different seeds: a 64-bit file name for a line key. */
const fileNameFor = (key: string) => {
  const pass = (seed: number) => {
    let hash = seed;
    for (let index = 0; index < key.length; index += 1) {
      hash ^= key.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
  };
  return `${pass(0x811c9dc5)}${pass(0x050c5d1f)}.pcm`;
};

const remember = (key: string, pcm: Uint8Array) => {
  const previous = memory.get(key);
  if (previous) {
    memory.delete(key);
    memoryBytes -= previous.length;
  }
  memory.set(key, pcm);
  memoryBytes += pcm.length;
  // Map order is insertion order, so the first key is the least recently used.
  for (const [oldKey, oldPcm] of memory) {
    if (memoryBytes <= MEMORY_BYTES) break;
    memory.delete(oldKey);
    memoryBytes -= oldPcm.length;
  }
};

let directory: Directory | null | undefined;
const diskDirectory = () => {
  if (directory !== undefined) return directory;
  try {
    directory = new Directory(Paths.cache, "kak-pinta-lines");
    directory.create({ intermediates: true, idempotent: true });
  } catch {
    directory = null;
  }
  return directory;
};

export const getLine = async (key: string): Promise<Uint8Array | null> => {
  const cached = memory.get(key);
  if (cached) {
    remember(key, cached);
    return cached;
  }
  const folder = diskDirectory();
  if (!folder) return null;
  try {
    const file = new File(folder, fileNameFor(key));
    if (!file.exists) return null;
    const pcm = await file.bytes();
    remember(key, pcm);
    return pcm;
  } catch {
    return null;
  }
};

/** `persist`: the line never changes (static text), so it is worth keeping on disk. */
export const putLine = (key: string, pcm: Uint8Array, persist: boolean) => {
  remember(key, pcm);
  if (!persist) return;
  const folder = diskDirectory();
  if (!folder) return;
  try {
    const file = new File(folder, fileNameFor(key));
    if (!file.exists) file.create();
    file.write(pcm).catch(() => undefined);
    const files = folder.list().filter((entry): entry is File => entry instanceof File);
    if (files.length > DISK_FILES) {
      // Oldest first by modification time; the cache only needs to stay bounded, not exact.
      files
        .sort((a, b) => (a.lastModified ?? 0) - (b.lastModified ?? 0))
        .slice(0, files.length - DISK_FILES)
        .forEach((entry) => entry.delete());
    }
  } catch {
    // A full or unavailable disk only loses the cache.
  }
};
