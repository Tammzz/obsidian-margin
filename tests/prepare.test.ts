import { describe, expect, it } from "vitest";
import { match } from "../src/matcher/matcher";
import { prepare } from "../src/matcher/prepare";
import { VAULT } from "./matcher-fixtures";

describe("prepare", () => {
  it("does not change what the Matcher returns", () => {
    const queries = [
      "more on zettelkasten today",
      "margin needs a settings tab",
      "ship [[Margin Plugin]] this week",
      "productivity ideas",
      "how does the slip box work"
    ];

    for (const query of queries) {
      expect(match(query, prepare(VAULT))).toEqual(match(query, VAULT));
    }
  });

  it("drops notes whose title carries no usable terms", () => {
    const prepared = prepare([
      { path: "ok.md", title: "Zettelkasten" },
      { path: "empty.md", title: "   " },
      { path: "stopwords.md", title: "the and of" }
    ]);

    expect(prepared.notes.map((note) => note.note.path)).toEqual(["ok.md"]);
  });

  it("keeps display text intact for evidence labels", () => {
    const [note] = prepare([{ path: "a.md", title: "Zettelkasten", aliases: ["ZK Method"] }]).notes;

    expect(note.title.display).toBe("Zettelkasten");
    expect(note.aliases[0].display).toBe("ZK Method");
    expect(note.title.normalized).toBe("zettelkasten");
  });

  it("treats a prepared snapshot as already prepared", () => {
    const once = prepare(VAULT);
    expect(match("zettelkasten", once)).toEqual(match("zettelkasten", once));
  });
});
