import { describe, expect, it } from "vitest";
import { candidateName, captureBaseName, capturedDate } from "../src/capture/naming";

// Local time on purpose — a capture is named for the moment the user took it.
const at = (iso: string): Date => new Date(iso);

describe("captureBaseName", () => {
  it("is date then time, sortable and predictable", () => {
    expect(captureBaseName(at("2026-07-23T23:12:05"))).toBe("2026-07-23 231205");
  });

  it("zero-pads every component", () => {
    expect(captureBaseName(at("2026-01-05T04:03:09"))).toBe("2026-01-05 040309");
  });

  it("contains no character Obsidian forbids in a file name", () => {
    const forbidden = /[*"\\/<>:|?]/;
    expect(captureBaseName(at("2026-12-31T00:00:00"))).not.toMatch(forbidden);
  });
});

describe("capturedDate", () => {
  it("is the local calendar date", () => {
    expect(capturedDate(at("2026-07-23T23:12:05"))).toBe("2026-07-23");
  });
});

describe("candidateName", () => {
  it("uses the bare base for the first attempt", () => {
    expect(candidateName("2026-07-23 231205", 0)).toBe("2026-07-23 231205");
  });

  it("suffixes later attempts from 2 upward", () => {
    expect(candidateName("note", 1)).toBe("note 2");
    expect(candidateName("note", 2)).toBe("note 3");
  });
});
