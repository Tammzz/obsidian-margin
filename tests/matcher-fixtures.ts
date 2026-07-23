import { IndexSnapshot } from "../src/matcher/types";

/** A small vault with one note per evidence kind, plus deliberate traps. */
export const VAULT: IndexSnapshot = [
  {
    path: "notes/Zettelkasten.md",
    title: "Zettelkasten",
    contentTerms: ["Slip box", "Linking"]
  },
  {
    path: "projects/Margin Plugin.md",
    title: "Margin Plugin",
    aliases: ["Margin"],
    links: ["Obsidian API"],
    properties: { type: "project", project: "margin" }
  },
  {
    path: "reference/Obsidian API.md",
    title: "Obsidian API",
    contentTerms: ["Vault", "MetadataCache"]
  },
  {
    path: "review/Weekly Review.md",
    title: "Weekly Review",
    properties: { area: "productivity" }
  },
  // The trap: a title so generic it would claim every capture if a single
  // short word were allowed to count as decisive evidence.
  {
    path: "Notes.md",
    title: "Notes"
  }
];

export const titles = (candidates: { title: string }[]): string[] =>
  candidates.map((candidate) => candidate.title);

export const byTitle = <T extends { title: string }>(candidates: T[], title: string) =>
  candidates.find((candidate) => candidate.title === title);

/** A synthetic vault for the latency guard. */
export function largeVault(size: number): IndexSnapshot {
  return Array.from({ length: size }, (_, index) => ({
    path: `notes/note-${index}.md`,
    title: `Project Note ${index}`,
    aliases: [`PN${index}`],
    links: [`Project Note ${(index + 1) % size}`],
    properties: { type: "topic", project: `project-${index % 40}` },
    contentTerms: ["Background", "Open questions", `topic-${index % 90}`]
  }));
}
