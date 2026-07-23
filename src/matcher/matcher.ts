import { explicitLinkTargets, haystackOf, normalize, uniqueTokens } from "./normalize";
import { asPrepared, PreparedName, PreparedNote, PreparedSnapshot } from "./prepare";
import { Candidate, Evidence, IndexSnapshot, MatchStrength } from "./types";

/**
 * The Matcher — pure ranking of destinations from an index snapshot.
 *
 * No file access, no UI, no mutation. Every weight is exposed so ranking can be
 * tuned against a real vault without touching the algorithm.
 *
 * Both sides of the comparison are normalized exactly once: the capture text
 * per query, the vault via `prepare`. Nothing inside the note loop re-derives
 * either, which is what keeps matching flat as a vault grows.
 */

export interface MatcherWeights {
  /** An explicit [[wikilink]] in the capture — the clearest statement of intent. */
  explicitLink: number;
  /** The whole title appears in the capture, on term boundaries. */
  titlePhrase: number;
  /** Scaled by how much of the title the capture covers. */
  titleTokens: number;
  /** Aliases are real names, but slightly weaker signals than the title. */
  aliasFactor: number;
  /** The note links to something the capture names. */
  outboundLink: number;
  /** A `type`/`project`/`area` value appears in the capture. */
  property: number;
  /** Per distinct capture term found in headings or tags. */
  contentTerm: number;
  /** Ceiling on content evidence, so many weak hits cannot outweigh a name. */
  contentCap: number;
  /** Candidates below this are not worth showing. */
  minScore: number;
  /**
   * A one-word title must be at least this long to count as a strong match.
   * Guards against a note called "Notes" claiming every capture.
   */
  strongSingleTokenLength: number;
  limit: number;
}

export const DEFAULT_WEIGHTS: MatcherWeights = {
  explicitLink: 12,
  titlePhrase: 6,
  titleTokens: 6,
  aliasFactor: 0.9,
  outboundLink: 2,
  property: 4,
  contentTerm: 0.5,
  contentCap: 3,
  minScore: 1,
  strongSingleTokenLength: 8,
  limit: 8
};

/**
 * Everything derived from the capture text, computed once and reused for every
 * note.
 */
interface Query {
  /** Space-padded normalized capture text, for phrase lookups. */
  haystack: string;
  terms: string[];
  linkTargets: string[];
}

/** Exact term match is worth double a prefix match. */
const EXACT = 2;
const PREFIX = 1;
/** Below this length a prefix is too ambiguous to be worth scoring. */
const MIN_PREFIX_LENGTH = 3;

interface NameMatch {
  /** Share of the name the capture covers, 0–1. */
  coverage: number;
  phrase: boolean;
  /** Every term of the name was matched exactly, not by prefix. */
  exactWhole: boolean;
}

function bestTermMatch(nameTerm: string, inputTerms: string[]): number {
  let best = 0;
  for (const term of inputTerms) {
    if (term === nameTerm) return EXACT;
    if (term.length >= MIN_PREFIX_LENGTH && nameTerm.startsWith(term)) best = PREFIX;
  }
  return best;
}

/**
 * Score a prepared title or alias against the capture.
 *
 * Coverage is proportional, so matching one term of a five-term title scores
 * far below matching all five — a long title should not win on a single word.
 */
function matchName(name: PreparedName, query: Query): NameMatch | null {
  let quality = 0;
  let exactCount = 0;

  for (const term of name.terms) {
    const termQuality = bestTermMatch(term, query.terms);
    quality += termQuality;
    if (termQuality === EXACT) exactCount++;
  }

  // If no term matched, no phrase can match either — skip the substring scan.
  if (!quality) return null;

  return {
    coverage: quality / (EXACT * name.terms.length),
    phrase: query.haystack.includes(` ${name.normalized} `),
    exactWhole: exactCount === name.terms.length
  };
}

function nameScore(match: NameMatch, weights: MatcherWeights): number {
  return match.coverage * weights.titleTokens + (match.phrase ? weights.titlePhrase : 0);
}

/**
 * Whether a name match is decisive enough to call strong.
 *
 * A multi-term name matched whole is a deliberate reference. A single term is
 * only decisive when it is long enough to be distinctive on its own.
 */
function isDecisive(name: PreparedName, match: NameMatch, weights: MatcherWeights): boolean {
  if (!match.phrase && !match.exactWhole) return false;
  return name.terms.length >= 2 || name.longestTerm >= weights.strongSingleTokenLength;
}

function scoreNote(
  prepared: PreparedNote,
  query: Query,
  weights: MatcherWeights
): Candidate | null {
  const evidence: Evidence[] = [];
  let decisive = false;

  const titleMatch = matchName(prepared.title, query);
  if (titleMatch) {
    evidence.push({
      kind: "title",
      detail: `title: ${prepared.title.display}`,
      score: nameScore(titleMatch, weights)
    });
    decisive ||= isDecisive(prepared.title, titleMatch, weights);
  }

  for (const alias of prepared.aliases) {
    const aliasMatch = matchName(alias, query);
    if (!aliasMatch) continue;

    evidence.push({
      kind: "alias",
      detail: `alias: ${alias.display}`,
      score: nameScore(aliasMatch, weights) * weights.aliasFactor
    });
    decisive ||= isDecisive(alias, aliasMatch, weights);
  }

  // Only worth resolving names when the capture actually contains a wikilink.
  const explicit =
    query.linkTargets.length > 0 &&
    query.linkTargets.some((target) => prepared.linkNames.has(normalize(target)));
  if (explicit) {
    evidence.push({
      kind: "link",
      detail: `linked as [[${prepared.title.display}]]`,
      score: weights.explicitLink
    });
  }

  const outbound = prepared.outboundLinks.find((link) =>
    query.haystack.includes(` ${link.normalized} `)
  );
  if (outbound) {
    evidence.push({
      kind: "link",
      detail: `links to ${outbound.display}`,
      score: weights.outboundLink
    });
  }

  for (const property of prepared.properties) {
    if (query.haystack.includes(` ${property.normalized} `)) {
      evidence.push({
        kind: "property",
        detail: `${property.key}: ${property.value}`,
        score: weights.property
      });
    }
  }

  if (prepared.contentHaystack) {
    const hits = query.terms.filter((term) => prepared.contentHaystack.includes(` ${term} `));
    if (hits.length) {
      evidence.push({
        kind: "content",
        detail: `mentions ${hits.slice(0, 3).join(", ")}`,
        score: Math.min(hits.length * weights.contentTerm, weights.contentCap)
      });
    }
  }

  if (!evidence.length) return null;

  const score = evidence.reduce((total, item) => total + item.score, 0);
  if (score < weights.minScore) return null;

  const strength: MatchStrength = explicit || decisive ? "strong" : "possible";
  return {
    path: prepared.note.path,
    title: prepared.title.display,
    score,
    strength,
    evidence: evidence.sort((a, b) => b.score - a.score)
  };
}

/**
 * Rank destinations for `input`.
 *
 * Accepts a raw snapshot for convenience, or a `prepare`d one to avoid
 * re-normalizing the vault on every keystroke.
 *
 * Ties break on title length then path, so ranking is fully deterministic —
 * the same capture against the same vault always produces the same order, and
 * results do not reshuffle as the user keeps typing.
 */
export function match(
  input: string,
  snapshot: IndexSnapshot | PreparedSnapshot,
  overrides: Partial<MatcherWeights> = {}
): Candidate[] {
  const weights = { ...DEFAULT_WEIGHTS, ...overrides };
  const query: Query = {
    haystack: haystackOf(input),
    terms: uniqueTokens(input),
    linkTargets: explicitLinkTargets(input)
  };

  if (!query.terms.length && !query.linkTargets.length) return [];

  const candidates: Candidate[] = [];
  for (const prepared of asPrepared(snapshot).notes) {
    const candidate = scoreNote(prepared, query, weights);
    if (candidate) candidates.push(candidate);
  }

  candidates.sort(
    (a, b) => b.score - a.score || a.title.length - b.title.length || a.path.localeCompare(b.path)
  );

  return candidates.slice(0, weights.limit);
}
