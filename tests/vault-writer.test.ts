import { describe, expect, it } from "vitest";
import { VaultWriter } from "../src/vault/vault-writer";
import { FakeVaultIO } from "./fake-vault-io";

describe("VaultWriter.createNote", () => {
  it("writes to folder/name.md and returns the path", async () => {
    const io = new FakeVaultIO({ folders: ["Captures"] });
    const path = await new VaultWriter(io).createNote("Captures", "note", "body");

    expect(path).toBe("Captures/note.md");
    expect(io.files.get("Captures/note.md")).toBe("body");
  });

  it("creates the folder when it does not exist", async () => {
    const io = new FakeVaultIO();
    await new VaultWriter(io).createNote("Captures", "note", "body");

    expect(io.folders.has("Captures")).toBe(true);
  });

  it("writes to the vault root when the folder is empty", async () => {
    const io = new FakeVaultIO();
    expect(await new VaultWriter(io).createNote("", "note", "body")).toBe("note.md");
  });

  it("tolerates slashes around the folder name", async () => {
    const io = new FakeVaultIO();
    expect(await new VaultWriter(io).createNote("/Captures/", "note", "body")).toBe(
      "Captures/note.md"
    );
  });
});

describe("VaultWriter collision safety", () => {
  it("never overwrites an existing note", async () => {
    const io = new FakeVaultIO({
      folders: ["Captures"],
      files: { "Captures/note.md": "ORIGINAL" }
    });

    const path = await new VaultWriter(io).createNote("Captures", "note", "NEW");

    expect(path).toBe("Captures/note 2.md");
    expect(io.files.get("Captures/note.md")).toBe("ORIGINAL");
    expect(io.files.get("Captures/note 2.md")).toBe("NEW");
  });

  it("keeps suffixing past repeated collisions", async () => {
    const io = new FakeVaultIO({
      folders: ["Captures"],
      files: { "Captures/note.md": "a", "Captures/note 2.md": "b", "Captures/note 3.md": "c" }
    });

    expect(await new VaultWriter(io).createNote("Captures", "note", "d")).toBe(
      "Captures/note 4.md"
    );
    expect(io.files.size).toBe(4);
  });

  it("gives up rather than looping forever", async () => {
    const files: Record<string, string> = { "Captures/note.md": "x" };
    for (let n = 2; n <= 200; n++) files[`Captures/note ${n}.md`] = "x";
    const io = new FakeVaultIO({ folders: ["Captures"], files });

    await expect(new VaultWriter(io).createNote("Captures", "note", "y")).rejects.toThrow(
      /free name/i
    );
  });
});

describe("VaultWriter failure handling", () => {
  it("surfaces a real create failure instead of renaming around it", async () => {
    const io = new FakeVaultIO({ folders: ["Captures"] });
    io.failCreateWith = new Error("EACCES: permission denied");

    await expect(new VaultWriter(io).createNote("Captures", "note", "body")).rejects.toThrow(
      /permission denied/
    );

    // One attempt, no rename loop, and nothing written.
    expect(io.attemptedPaths).toEqual(["Captures/note.md"]);
    expect(io.files.size).toBe(0);
  });

  it("leaves existing notes untouched when creation fails", async () => {
    const io = new FakeVaultIO({
      folders: ["Captures"],
      files: { "Captures/note.md": "ORIGINAL" }
    });
    io.failCreateWith = new Error("disk full");

    await expect(new VaultWriter(io).createNote("Captures", "note", "NEW")).rejects.toThrow(
      /disk full/
    );
    expect(io.files.get("Captures/note.md")).toBe("ORIGINAL");
  });
});
