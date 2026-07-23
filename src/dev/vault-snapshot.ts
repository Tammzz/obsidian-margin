import { App, TFile } from "obsidian";
import { IndexedNote, IndexSnapshot } from "../matcher/types";

/**
 * Throwaway snapshot builder for the resolver proof (I-003).
 *
 * Reads only Obsidian's metadata cache — no file contents — so building a
 * snapshot of a large vault stays cheap. I-004 replaces this wholesale with an
 * incremental Vault Index that emits the same shape; nothing else should come
 * to depend on it.
 */

const asStringArray = (value: unknown): string[] => {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return [];
};

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const isExcluded = (path: string, excluded: string[]): boolean =>
  excluded.some((folder) => folder && (path === folder || path.startsWith(`${folder}/`)));

function toIndexedNote(app: App, file: TFile): IndexedNote {
  const cache = app.metadataCache.getFileCache(file);
  const frontmatter = cache?.frontmatter ?? {};

  return {
    path: file.path,
    title: file.basename,
    aliases: [...asStringArray(frontmatter.aliases), ...asStringArray(frontmatter.alias)],
    links: (cache?.links ?? []).map((link) => link.link),
    properties: {
      type: asString(frontmatter.type),
      project: asString(frontmatter.project),
      area: asString(frontmatter.area)
    },
    // Headings and tags only — light evidence, so a long note cannot outrank a
    // precise one simply by containing more words.
    contentTerms: [
      ...(cache?.headings ?? []).map((heading) => heading.heading),
      ...(cache?.tags ?? []).map((tag) => tag.tag),
      ...asStringArray(frontmatter.tags)
    ]
  };
}

export function buildSnapshot(app: App, excludedFolders: string[] = []): IndexSnapshot {
  return app.vault
    .getMarkdownFiles()
    .filter((file) => !isExcluded(file.path, excludedFolders))
    .map((file) => toIndexedNote(app, file));
}
