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

// Own properties only: a spoken "constructor" or "toString" must not resolve to something on Object.prototype.
const own = <T>(record: Record<string, T>, key: string): T | undefined => (Object.hasOwn(record, key) ? record[key] : undefined);

// The longest number phrase is tried first, so "dua belas" becomes 12 before "dua" becomes 2.
const MAX_PHRASE_WORDS: Record<Lang, number> = {
  id: Math.max(...Object.keys(NUMBER_WORDS.id).map((phrase) => phrase.split(" ").length)),
  en: Math.max(...Object.keys(NUMBER_WORDS.en).map((phrase) => phrase.split(" ").length)),
};

// Indonesian speech-to-text often drops a final "h" ("tujuh" comes back as "tuju"); read those as the number word.
const SPOKEN_SPELLINGS: Record<Lang, Record<string, string>> = { id: { tuju: "tujuh", sepulu: "sepuluh" }, en: {} };

/**
 * The words a child may say in a lesson, for speech recognition to listen for: every answer, plus the
 * spoken form of number answers ("7" is said "tujuh" or "seven"). All answers, not just the right one,
 * so a wrong answer is still heard as it was said.
 */
export const speechVocabulary = (answers: string[], lang: Lang): string[] => {
  const spoken = Object.entries(NUMBER_WORDS[lang]);
  return [
    ...new Set(answers.flatMap((answer) => [answer, ...spoken.filter(([, digits]) => digits === answer).map(([word]) => word)])),
  ];
};

// Dropped only from what the child said, never from an expected answer, and only when
// other words remain: "em, be" is "be", but a lone "em" (the letter M) or "kak" (K) stays.
const FILLER_WORDS = new Set(["eh", "em", "emm", "hmm", "ehm", "itu", "ya", "kak", "jawabannya", "adalah", "the", "it's", "is"]);

const toWords = (text: string, lang: Lang): string[] => {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}' ]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => own(SPOKEN_SPELLINGS[lang], word) ?? word);
  const result: string[] = [];
  let index = 0;
  while (index < words.length) {
    let used = 1;
    let digits: string | undefined;
    for (let length = Math.min(MAX_PHRASE_WORDS[lang], words.length - index); length >= 1; length--) {
      digits = own(NUMBER_WORDS[lang], words.slice(index, index + length).join(" "));
      if (digits !== undefined) {
        used = length;
        break;
      }
    }
    result.push(digits ?? words[index]);
    index += used;
  }
  return result;
};

export const normalizeAnswer = (text: string, lang: Lang = "id", keepWords?: Set<string>): string => {
  const words = toWords(text, lang);
  const content = words.filter((word) => keepWords?.has(word) || !FILLER_WORDS.has(word));
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
  const expected = answers.map((answer) => toWords(answer, lang).join(" ")).filter(Boolean);
  const expectedWords = new Set(expected.flatMap((answer) => answer.split(" ")));
  const said = normalizeAnswer(childSaid, lang, expectedWords);
  if (said === "") return false;

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
