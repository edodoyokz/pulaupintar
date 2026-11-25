import type { Lang } from "@/api/types";

// Number words of the lesson's answer language only, so "tiga" is not a right answer in an English lesson.
const NUMBER_WORDS: Record<Lang, Record<string, string>> = {
  id: {
    nol: "0", satu: "1", dua: "2", tiga: "3", empat: "4", lima: "5",
    enam: "6", tujuh: "7", delapan: "8", sembilan: "9", sepuluh: "10",
    sebelas: "11", "dua belas": "12", "tiga belas": "13", "empat belas": "14",
    "lima belas": "15", "enam belas": "16", "tujuh belas": "17",
    "delapan belas": "18", "sembilan belas": "19", "dua puluh": "20",
  },
  en: {
    zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5",
    six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
  },
};

// Longest phrases first, so "dua belas" becomes 12 before "dua" becomes 2.
const NUMBER_PHRASES: Record<Lang, string[]> = {
  id: Object.keys(NUMBER_WORDS.id).sort((a, b) => b.length - a.length),
  en: Object.keys(NUMBER_WORDS.en).sort((a, b) => b.length - a.length),
};

// Dropped only from what the child said, never from an expected answer, and only when
// other words remain: "em, be" is "be", but a lone "em" (the letter M) or "kak" (K) stays.
const FILLER_WORDS = new Set(["eh", "em", "emm", "hmm", "ehm", "itu", "ya", "kak", "jawabannya", "adalah", "the", "it's", "is"]);

const toWords = (text: string, lang: Lang): string[] => {
  let normalized = ` ${text.toLowerCase().replace(/[^\p{L}\p{N}' ]+/gu, " ").replace(/\s+/g, " ").trim()} `;
  for (const phrase of NUMBER_PHRASES[lang]) {
    normalized = normalized.replaceAll(` ${phrase} `, ` ${NUMBER_WORDS[lang][phrase]} `);
  }
  return normalized.trim().split(" ").filter(Boolean);
};

export const normalizeAnswer = (text: string, lang: Lang = "id"): string => {
  const words = toWords(text, lang);
  const content = words.filter((word) => !FILLER_WORDS.has(word));
  return (content.length > 0 ? content : words).join(" ");
};

const isNumber = (word: string) => /^\p{N}+$/u.test(word);

const containsWords = (said: string, words: string) => words !== "" && ` ${said} `.includes(` ${words} `);

/**
 * The app, not the LLM, decides whether an answer is right.
 *
 * A child often wraps the answer in other words ("tiga apel!"), so the
 * expected answer counts when it appears as whole words in what was said.
 * Two guards stop a child from scoring by saying everything:
 * - for a number answer, the last number said is the answer
 *   ("satu dua tiga, tiga!" is 3, "satu dua tiga empat" is 4);
 * - if the child also says another answer from the same lesson
 *   ("kiri atau kanan"), it does not count.
 */
export const isCorrectAnswer = (
  childSaid: string,
  answers: string[],
  otherAnswers: string[] = [],
  lang: Lang = "id",
): boolean => {
  const said = normalizeAnswer(childSaid, lang);
  if (said === "") return false;
  const expected = answers.map((answer) => toWords(answer, lang).join(" ")).filter(Boolean);

  const numericAnswers = expected.filter(isNumber);
  if (numericAnswers.length > 0) {
    const lastNumber = said.split(" ").filter(isNumber).at(-1);
    return lastNumber !== undefined && numericAnswers.includes(lastNumber);
  }

  if (!expected.some((answer) => containsWords(said, answer))) return false;
  const rivals = otherAnswers
    .map((answer) => toWords(answer, lang).join(" "))
    .filter((rival) => rival !== "" && !expected.some((answer) => containsWords(answer, rival)));
  return !rivals.some((rival) => containsWords(said, rival));
};
