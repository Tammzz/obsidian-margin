import { describe, expect, it } from "vitest";
import { match } from "../src/matcher/matcher";
import { byTitle, titles, VAULT } from "./matcher-fixtures";

describe("evidence correctness", () => {
  it("labels a title match", () => {
    const result = byTitle(match("more on zettelkasten today", VAULT), "Zettelkasten");
    expect(result?.evidence.some((e) => e.kind === "title")).toBe(true);
  });

  it("labels an alias match", () => {
    const result = byTitle(match("margin needs a settings tab", VAULT), "Margin Plugin");
    expect(result?.evidence.some((e) => e.kind === "alias" && e.detail === "alias: Margin")).toBe(
      true
    );
  });

  it("labels an explicit wikilink", () => {
    const result = byTitle(match("ship [[Margin Plugin]] this week", VAULT), "Margin Plugin");
    expect(result?.evidence.some((e) => e.kind === "link")).toBe(true);
  });

  it("labels an outbound link to something the capture names", () => {
    const result = byTitle(match("the obsidian api has no rate limits", VAULT), "Margin Plugin");
    expect(result?.evidence).toContainEqual(
      expect.objectContaining({ kind: "link", detail: "links to Obsidian API" })
    );
  });

  it("labels type, project, and area properties", () => {
    const project = byTitle(match("margin plugin work", VAULT), "Margin Plugin");
    expect(project?.evidence.some((e) => e.detail === "project: margin")).toBe(true);

    const area = byTitle(match("productivity ideas", VAULT), "Weekly Review");
    expect(area?.evidence).toContainEqual(
      expect.objectContaining({ kind: "property", detail: "area: productivity" })
    );
  });

  it("labels light content evidence from headings and tags", () => {
    const result = byTitle(match("how does the slip box work", VAULT), "Zettelkasten");
    expect(result?.evidence.some((e) => e.kind === "content")).toBe(true);
  });

  it("orders evidence by weight so the strongest reason reads first", () => {
    const result = byTitle(match("margin plugin project", VAULT), "Margin Plugin");
    const scores = result!.evidence.map((e) => e.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });
});

describe("false strong match prevention", () => {
  it("never calls a short generic title a strong match", () => {
    const result = byTitle(match("i should write some notes", VAULT), "Notes");
    expect(result).toBeDefined();
    expect(result?.strength).toBe("possible");
  });

  it("treats a distinctive one-word title as strong", () => {
    expect(byTitle(match("more on zettelkasten", VAULT), "Zettelkasten")?.strength).toBe("strong");
  });

  it("treats a multi-word title matched whole as strong", () => {
    expect(byTitle(match("weekly review time", VAULT), "Weekly Review")?.strength).toBe("strong");
  });

  it("does not promote a partially typed title to strong", () => {
    expect(byTitle(match("zettel", VAULT), "Zettelkasten")?.strength).toBe("possible");
  });

  it("does not promote accumulated content hits to strong", () => {
    const result = byTitle(match("vault metadatacache notes", VAULT), "Obsidian API");
    expect(result?.evidence.every((e) => e.kind === "content")).toBe(true);
    expect(result?.strength).toBe("possible");
  });
});

describe("ranking stability on partial input", () => {
  it("keeps the intended destination top as the user types", () => {
    for (const typed of ["zett", "zettel", "zettelkas", "zettelkasten"]) {
      expect(match(typed, VAULT)[0]?.title).toBe("Zettelkasten");
    }
  });

  it("is deterministic across repeated calls", () => {
    const once = titles(match("margin plugin notes", VAULT));
    const twice = titles(match("margin plugin notes", VAULT));
    expect(once).toEqual(twice);
  });

  it("breaks ties predictably rather than by index order", () => {
    const shuffled = [...VAULT].reverse();
    expect(titles(match("margin plugin notes", VAULT))).toEqual(
      titles(match("margin plugin notes", shuffled))
    );
  });
});

describe("match boundaries", () => {
  it("returns nothing for empty or stopword-only input", () => {
    expect(match("", VAULT)).toEqual([]);
    expect(match("   ", VAULT)).toEqual([]);
    expect(match("the and of it", VAULT)).toEqual([]);
  });

  it("returns nothing when the capture relates to nothing in the vault", () => {
    expect(match("sourdough hydration percentages", VAULT)).toEqual([]);
  });

  it("does not match a term that is merely a substring of a word", () => {
    // "note" must not match "Notes" as a phrase; only whole-term matches count.
    const result = byTitle(match("notebook shopping", VAULT), "Notes");
    expect(result).toBeUndefined();
  });

  it("honours the result limit", () => {
    expect(match("project note margin obsidian review notes", VAULT, { limit: 2 })).toHaveLength(2);
  });
});
