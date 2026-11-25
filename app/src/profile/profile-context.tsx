import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  DEFAULT_DAILY_LIMIT_MINUTES,
  loadAppData,
  saveAppData,
  todayKey,
  type AppData,
  type ChildProfile,
} from "./storage";

type SessionResult = { lessonId: string; stars: number; passed: boolean; seconds: number };

type ProfileContextValue = {
  ready: boolean;
  child: ChildProfile | null;
  dailyLimitMinutes: number;
  /** True once today's learning time has reached the parent's limit. */
  limitReached: boolean;
  addChild: (name: string, age: number) => Promise<void>;
  recordSession: (result: SessionResult) => Promise<void>;
  setDailyLimit: (minutes: number) => Promise<void>;
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
  const dailyLimitMinutes = data?.dailyLimitMinutes ?? DEFAULT_DAILY_LIMIT_MINUTES;
  const usedToday = child?.usage?.date === todayKey() ? child.usage.seconds : 0;

  const addChild = async (name: string, age: number) => {
    const base = data ?? { version: 1 as const, activeChildId: null, children: [] };
    const profile: ChildProfile = { id: `${Date.now()}`, name, age, stars: 0, completedLessons: [] };
    await update({ ...base, activeChildId: profile.id, children: [...base.children, profile] });
  };

  const recordSession = async ({ lessonId, stars, passed, seconds }: SessionResult) => {
    if (!data || !child) return;
    const updated: ChildProfile = {
      ...child,
      stars: child.stars + stars,
      completedLessons:
        passed && !child.completedLessons.includes(lessonId)
          ? [...child.completedLessons, lessonId]
          : child.completedLessons,
      usage: { date: todayKey(), seconds: usedToday + seconds },
    };
    await update({
      ...data,
      children: data.children.map((profile) => (profile.id === child.id ? updated : profile)),
    });
  };

  const setDailyLimit = async (minutes: number) => {
    if (!data) return;
    await update({ ...data, dailyLimitMinutes: minutes });
  };

  return (
    <ProfileContext.Provider
      value={{
        ready: data !== null,
        child,
        dailyLimitMinutes,
        limitReached: usedToday >= dailyLimitMinutes * 60,
        addChild,
        recordSession,
        setDailyLimit,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = (): ProfileContextValue => {
  const value = useContext(ProfileContext);
  if (!value) throw new Error("useProfile must be used inside ProfileProvider");
  return value;
};
