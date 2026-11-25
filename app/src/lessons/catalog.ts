import type { Lang, LessonItem, Subject } from "@/api/types";

export type Lesson = {
  id: string;
  subject: Subject;
  level: number;
  title: string;
  goal: string;
  answerLang: Lang;
  items: LessonItem[];
};

export type Place = {
  subject: Subject;
  name: string;
  emoji: string;
  color: string;
};

export const PLACES: Place[] = [
  { subject: "berhitung", name: "Kebun Angka", emoji: "🍎", color: "#FFB547" },
  { subject: "membaca", name: "Rumah Huruf", emoji: "🏠", color: "#5CC8A1" },
  { subject: "inggris", name: "Pantai English", emoji: "🏖️", color: "#5AA9F2" },
];

// One starter level per subject so the voice loop can be tried end to end.
// The full five-level curriculum from the spec is filled in next.
export const LESSONS: Lesson[] = [
  {
    id: "berhitung-1",
    subject: "berhitung",
    level: 1,
    title: "Menghitung benda 1 sampai 5",
    goal: "Anak bisa menghitung benda sampai 5 dan menyebut angkanya.",
    answerLang: "id",
    items: [
      { question: "Ada berapa apel di gambar?", answers: ["2"], visual: "🍎🍎" },
      { question: "Ada berapa bintang di gambar?", answers: ["3"], visual: "⭐⭐⭐" },
      { question: "Ada berapa ikan di gambar?", answers: ["5"], visual: "🐟🐟🐟🐟🐟" },
    ],
  },
  {
    id: "membaca-1",
    subject: "membaca",
    level: 1,
    title: "Mengenal huruf vokal",
    goal: "Anak bisa menyebut huruf vokal a, i, u, e, o.",
    answerLang: "id",
    items: [
      { question: "Huruf apa ini?", answers: ["a"], visual: "A" },
      { question: "Huruf apa ini?", answers: ["i"], visual: "I" },
      { question: "Huruf apa ini?", answers: ["u"], visual: "U" },
    ],
  },
  {
    id: "inggris-1",
    subject: "inggris",
    level: 1,
    title: "Warna dalam Bahasa Inggris",
    goal: "Anak bisa menyebut warna merah, biru, dan kuning dalam Bahasa Inggris.",
    answerLang: "en",
    items: [
      { question: "Apa Bahasa Inggrisnya merah?", answers: ["red"], visual: "🔴" },
      { question: "Apa Bahasa Inggrisnya biru?", answers: ["blue"], visual: "🔵" },
      { question: "Apa Bahasa Inggrisnya kuning?", answers: ["yellow"], visual: "🟡" },
    ],
  },
];

export const findLesson = (subject: Subject): Lesson | undefined =>
  LESSONS.find((lesson) => lesson.subject === subject);
