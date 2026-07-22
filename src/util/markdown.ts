/* Text helpers shared by the to-do view, the micro-UI blocks and the
   navigator. Ported unchanged from the pre-TypeScript main.js. */

/** Markdown → plain text: strips frontmatter, headings, images and links. */
export function stripMd(text: string): string {
  return text
    .replace(/^---\n[\s\S]*?\n---\n?/, "")                // frontmatter
    .replace(/^#+\s+/gm, "")                              // headings
    .replace(/!\[\[[^\]]*\]\]|!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/\[\[([^\]|]*)(\|([^\]]*))?\]\]/g, (_m, a, _b, c) => c || a)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#-]{1,3}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** The note's first ATX heading, or null. */
export function firstHeading(text: string): string | null {
  const m = text.replace(/^---\n[\s\S]*?\n---\n?/, "").match(/^#+\s+(.+)$/m);
  return m ? m[1].replace(/[*_`]/g, "").trim() : null;
}

/** First paragraph of the "## Overview" section, else the note body. */
export function overviewSnippet(text: string): string {
  const body = text.replace(/^---\n[\s\S]*?\n---\n?/, "");
  const m = body.match(/^##\s+Overview\s*\n+([\s\S]*?)(?=\n#{1,6}\s|$)/mi);
  return stripMd(m ? m[1] : body).slice(0, 220);
}

/** Humanized age from a timestamp. */
export function humanAge(ms: number): string {
  if (!ms) return "—";
  const d = Math.floor((Date.now() - ms) / 86400000);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 14) return d + " days ago";
  if (d < 60) return Math.round(d / 7) + " weeks ago";
  return new Date(ms).toISOString().slice(0, 10);
}

/** Parse an optional trailing #p1/#p2 priority from task text. */
export function taskPriority(text: string): { pri: string | null; text: string } {
  const m = text.match(/#p([12])\b/);
  return m
    ? { pri: "p" + m[1], text: text.replace(/\s*#p[12]\b/, "").trim() }
    : { pri: null, text };
}

/** Badge class per capture kind, used by the inbox grid. */
export const KIND_CLASS: Record<string, string> = {
  idea: "",
  bookmark: "mg-b2",
  link: "mg-b2"
};
