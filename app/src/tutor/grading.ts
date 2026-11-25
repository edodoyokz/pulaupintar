const NUMBER_WORDS: Record<string, string> = {
  nol: "0", satu: "1", dua: "2", tiga: "3", empat: "4", lima: "5",
  enam: "6", tujuh: "7", delapan: "8", sembilan: "9", sepuluh: "10",
  sebelas: "11", "dua belas": "12", "tiga belas": "13", "empat belas": "14",
  "lima belas": "15", "enam belas": "16", "tujuh belas": "17",
  "delapan belas": "18", "sembilan belas": "19", "dua puluh": "20",
  zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5",
  six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
};

// Longest phrases first, so "dua belas" becomes 12 before "dua" becomes 2.
const NUMBER_PHRASES = Object.keys(NUMBER_WORDS).sort((a, b) => b.length - a.length);

// Dropped only from what the child said, never from an expected answer.
// Single letters are left out on purpose: "a" is an answer in Membaca.
const FILLER_WORDS = new Set(["eh", "em", "hmm", "ehm", "itu", "ya", "kak", "jawabannya", "adalah", "the", "it's", "is"]);

const toWords = (text: string): string[] => {
  let normalized = ` ${text.toLowerCase().replace(/[^\p{L}\p{N}' ]+/gu, " ").replace(/\s+/g, " ").trim()} `;
  for (const phrase of NUMBER_PHRASES) {
    normalized = normalized.replaceAll(` ${phrase} `, ` ${NUMBER_WORDS[phrase]} `);
  }
  return normalized.trim().split(" ").filter(Boolean);
};

export const normalizeAnswer = (text: string): string =>
  toWords(text)
    .filter((word) => !FILLER_WORDS.has(word))
    .join(" ");

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
export const isCorrectAnswer = (childSaid: string, answers: string[], otherAnswers: string[] = []): boolean => {
  const said = normalizeAnswer(childSaid);
  if (said === "") return false;
  const expected = answers.map((answer) => toWords(answer).join(" ")).filter(Boolean);

  const numericAnswers = expected.filter(isNumber);
  if (numericAnswers.length > 0) {
    const lastNumber = said.split(" ").filter(isNumber).at(-1);
    return lastNumber !== undefined && numericAnswers.includes(lastNumber);
  }

  if (!expected.some((answer) => containsWords(said, answer))) return false;
  const rivals = otherAnswers
    .map((answer) => toWords(answer).join(" "))
    .filter((rival) => rival !== "" && !expected.some((answer) => containsWords(answer, rival)));
  return !rivals.some((rival) => containsWords(said, rival));
};
