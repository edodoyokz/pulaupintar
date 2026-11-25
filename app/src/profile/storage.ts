import { File, Paths } from "expo-file-system";

export type ChildProfile = {
  id: string;
  name: string;
  age: number;
  stars: number;
  completedLessons: string[];
};

// One parent device can hold several children, ready for family subscriptions later.
export type AppData = {
  version: 1;
  activeChildId: string | null;
  children: ChildProfile[];
};

const EMPTY: AppData = { version: 1, activeChildId: null, children: [] };
const dataFile = () => new File(Paths.document, "pulaupintar.json");

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
