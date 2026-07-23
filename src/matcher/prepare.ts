import { haystackOf, normalize, uniqueTokens } from "./normalize";
import { IndexedNote, IndexSnapshot, NoteProperties } from "./types";

/**
 * Note-side normalization, done once instead of once per keystroke.
 *
 * Titles, aliases, links, and light content all have to be normalized before
 * they can be compared. Doing that inside the match loop makes every keystroke
 * pay for the whole vault; doing it here makes matching a scan over strings
 * that are already in comparable form.
 *
 * `prepare` is pure, so the Matcher stays a pure module. I-004's incremental
 * index maintains this shape directly rather than rebuilding it.
 */

export interface PreparedName {
  /** Original text, for display in evidence labels. */
  display: string;
  normalized: string;
  terms: string[];
  longestTerm: number;
}

export interface PreparedNote {
  note: IndexedNote;
  title: PreparedName;
  aliases: PreparedName[];
  /** Title, aliases, and path — the names an explicit wikilink could target. */
  linkNames: Set<string>;
  /** Normalized outbound link targets, paired with their display text. */
  outboundLinks: { display: string; normalized: string }[];
  properties: { key: keyof NoteProperties; value: string; normalized: string }[];
  /** Space-padded normalized headings and tags. */
  contentHaystack: string;
}

export interface PreparedSnapshot {
  readonly prepared: true;
  notes: PreparedNote[];
}

function prepareName(display: string): PreparedName | null {
  const terms = uniqueTokens(display);
  if (!terms.length) return null;

  return {
    display,
    normalized: normalize(display),
    terms,
    longestTerm: Math.max(...terms.map((term) => term.length))
  };
}

function prepareNote(note: IndexedNote): PreparedNote | null {
  const title = prepareName(note.title);
  if (!title) return null;

  const aliases = (note.aliases ?? [])
    .map(prepareName)
    .filter((alias): alias is PreparedName => alias !== null);

  const linkNames = new Set([
    title.normalized,
    ...aliases.map((alias) => alias.normalized),
    normalize(note.path.replace(/\.md$/, ""))
  ]);

  const outboundLinks = (note.links ?? [])
    .map((display) => ({ display, normalized: normalize(display) }))
    .filter((link) => link.normalized.length > 0);

  const properties = (["type", "project", "area"] as const)
    .map((key) => ({ key, value: note.properties?.[key] ?? "" }))
    .filter((entry) => entry.value.trim().length > 0)
    .map((entry) => ({ ...entry, normalized: normalize(entry.value) }));

  return {
    note,
    title,
    aliases,
    linkNames,
    outboundLinks,
    properties,
    contentHaystack: note.contentTerms?.length ? haystackOf(note.contentTerms.join(" ")) : ""
  };
}

export function prepare(snapshot: IndexSnapshot): PreparedSnapshot {
  return {
    prepared: true,
    notes: snapshot
      .map(prepareNote)
      .filter((note): note is PreparedNote => note !== null)
  };
}

/** Accept either form at the Matcher boundary, so callers can opt into caching. */
export function asPrepared(snapshot: IndexSnapshot | PreparedSnapshot): PreparedSnapshot {
  return Array.isArray(snapshot) ? prepare(snapshot) : snapshot;
}
