import { FileExistsError, VaultIO } from "../src/vault/vault-writer";

/**
 * In-memory VaultIO that behaves like Obsidian's: creating over an existing
 * path rejects rather than overwriting.
 */
export class FakeVaultIO implements VaultIO {
  readonly files = new Map<string, string>();
  readonly folders = new Set<string>();
  readonly attemptedPaths: string[] = [];

  /** When set, every create fails with this error instead of succeeding. */
  failCreateWith?: Error;

  constructor(seed: { files?: Record<string, string>; folders?: string[] } = {}) {
    for (const [path, contents] of Object.entries(seed.files ?? {})) {
      this.files.set(path, contents);
    }
    for (const folder of seed.folders ?? []) this.folders.add(folder);
  }

  folderExists(path: string): boolean {
    return this.folders.has(path);
  }

  async createFolder(path: string): Promise<void> {
    this.folders.add(path);
  }

  async create(path: string, contents: string): Promise<void> {
    this.attemptedPaths.push(path);
    if (this.failCreateWith) throw this.failCreateWith;
    if (this.files.has(path)) throw new FileExistsError(path);
    this.files.set(path, contents);
  }
}
