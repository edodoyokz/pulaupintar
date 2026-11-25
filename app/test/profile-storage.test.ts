import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory stand-in for expo-file-system. `move` with overwrite replaces the target, like on Android.
const files = new Map<string, string>();
const failures = { text: new Set<string>() };

vi.mock("expo-file-system", () => {
  class File {
    uri: string;
    constructor(base: string, name: string) {
      this.uri = `${base}/${name}`;
    }
    get exists() {
      return files.has(this.uri);
    }
    create() {
      files.set(this.uri, "");
    }
    async text() {
      if (failures.text.has(this.uri)) throw new Error("read failed");
      return files.get(this.uri) ?? "";
    }
    async write(content: string) {
      files.set(this.uri, content);
    }
    async copy(to: File) {
      files.set(to.uri, files.get(this.uri) ?? "");
    }
    async move(to: File, options?: { overwrite?: boolean }) {
      if (files.has(to.uri) && !options?.overwrite) throw new Error("exists");
      files.set(to.uri, files.get(this.uri) ?? "");
      files.delete(this.uri);
    }
  }
  return { File, Paths: { document: "doc" } };
});

import { createSaveQueue } from "../src/profile/save-queue";
import { loadAppData, saveAppData, type AppData } from "../src/profile/storage";

const sample = (name: string): AppData => ({
  version: 1,
  activeChildId: "1",
  children: [{ id: "1", name, age: 5, stars: 3, completedLessons: [] }],
});
const corruptCopies = () => [...files.keys()].filter((uri) => uri.includes("corrupt"));

beforeEach(() => {
  files.clear();
  failures.text.clear();
});

describe("profile storage", () => {
  it("starts empty on a fresh install without keeping any copy", async () => {
    expect((await loadAppData()).children).toEqual([]);
    expect(corruptCopies()).toHaveLength(0);
  });

  it("round-trips a save and leaves no temp file", async () => {
    await saveAppData(sample("Aya"));
    await saveAppData(sample("Budi"));
    expect((await loadAppData()).children[0].name).toBe("Budi");
    expect([...files.keys()]).toEqual(["doc/pulaupintar.json"]);
  });

  it.each([
    ["broken JSON", "{not json"],
    ["a wrong shape", JSON.stringify({ version: 2, children: [] })],
    ["no children list", JSON.stringify({ version: 1 })],
  ])("keeps a copy before starting empty on %s", async (_name, raw) => {
    files.set("doc/pulaupintar.json", raw);
    expect((await loadAppData()).children).toEqual([]);
    const [copy] = corruptCopies();
    expect(files.get(copy)).toBe(raw);
  });

  it("keeps a copy when the file can't be read", async () => {
    files.set("doc/pulaupintar.json", JSON.stringify(sample("Aya")));
    failures.text.add("doc/pulaupintar.json");
    expect((await loadAppData()).children).toEqual([]);
    expect(corruptCopies()).toHaveLength(1);
  });

  it("recovers a leftover temp file when the data file is missing", async () => {
    files.set("doc/pulaupintar.json.tmp", JSON.stringify(sample("Aya")));
    expect((await loadAppData()).children[0].name).toBe("Aya");
  });

  it("prefers the data file over a half-written temp file", async () => {
    files.set("doc/pulaupintar.json", JSON.stringify(sample("Aya")));
    files.set("doc/pulaupintar.json.tmp", '{"version":1,"chil');
    expect((await loadAppData()).children[0].name).toBe("Aya");
  });
});

describe("save queue", () => {
  it("finishes saves in call order even when an earlier one is slower", async () => {
    const landed: string[] = [];
    const save = createSaveQueue(
      (data) => new Promise<void>((resolve) => setTimeout(() => (landed.push(data.children[0].name), resolve()), data.children[0].name === "first" ? 20 : 0)),
      () => undefined,
    );
    await Promise.all([save(sample("first")), save(sample("second")), save(sample("last"))]);
    expect(landed).toEqual(["first", "second", "last"]);
  });

  it("reports a failed save, never rejects, and keeps saving", async () => {
    const onError = vi.fn();
    const landed: string[] = [];
    const save = createSaveQueue(async (data) => {
      if (data.children[0].name === "bad") throw new Error("disk full");
      landed.push(data.children[0].name);
    }, onError);
    await expect(save(sample("bad"))).resolves.toBeUndefined();
    await save(sample("good"));
    expect(onError).toHaveBeenCalledTimes(1);
    expect(landed).toEqual(["good"]);
  });
});
