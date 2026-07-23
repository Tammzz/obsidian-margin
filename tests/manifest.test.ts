import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const readJson = (relativePath: string): Record<string, unknown> =>
  JSON.parse(readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8"));

const manifest = readJson("../manifest.json");
const pkg = readJson("../package.json");

describe("plugin manifest", () => {
  it("keeps the identity Obsidian and existing installs rely on", () => {
    expect(manifest.id).toBe("margin");
    expect(manifest.name).toBe("Margin");
  });

  it("stays mobile-compatible", () => {
    expect(manifest.isDesktopOnly).toBe(false);
  });

  it("describes only features that exist", () => {
    const retired = ["navigator", "to-do", "todo", "scheme", "colour scheme", "color scheme"];
    const description = String(manifest.description).toLowerCase();
    for (const claim of retired) {
      expect(description).not.toContain(claim);
    }
  });

  it("versions in lockstep with package.json", () => {
    expect(manifest.version).toBe(pkg.version);
  });
});
