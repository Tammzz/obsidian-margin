import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, parseSettings } from "../src/settings";

describe("parseSettings", () => {
  it("keeps a stored captures folder", () => {
    expect(parseSettings({ capturesFolder: "00-inbox/captures" })).toEqual({
      capturesFolder: "00-inbox/captures"
    });
  });

  it("falls back to the default when absent, blank, or the wrong type", () => {
    for (const stored of [{}, null, undefined, { capturesFolder: "   " }, { capturesFolder: 7 }]) {
      expect(parseSettings(stored)).toEqual(DEFAULT_SETTINGS);
    }
  });

  it("drops keys Margin does not own, so retired data cannot persist", () => {
    const withPrototypeLeftovers = {
      capturesFolder: "Captures",
      activeScheme: "aluminum-midnight",
      excludeFolders: ["09-archive"],
      schemes: { "fluoro-moss": { name: "Fluoro Moss" } }
    };

    expect(Object.keys(parseSettings(withPrototypeLeftovers))).toEqual(["capturesFolder"]);
  });
});
