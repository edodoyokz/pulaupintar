import { File, Paths } from "expo-file-system";

export type ChildProfile = {
  id: string;
  name: string;
  age: number;
  stars: number;
  /** Ids of lessons the child has passed, like "berhitung-1". */
  completedLessons: string[];
  /** Seconds spent learning on one calendar day (device-local date, YYYY-MM-DD). */
  usage?: { date: string; seconds: number };
};

// One parent device can hold several children, ready for family subscriptions later.
export type AppData = {
  version: 1;
  activeChildId: string | null;
  dailyLimitMinutes?: number;
  children: ChildProfile[];
};

export const DEFAULT_DAILY_LIMIT_MINUTES = 15;

const EMPTY: AppData = { version: 1, activeChildId: null, children: [] };
const dataFile = () => new File(Paths.document, "pulaupintar.json");
// A save writes here first and then moves it over the data file, so a crash never leaves half a file behind.
const tempFile = () => new File(Paths.document, "pulaupintar.json.tmp");

export const todayKey = (): string => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const isAppData = (value: unknown): value is AppData =>
  typeof value === "object" && value !== null && (value as AppData).version === 1 && Array.isArray((value as AppData).children);

const readAppData = async (file: File): Promise<AppData> => {
  const parsed: unknown = JSON.parse(await file.text());
  if (!isAppData(parsed)) throw new Error("unexpected data shape");
  return parsed;
};

/** Keeps an unreadable file under another name for later recovery; the next save must not destroy it. */
const keepCorruptCopy = async (file: File) => {
  try {
    await file.copy(new File(Paths.document, `pulaupintar.corrupt-${Date.now()}.json`));
  } catch (error) {
    console.warn("could not keep a copy of the unreadable profile data", error);
  }
};

const tryRead = async (file: File): Promise<AppData | null> => {
  if (!file.exists) return null;
  try {
    return await readAppData(file);
  } catch {
    await keepCorruptCopy(file);
    return null;
  }
};

/**
 * A missing file means a fresh install. An unreadable one also starts empty, but only after a copy is kept.
 * A leftover temp file (the app died during a save) is the newest complete write, so it is used when the data file is gone or bad.
 */
export const loadAppData = async (): Promise<AppData> =>
  (await tryRead(dataFile())) ?? (await tryRead(tempFile())) ?? EMPTY;

export const saveAppData = async (data: AppData): Promise<void> => {
  const temp = tempFile();
  if (!temp.exists) temp.create();
  await temp.write(JSON.stringify(data));
  // On Android an overwriting move removes the old file just before renaming; the temp file covers that gap on load.
  await temp.move(dataFile(), { overwrite: true });
};
