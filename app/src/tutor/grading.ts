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

const FILLER_WORDS = new Set(["eh", "em", "hmm", "ehm", "itu", "ya", "kak", "jawabannya", "adalah", "the", "a", "it's", "is"]);

export const normalizeAnswer = (text: string): string => {
  let normalized = ` ${text.toLowerCase().replace(/[^\p{L}\p{N}' ]+/gu, " ").replace(/\s+/g, " ").trim()} `;
  for (const phrase of NUMBER_PHRASES) {
    normalized = normalized.replaceAll(` ${phrase} `, ` ${NUMBER_WORDS[phrase]} `);
  }
  return normalized
    .trim()
    .split(" ")
    .filter((word) => word && !FILLER_WORDS.has(word))
    .join(" ");
};

/**
 * The app, not the LLM, decides whether an answer is right.
 * A child often wraps the answer in other words ("tiga apel!"), so an
 * expected answer counts when it appears as whole words in what was said.
 */
export const isCorrectAnswer = (childSaid: string, answers: string[]): boolean => {
  const said = ` ${normalizeAnswer(childSaid)} `;
  if (said.trim() === "") return false;
  return answers.some((answer) => {
    const expected = normalizeAnswer(answer);
    return expected !== "" && said.includes(` ${expected} `);
  });
};
