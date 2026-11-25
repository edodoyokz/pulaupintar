import type { AppData } from "./storage";

/**
 * Runs saves one after another in call order, so an older write can never land after a newer one.
 * A failed save is reported and skipped; the returned promise never rejects, so callers can't leak a rejection.
 */
export const createSaveQueue = (save: (data: AppData) => Promise<void>, onError: (error: unknown) => void) => {
  let tail: Promise<void> = Promise.resolve();
  return (data: AppData): Promise<void> => {
    tail = tail.then(() => save(data)).catch(onError);
    return tail;
  };
};
