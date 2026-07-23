/**
 * Text normalization for matching.
 *
 * Deliberately boring and deterministic: lowercase, strip punctuation, drop
 * stopwords. No stemming, no fuzzy distance, no learned weights — a suggestion
 * must be explainable from the text the user can see.
 */

/**
 * Words too common to be evidence of anything. Kept small on purpose: an
 * over-eager stoplist silently removes real signal (a note genuinely titled
 * "The Home" should still match).
 */
const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "can", "did", "do",
  "does", "for", "from", "had", "has", "have", "how", "i", "if", "in", "into",
  "is", "it", "its", "just", "me", "my", "no", "not", "of", "on", "or", "our",
  "out", "so", "some", "than", "that", "the", "their", "them", "then", "there",
  "these", "they", "this", "to", "up", "was", "we", "were", "what", "when",
  "which", "who", "will", "with", "would", "you", "your"
]);

/** Shortest run of characters that can count as a term. */
export const MIN_TERM_LENGTH = 2;

/**
 * Lowercase and reduce to letters, digits, and single spaces. Unicode letters
 * are preserved, so non-English vaults tokenize the same way.
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Normalized terms with stopwords and one-character noise removed. */
export function tokenize(text: string): string[] {
  const normalized = normalize(text);
  if (!normalized) return [];

  return normalized
    .split(" ")
    .filter((term) => term.length >= MIN_TERM_LENGTH && !STOPWORDS.has(term));
}

/** Unique terms, order preserved. */
export function uniqueTokens(text: string): string[] {
  return [...new Set(tokenize(text))];
}

/**
 * Wikilink targets written explicitly in the text, e.g. `[[Zettelkasten|zk]]`
 * yields `Zettelkasten`. An explicit link is the strongest possible statement
 * of intent, so it is read from the raw text before normalization.
 */
export function explicitLinkTargets(text: string): string[] {
  const targets: string[] = [];
  for (const match of text.matchAll(/\[\[([^\]]+)\]\]/g)) {
    const target = match[1].split("|")[0].split("#")[0].trim();
    if (target) targets.push(target);
  }
  return targets;
}

/**
 * Space-padded normalized text, so phrase lookups can test term boundaries with
 * a plain substring check.
 *
 * Built once per query rather than once per note: normalizing the capture text
 * inside the note loop is what made matching scale with vault size.
 */
export function haystackOf(text: string): string {
  return ` ${normalize(text)} `;
}

/**
 * Whether `phrase` occurs in a prepared haystack on term boundaries — so "note"
 * matches "a note here" but not "notebook".
 */
export function phraseIn(haystack: string, phrase: string): boolean {
  const needle = normalize(phrase);
  return needle.length > 0 && haystack.includes(` ${needle} `);
}

/** Convenience for callers that have no prepared haystack. */
export function containsPhrase(text: string, phrase: string): boolean {
  return phraseIn(haystackOf(text), phrase);
}
