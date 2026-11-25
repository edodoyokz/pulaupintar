import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
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
  /** Counts time from a lesson the child left before the end. */
  recordUsage: (seconds: number) => Promise<void>;
  setDailyLimit: (minutes: number) => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<AppData | null>(null);
  // Latest data, so a write from a screen that is closing never uses an old copy.
  const dataRef = useRef<AppData | null>(null);

  useEffect(() => {
    loadAppData().then((loaded) => {
      dataRef.current = loaded;
      setData(loaded);
    });
  }, []);

  const update = async (next: AppData) => {
    dataRef.current = next;
    setData(next);
    await saveAppData(next);
  };

  const activeChild = (current: AppData) =>
    current.children.find((profile) => profile.id === current.activeChildId) ?? null;

  const secondsToday = (profile: ChildProfile) => (profile.usage?.date === todayKey() ? profile.usage.seconds : 0);

  const updateActiveChild = async (change: (profile: ChildProfile) => ChildProfile) => {
    const current = dataRef.current;
    const profile = current && activeChild(current);
    if (!current || !profile) return;
    const updated = change(profile);
    await update({
      ...current,
      children: current.children.map((candidate) => (candidate.id === profile.id ? updated : candidate)),
    });
  };

  const child = data ? activeChild(data) : null;
  const dailyLimitMinutes = data?.dailyLimitMinutes ?? DEFAULT_DAILY_LIMIT_MINUTES;
  const usedToday = child ? secondsToday(child) : 0;

  const addChild = async (name: string, age: number) => {
    const base = dataRef.current ?? { version: 1 as const, activeChildId: null, children: [] };
    const profile: ChildProfile = { id: `${Date.now()}`, name, age, stars: 0, completedLessons: [] };
    await update({ ...base, activeChildId: profile.id, children: [...base.children, profile] });
  };

  const recordSession = ({ lessonId, stars, passed, seconds }: SessionResult) =>
    updateActiveChild((profile) => ({
      ...profile,
      stars: profile.stars + stars,
      completedLessons:
        passed && !profile.completedLessons.includes(lessonId)
          ? [...profile.completedLessons, lessonId]
          : profile.completedLessons,
      usage: { date: todayKey(), seconds: secondsToday(profile) + seconds },
    }));

  const recordUsage = (seconds: number) =>
    updateActiveChild((profile) => ({
      ...profile,
      usage: { date: todayKey(), seconds: secondsToday(profile) + seconds },
    }));

  const setDailyLimit = async (minutes: number) => {
    const current = dataRef.current;
    if (!current) return;
    await update({ ...current, dailyLimitMinutes: minutes });
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
        recordUsage,
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
