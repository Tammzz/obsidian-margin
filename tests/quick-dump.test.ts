import { describe, expect, it } from "vitest";
import { captureNoteContents, quickDump } from "../src/capture/quick-dump";
import { VaultWriter } from "../src/vault/vault-writer";
import { FakeVaultIO } from "./fake-vault-io";

const CAPTURED_AT = new Date("2026-07-23T23:12:05");
const dumpInto = (io: FakeVaultIO, text: string, folder = "Captures") =>
  quickDump(text, {
    writer: new VaultWriter(io),
    capturesFolder: folder,
    now: () => CAPTURED_AT
  });

describe("captureNoteContents", () => {
  it("records the capture date in frontmatter", () => {
    expect(captureNoteContents("a thought", CAPTURED_AT)).toContain("captured: 2026-07-23");
  });

  it("puts nothing but the user's text in the body", () => {
    const body = captureNoteContents("  a thought  ", CAPTURED_AT).split("---\n")[2];
    expect(body.trim()).toBe("a thought");
  });

  it("adds no pending, overdue, or processing marker", () => {
    const contents = captureNoteContents("a thought", CAPTURED_AT).toLowerCase();
    for (const marker of ["pending", "overdue", "status", "inbox", "unprocessed"]) {
      expect(contents).not.toContain(marker);
    }
  });

  it("preserves ordinary Markdown as written", () => {
    const markdown = "# Heading\n\n- [ ] a task\n- **bold** and [[a link]]";
    expect(captureNoteContents(markdown, CAPTURED_AT)).toContain(markdown);
  });
});

describe("quickDump", () => {
  it("saves to a timestamp-named note in the captures folder", async () => {
    const io = new FakeVaultIO();
    const path = await dumpInto(io, "a thought");

    expect(path).toBe("Captures/2026-07-23 231205.md");
    expect(io.files.get(path!)).toContain("a thought");
  });

  it("honours a configured captures folder", async () => {
    const io = new FakeVaultIO();
    expect(await dumpInto(io, "a thought", "Inbox/Quick")).toBe(
      "Inbox/Quick/2026-07-23 231205.md"
    );
  });

  it("does nothing when there is nothing to save", async () => {
    const io = new FakeVaultIO();

    expect(await dumpInto(io, "")).toBeNull();
    expect(await dumpInto(io, "   \n\t ")).toBeNull();
    expect(io.files.size).toBe(0);
  });

  it("never overwrites a capture taken in the same second", async () => {
    const io = new FakeVaultIO();

    const first = await dumpInto(io, "first");
    const second = await dumpInto(io, "second");

    expect(first).toBe("Captures/2026-07-23 231205.md");
    expect(second).toBe("Captures/2026-07-23 231205 2.md");
    expect(io.files.get(first!)).toContain("first");
    expect(io.files.get(second!)).toContain("second");
  });

  it("propagates a write failure so the capture box can keep the text", async () => {
    const io = new FakeVaultIO();
    io.failCreateWith = new Error("disk full");

    await expect(dumpInto(io, "a thought")).rejects.toThrow(/disk full/);
    expect(io.files.size).toBe(0);
  });
});
