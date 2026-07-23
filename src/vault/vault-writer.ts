import { candidateName } from "../capture/naming";

/**
 * Raised when a path is already taken. The Vault Writer treats this as "pick
 * another name", and every other error as a genuine failure to surface.
 */
export class FileExistsError extends Error {
  constructor(public readonly path: string) {
    super(`File already exists: ${path}`);
    this.name = "FileExistsError";
  }
}

/**
 * The narrow slice of vault behaviour the writer needs. Keeping it an interface
 * — rather than reaching for Obsidian's `Vault` directly — is what lets the
 * safety contract be tested without an Obsidian runtime.
 */
export interface VaultIO {
  folderExists(path: string): boolean;
  createFolder(path: string): Promise<void>;
  /** Must reject with FileExistsError rather than overwriting. */
  create(path: string, contents: string): Promise<void>;
}

/** Guard against an unbounded rename loop if something is wrong with the IO layer. */
const MAX_NAME_ATTEMPTS = 100;

const joinPath = (folder: string, name: string): string => {
  const trimmed = folder.replace(/^\/+|\/+$/g, "");
  return trimmed ? `${trimmed}/${name}.md` : `${name}.md`;
};

/**
 * The single boundary through which Margin creates notes.
 *
 * Every write goes through here so the "never overwrite" guarantee lives in one
 * place. Later slices add append and delete paths alongside this one.
 */
export class VaultWriter {
  constructor(private readonly io: VaultIO) {}

  /**
   * Create a note, never overwriting an existing one. Returns the path actually
   * written, which may carry a disambiguating suffix.
   *
   * Collision is handled by attempting the create and reacting to rejection,
   * not by checking first and then writing — a check-then-write would leave a
   * window in which another process could claim the name.
   */
  async createNote(folder: string, baseName: string, contents: string): Promise<string> {
    await this.ensureFolder(folder);

    for (let attempt = 0; attempt < MAX_NAME_ATTEMPTS; attempt++) {
      const path = joinPath(folder, candidateName(baseName, attempt));
      try {
        await this.io.create(path, contents);
        return path;
      } catch (error) {
        if (error instanceof FileExistsError) continue;
        throw error;
      }
    }

    throw new Error(
      `Could not find a free name for "${baseName}" in "${folder}" after ${MAX_NAME_ATTEMPTS} attempts.`
    );
  }

  private async ensureFolder(folder: string): Promise<void> {
    const trimmed = folder.replace(/^\/+|\/+$/g, "");
    if (!trimmed || this.io.folderExists(trimmed)) return;
    await this.io.createFolder(trimmed);
  }
}
