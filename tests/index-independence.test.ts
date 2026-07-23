import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Quick Dump is the fallback that must survive an unavailable or rebuilding
 * index. The guarantee is structural, not defensive: nothing in the dump path
 * consults the index, so there is no index state that can break it.
 *
 * The rest of this suite is the practical proof — it exercises the whole dump
 * path with no Obsidian runtime present at all. These tests pin the boundary so
 * a later slice cannot quietly reintroduce a dependency.
 */

const DUMP_PATH_MODULES = [
  "../src/capture/quick-dump.ts",
  "../src/capture/naming.ts",
  "../src/vault/vault-writer.ts"
];

const sourceOf = (relativePath: string): string =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

describe("Quick Dump index independence", () => {
  it.each(DUMP_PATH_MODULES)("%s imports nothing from Obsidian", (module) => {
    expect(sourceOf(module)).not.toMatch(/from ["']obsidian["']/);
  });

  it.each(DUMP_PATH_MODULES)("%s never touches the metadata cache", (module) => {
    expect(sourceOf(module)).not.toMatch(/metadataCache|getFileCache|resolvedLinks/);
  });
});
