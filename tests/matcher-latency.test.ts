import { describe, expect, it } from "vitest";
import { match } from "../src/matcher/matcher";
import { prepare } from "../src/matcher/prepare";
import { largeVault } from "./matcher-fixtures";

/**
 * A smoke guard, not a benchmark. Suggestions must stay instant as a vault
 * grows, so this fails if matching degrades by an order of magnitude — the
 * ceiling is loose enough that a busy CI runner will not flake.
 *
 * Measured against a prepared snapshot, which is how the plugin uses the
 * Matcher: the vault is normalized when the capture box opens, not on every
 * keystroke. Observed locally at this size: ~10 ms per query.
 */
const LARGE_VAULT_SIZE = 5000;
const CEILING_MS = 50;

describe("matcher latency", () => {
  const vault = prepare(largeVault(LARGE_VAULT_SIZE));

  const timeOf = (query: string): number => {
    match(query, vault); // warm up, so the first run does not pay for JIT
    const started = performance.now();
    match(query, vault);
    return performance.now() - started;
  };

  it.each([
    ["a typical capture", "follow up on project note 4213 before the review"],
    ["a single partial word", "proj"],
    ["a term matching everything", "background"],
    ["an explicit link", "see [[Project Note 900]] for context"]
  ])("stays responsive on %s", (_label, query) => {
    expect(timeOf(query)).toBeLessThan(CEILING_MS);
  });

  it("still returns a bounded result set on a vault-wide term", () => {
    expect(match("background", vault, { limit: 8 }).length).toBeLessThanOrEqual(8);
  });
});
