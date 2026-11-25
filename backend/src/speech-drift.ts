/** Spoken numbers 0-20 in Indonesian and English, folded to digits so "tujuh", "seven" and "7" count as the same word. */
const ID_UNITS = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
const EN_NUMBERS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty",
];

/** Highest numbers first, so "dua belas" is read before "dua". */
const NUMBER_PHRASES: [RegExp, string][] = Array.from({ length: 21 }, (_, n) => 20 - n).flatMap((n) => {
  const id = n < ID_UNITS.length ? ID_UNITS[n] : n === 20 ? "dua puluh" : `${ID_UNITS[n - 10]} belas`;
  return [id, EN_NUMBERS[n]].map((word): [RegExp, string] => [new RegExp(`(?<![\\p{L}\\p{N}])${word}(?![\\p{L}\\p{N}])`, "gu"), String(n)]);
});

/** Lowercase words without punctuation, numbers as digits. */
const words = (text: string): string[] => {
  let normalized = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  for (const [pattern, digits] of NUMBER_PHRASES) normalized = normalized.replace(pattern, digits);
  return normalized.length > 0 ? normalized.split(" ") : [];
};

/**
 * How many words in `transcript` are not in any of the `allowed` lines.
 * While the transcript may still be growing (`final` false) a last word without a space or punctuation after it
 * is skipped, because it may be cut in half.
 */
export const extraWordCount = (allowed: string[], transcript: string, final: boolean): number => {
  const known = new Set(allowed.flatMap(words));
  const spoken = words(transcript);
  if (!final && !/[^\p{L}\p{N}]$/u.test(transcript)) spoken.pop();
  return spoken.filter((word) => !known.has(word)).length;
};
