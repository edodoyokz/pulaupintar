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

export const todayKey = (): string => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export const loadAppData = async (): Promise<AppData> => {
  try {
    const file = dataFile();
    if (!file.exists) return EMPTY;
    return JSON.parse(await file.text()) as AppData;
  } catch {
    return EMPTY;
  }
};

export const saveAppData = async (data: AppData): Promise<void> => {
  const file = dataFile();
  if (!file.exists) file.create();
  await file.write(JSON.stringify(data));
};
