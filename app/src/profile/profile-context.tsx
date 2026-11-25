import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { loadAppData, saveAppData, type AppData, type ChildProfile } from "./storage";

type ProfileContextValue = {
  ready: boolean;
  child: ChildProfile | null;
  addChild: (name: string, age: number) => Promise<void>;
  recordLessonDone: (lessonId: string, stars: number) => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<AppData | null>(null);

  useEffect(() => {
    loadAppData().then(setData);
  }, []);

  const update = async (next: AppData) => {
    setData(next);
    await saveAppData(next);
  };

  const child = data?.children.find((profile) => profile.id === data.activeChildId) ?? null;

  const addChild = async (name: string, age: number) => {
    const base = data ?? { version: 1 as const, activeChildId: null, children: [] };
    const profile: ChildProfile = { id: `${Date.now()}`, name, age, stars: 0, completedLessons: [] };
    await update({ ...base, activeChildId: profile.id, children: [...base.children, profile] });
  };

  const recordLessonDone = async (lessonId: string, stars: number) => {
    if (!data || !child) return;
    const updated: ChildProfile = {
      ...child,
      stars: child.stars + stars,
      completedLessons: child.completedLessons.includes(lessonId)
        ? child.completedLessons
        : [...child.completedLessons, lessonId],
    };
    await update({
      ...data,
      children: data.children.map((profile) => (profile.id === child.id ? updated : profile)),
    });
  };

  return (
    <ProfileContext.Provider value={{ ready: data !== null, child, addChild, recordLessonDone }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = (): ProfileContextValue => {
  const value = useContext(ProfileContext);
  if (!value) throw new Error("useProfile must be used inside ProfileProvider");
  return value;
};
