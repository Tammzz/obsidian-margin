/**
 * The index representation the Matcher reasons over.
 *
 * This is a plain snapshot with no Obsidian types in it, which is what lets the
 * Matcher be a pure module. I-004 replaces the throwaway snapshot builder with
 * a real incremental index producing this same shape.
 */

/** Light classification Margin recognizes but never requires or validates. */
export interface NoteProperties {
  type?: string;
  project?: string;
  area?: string;
}

export interface IndexedNote {
  path: string;
  /** Display title — the basename, or a frontmatter title if the vault uses one. */
  title: string;
  aliases?: string[];
  /** Link targets written in this note, by title or path. */
  links?: string[];
  properties?: NoteProperties;
  /**
   * Light content evidence: headings and tags rather than full body text.
   * Cheap to gather, and it keeps a long note from outranking a precise one
   * simply by containing more words.
   */
  contentTerms?: string[];
}

export type IndexSnapshot = IndexedNote[];

export type EvidenceKind = "title" | "alias" | "link" | "property" | "content";

/** Why a candidate was suggested — shown to the user, not just logged. */
export interface Evidence {
  kind: EvidenceKind;
  /** Human-readable detail, e.g. `project: margin`. */
  detail: string;
  score: number;
}

/**
 * `strong` is reserved for evidence that states intent — an explicit link, or a
 * distinctive title matched whole. Everything else is `possible`, however high
 * it scores. A wrong "strong" is far more expensive than a missed one.
 */
export type MatchStrength = "strong" | "possible";

export interface Candidate {
  path: string;
  title: string;
  score: number;
  strength: MatchStrength;
  evidence: Evidence[];
}
