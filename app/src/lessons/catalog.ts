import type { Lang, SpeechSegment, Subject } from "@/api/types";
import type { IllustrationKind, ObjectKind } from "@/ui/picture";

export type Picture =
  | { kind: "objects"; object: ObjectKind; count: number }
  | { kind: "compare"; object: ObjectKind; left: number; rightObject: ObjectKind; right: number }
  | { kind: "sum"; object: ObjectKind; a: number; b: number }
  | { kind: "text"; text: string }
  | { kind: "swatch"; color: string }
  | { kind: "illustration"; illustration: IllustrationKind; label?: string };

export type AppItem = {
  question: string;
  answers: string[];
  /** Plain description of the picture, sent to the tutor so it can talk about it. */
  visual: string;
  picture: Picture;
  /**
   * For answers a child can't work out (a letter's name, an English word): Kak Pinta says it first and asks the child
   * to repeat it, instead of quizzing on something never taught. Played as written, not by the LLM.
   */
  model?: SpeechSegment[];
};

export type Lesson = {
  id: string;
  subject: Subject;
  level: number;
  title: string;
  goal: string;
  answerLang: Lang;
  pool: AppItem[];
  sticker: { name: string; object: ObjectKind };
};

export type Place = {
  subject: Subject;
  name: string;
  subjectName: string;
  color: string;
  tint: string;
  shadow: string;
};

export const LEVELS_PER_SUBJECT = 5;
export const SESSION_SIZE = 5;
const PASS_RATIO = 0.8;

export const PLACES: Place[] = [
  { subject: "berhitung", name: "Kebun Angka", subjectName: "Berhitung", color: "#D9601A", tint: "#FFE3CC", shadow: "#F2C29B" },
  { subject: "membaca", name: "Rumah Huruf", subjectName: "Membaca", color: "#1E7A4C", tint: "#D8F3E6", shadow: "#A9DEC6" },
  { subject: "inggris", name: "Pantai English", subjectName: "Bahasa Inggris", color: "#1F5FBF", tint: "#D9EAFB", shadow: "#A8CBF0" },
];

const OBJECT_NOUN: Record<ObjectKind, string> = { apple: "apel", star: "bintang", fish: "ikan", ball: "bola" };

const NUMBER_WORD: Record<number, string> = {
  1: "satu", 2: "dua", 3: "tiga", 4: "empat", 5: "lima", 6: "enam", 7: "tujuh", 8: "delapan", 9: "sembilan", 10: "sepuluh",
};

const numeral = (n: number): AppItem => ({
  question: "Angka berapa ini?",
  answers: [String(n)],
  visual: `angka ${n}`,
  picture: { kind: "text", text: String(n) },
});

const counting = (object: ObjectKind, count: number): AppItem => ({
  question: `Ada berapa ${OBJECT_NOUN[object]} di gambar?`,
  answers: [String(count)],
  visual: `${count} ${OBJECT_NOUN[object]}`,
  picture: { kind: "objects", object, count },
});

/** Two different objects, so the child answers with what they see ("apel"), not with left and right, which many 4-5 year olds still mix up. */
const comparing = (leftObject: ObjectKind, left: number, rightObject: ObjectKind, right: number, more: boolean): AppItem => {
  const [leftNoun, rightNoun] = [OBJECT_NOUN[leftObject], OBJECT_NOUN[rightObject]];
  const answers = left === right ? ["sama", "sama banyak"] : [(left > right) === more ? leftNoun : rightNoun];
  return {
    question: `Mana yang lebih ${more ? "banyak" : "sedikit"}, ${leftNoun} atau ${rightNoun}?`,
    answers,
    visual: `kiri ${left} ${leftNoun}, kanan ${right} ${rightNoun}`,
    picture: { kind: "compare", object: leftObject, left, rightObject, right },
  };
};

const adding = (object: ObjectKind, a: number, b: number): AppItem => ({
  question: `Berapa ${NUMBER_WORD[a]} tambah ${NUMBER_WORD[b]}?`,
  answers: [String(a + b)],
  visual: `${a} ${OBJECT_NOUN[object]} ditambah ${b} ${OBJECT_NOUN[object]}`,
  picture: { kind: "sum", object, a, b },
});

// STT often spells Indonesian vowels as short interjections.
const VOWEL_SOUNDS_LIKE: Record<string, string[]> = { a: ["ah"], i: ["ih"], u: ["uh"], e: ["eh"], o: ["oh"] };

const letter = (value: string): AppItem => ({
  question: "Huruf apa ini?",
  answers: [value, ...(VOWEL_SOUNDS_LIKE[value] ?? [])],
  visual: `huruf ${value.toUpperCase()}`,
  picture: { kind: "text", text: value.toUpperCase() },
  model: [{ lang: "id", text: `Ini huruf ${value.toUpperCase()}. Coba ucapkan: ${value}!` }],
});

// Letter names as Indonesian children say them, so speech-to-text can return either form.
const LETTER_NAMES: Record<string, string> = { b: "be", d: "de", k: "ka", m: "em", p: "pe", s: "es", t: "te" };

// Speech-to-text often hears the letter name "ka" as the common word "kak".
const SOUNDS_LIKE: Record<string, string[]> = { k: ["kak"] };

const consonant = (value: string): AppItem => ({
  question: "Huruf apa ini?",
  answers: [value, LETTER_NAMES[value], ...(SOUNDS_LIKE[value] ?? [])],
  visual: `huruf ${value.toUpperCase()}`,
  picture: { kind: "text", text: value.toUpperCase() },
  model: [{ lang: "id", text: `Ini huruf ${value.toUpperCase()}, dibaca ${LETTER_NAMES[value]}. Coba ucapkan: ${LETTER_NAMES[value]}!` }],
});

const reading = (text: string, what: "suku kata" | "kata" | "kalimat"): AppItem => ({
  question: `Coba baca ${what} ini.`,
  answers: [text],
  visual: `tulisan "${text}"`,
  picture: { kind: "text", text },
});

/** Kak Pinta shows the word first: "Ini kucing. Bahasa Inggrisnya cat. Coba ucapkan: cat." */
const showEnglish = (intro: string, english: string): SpeechSegment[] => [
  { lang: "id", text: `${intro} Bahasa Inggrisnya` },
  { lang: "en", text: english },
  { lang: "id", text: "Coba ucapkan:" },
  { lang: "en", text: english },
];

/** Kak Pinta says the Indonesian word; the card shows an illustration and label so pre-readers and parents both follow. */
const translate = (indonesian: string, answers: string[], topic: string, illustration: IllustrationKind): AppItem => ({
  question: `Apa Bahasa Inggrisnya ${indonesian}?`,
  answers,
  visual: `${topic}: ${indonesian}`,
  picture: { kind: "illustration", illustration, label: indonesian },
  model: showEnglish(`Ini ${indonesian}.`, answers[0]),
});

const ENGLISH_NUMBER: Record<number, string> = {
  1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten",
};

// The English word comes first so the tutor says "three", not a digit Indonesian TTS would read as "tiga".
const englishNumber = (n: number): AppItem => ({
  question: `Apa Bahasa Inggrisnya angka ${NUMBER_WORD[n]}?`,
  answers: [ENGLISH_NUMBER[n], String(n)],
  visual: `angka ${n}`,
  picture: { kind: "text", text: String(n) },
  model: showEnglish(`Ini angka ${NUMBER_WORD[n]}.`, ENGLISH_NUMBER[n]),
});

const color = (indonesian: string, english: string, hex: string): AppItem => ({
  question: `Apa Bahasa Inggrisnya ${indonesian}?`,
  answers: [english],
  visual: `warna ${indonesian}`,
  picture: { kind: "swatch", color: hex },
  model: showEnglish(`Ini warna ${indonesian}.`, english),
});

const BERHITUNG_LEVELS: Omit<Lesson, "id" | "subject" | "level">[] = [
  {
    title: "Menyebut angka 1 sampai 10",
    goal: "Anak bisa mengenali dan menyebut angka 1 sampai 10.",
    answerLang: "id",
    sticker: { name: "Angka Ceria", object: "star" },
    pool: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(numeral),
  },
  {
    title: "Menghitung benda sampai 10",
    goal: "Anak bisa menghitung benda sampai 10 dan menyebut jumlahnya.",
    answerLang: "id",
    sticker: { name: "Apel Pintar", object: "apple" },
    pool: [
      counting("apple", 2), counting("star", 3), counting("fish", 4), counting("ball", 5),
      counting("apple", 6), counting("star", 7), counting("fish", 8), counting("ball", 9), counting("apple", 10),
    ],
  },
  {
    title: "Lebih banyak atau lebih sedikit",
    goal: "Anak bisa membandingkan dua kelompok benda.",
    answerLang: "id",
    sticker: { name: "Timbangan Lucu", object: "fish" },
    pool: [
      comparing("apple", 2, "star", 5, true), comparing("star", 6, "fish", 3, true), comparing("fish", 4, "ball", 1, true),
      comparing("ball", 3, "apple", 7, true), comparing("apple", 5, "fish", 2, false), comparing("star", 1, "ball", 4, false),
      comparing("fish", 7, "apple", 3, false), comparing("ball", 2, "star", 6, false), comparing("apple", 4, "star", 4, true),
    ],
  },
  {
    title: "Angka 11 sampai 20",
    goal: "Anak bisa mengenali angka 11 sampai 20 dan menghitung benda sampai 15.",
    answerLang: "id",
    sticker: { name: "Bintang Besar", object: "star" },
    // Counting stops at 15: more small objects than that on a phone screen is too hard for a 5 year old.
    pool: [
      numeral(11), numeral(13), numeral(16), numeral(17), numeral(19), numeral(20),
      counting("star", 12), counting("apple", 14), counting("fish", 15),
    ],
  },
  {
    title: "Menambah sampai 10",
    goal: "Anak bisa menjumlahkan dua angka kecil dengan hasil sampai 10.",
    answerLang: "id",
    sticker: { name: "Jago Tambah", object: "ball" },
    pool: [
      adding("apple", 1, 2), adding("star", 2, 2), adding("fish", 3, 1), adding("ball", 2, 3),
      adding("apple", 4, 2), adding("star", 3, 3), adding("fish", 5, 2), adding("ball", 4, 4),
      adding("apple", 5, 4), adding("star", 7, 3), adding("fish", 5, 5),
    ],
  },
];

const MEMBACA_LEVELS: Omit<Lesson, "id" | "subject" | "level">[] = [
  {
    title: "Mengenal huruf vokal",
    goal: "Anak bisa menyebut huruf vokal a, i, u, e, o.",
    answerLang: "id",
    sticker: { name: "Huruf Ceria", object: "star" },
    pool: ["a", "i", "u", "e", "o"].map(letter),
  },
  {
    title: "Mengenal huruf konsonan",
    goal: "Anak bisa menyebut nama huruf b, d, k, m, p, s, t.",
    answerLang: "id",
    sticker: { name: "Teman Huruf", object: "ball" },
    pool: ["b", "d", "k", "m", "p", "s", "t"].map(consonant),
  },
  {
    title: "Suku kata terbuka",
    goal: "Anak bisa membaca suku kata seperti ba, bi, bu, ma, mi.",
    answerLang: "id",
    sticker: { name: "Suku Kata Seru", object: "fish" },
    pool: ["ba", "bi", "bu", "ma", "mi", "mu", "sa", "pa"].map((text) => reading(text, "suku kata")),
  },
  {
    title: "Kata dua suku kata",
    goal: "Anak bisa membaca kata pendek seperti bola, buku, mama.",
    answerLang: "id",
    sticker: { name: "Kutu Buku", object: "apple" },
    pool: ["bola", "buku", "mama", "papa", "sapu", "kaki", "roti", "topi"].map((text) => reading(text, "kata")),
  },
  {
    title: "Kalimat pendek",
    goal: "Anak bisa membaca kalimat dua kata.",
    answerLang: "id",
    sticker: { name: "Jago Baca", object: "star" },
    pool: ["ini bola", "adik makan", "ibu masak", "adik tidur", "bapak baca", "kakak lari"].map((text) =>
      reading(text, "kalimat"),
    ),
  },
];

const INGGRIS_LEVELS: Omit<Lesson, "id" | "subject" | "level">[] = [
  {
    title: "Warna dalam Bahasa Inggris",
    goal: "Anak bisa menyebut warna dasar dalam Bahasa Inggris.",
    answerLang: "en",
    sticker: { name: "Pelangi Kecil", object: "ball" },
    pool: [
      color("merah", "red", "#E8483B"), color("biru", "blue", "#4DA3E8"), color("kuning", "yellow", "#FFC83D"),
      color("hijau", "green", "#3DBE7A"), color("oranye", "orange", "#F08A24"), color("merah muda", "pink", "#FF7EB6"),
      color("ungu", "purple", "#8E5CD9"), color("cokelat", "brown", "#8B5A2B"), color("hitam", "black", "#2B2B2B"),
      color("putih", "white", "#FFFFFF"),
    ],
  },
  {
    title: "Hewan di sekitar",
    goal: "Anak bisa menyebut nama hewan dalam Bahasa Inggris.",
    answerLang: "en",
    sticker: { name: "Sahabat Hewan", object: "fish" },
    pool: [
      translate("kucing", ["cat"], "hewan", "cat"),
      translate("anjing", ["dog"], "hewan", "dog"),
      translate("burung", ["bird"], "hewan", "bird"),
      translate("ikan", ["fish"], "hewan", "fish"),
      translate("sapi", ["cow"], "hewan", "cow"),
      translate("bebek", ["duck"], "hewan", "duck"),
    ],
  },
  {
    title: "Anggota tubuh",
    goal: "Anak bisa menyebut anggota tubuh dalam Bahasa Inggris.",
    answerLang: "en",
    sticker: { name: "Tubuh Sehat", object: "apple" },
    pool: [
      translate("mata", ["eye", "eyes"], "anggota tubuh", "eye"),
      translate("hidung", ["nose", "noses"], "anggota tubuh", "nose"),
      translate("mulut", ["mouth", "mouths"], "anggota tubuh", "mouth"),
      translate("tangan", ["hand", "hands"], "anggota tubuh", "hand"),
      translate("kaki", ["foot", "feet", "leg", "legs"], "anggota tubuh", "foot"),
      translate("telinga", ["ear", "ears"], "anggota tubuh", "ear"),
    ],
  },
  {
    title: "Angka 1 sampai 10",
    goal: "Anak bisa menyebut angka 1 sampai 10 dalam Bahasa Inggris.",
    answerLang: "en",
    sticker: { name: "Number Star", object: "star" },
    pool: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(englishNumber),
  },
  {
    title: "Salam dan kalimat sederhana",
    goal: "Anak bisa mengucapkan salam sederhana dalam Bahasa Inggris.",
    answerLang: "en",
    sticker: { name: "Ramah Sekali", object: "ball" },
    pool: [
      translate("halo", ["hello", "hi"], "salam", "wave"),
      translate("selamat pagi", ["good morning"], "salam", "sunrise"),
      translate("terima kasih", ["thank you", "thanks", "thankyou"], "salam", "heart"),
      translate("selamat tinggal", ["goodbye", "good bye", "bye"], "salam", "goodbye"),
      translate("selamat malam", ["good night", "goodnight"], "salam", "moon"),
    ],
  },
];

/** Titles of every planned level, so locked levels can show what is coming. */
export const LEVEL_TITLES: Record<Subject, string[]> = {
  berhitung: BERHITUNG_LEVELS.map((level) => level.title),
  membaca: MEMBACA_LEVELS.map((level) => level.title),
  inggris: INGGRIS_LEVELS.map((level) => level.title),
};

const BUILT: Record<Subject, Omit<Lesson, "id" | "subject" | "level">[]> = {
  berhitung: BERHITUNG_LEVELS,
  membaca: MEMBACA_LEVELS,
  inggris: INGGRIS_LEVELS,
};

export const lessonId = (subject: Subject, level: number) => `${subject}-${level}`;

export const findLesson = (subject: Subject, level: number): Lesson | undefined => {
  const built = BUILT[subject][level - 1];
  return built ? { ...built, id: lessonId(subject, level), subject, level } : undefined;
};

export const ALL_LESSONS: Lesson[] = (["berhitung", "membaca", "inggris"] as const).flatMap((subject) =>
  BUILT[subject].map((built, index) => ({
    ...built,
    id: lessonId(subject, index + 1),
    subject,
    level: index + 1,
  })),
);

export const findLessonById = (id: string): Lesson | undefined => {
  const [subject, level] = id.split("-");
  return findLesson(subject as Subject, Number(level));
};

export const isUnlocked = (subject: Subject, level: number, completed: string[]): boolean =>
  findLesson(subject, level) !== undefined && (level === 1 || completed.includes(lessonId(subject, level - 1)));

export const completedCount = (subject: Subject, completed: string[]): number =>
  completed.filter((id) => id.startsWith(`${subject}-`)).length;

export const nextLevel = (subject: Subject, completed: string[]): number | null => {
  for (let level = 1; level <= LEVELS_PER_SUBJECT; level += 1) {
    if (isUnlocked(subject, level, completed) && !completed.includes(lessonId(subject, level))) return level;
  }
  return null;
};

const shuffle = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
};

export const pickSessionItems = (lesson: Lesson): AppItem[] => shuffle(lesson.pool).slice(0, SESSION_SIZE);

export const starsFor = (correct: number, total: number): { passed: boolean; stars: number } => {
  const passed = correct >= Math.ceil(total * PASS_RATIO);
  return { passed, stars: correct === total ? 3 : passed ? 2 : 1 };
};
