import { TFolder, Vault } from "obsidian";
import { FileExistsError, VaultIO } from "./vault-writer";

/**
 * Obsidian-backed VaultIO. The only file in the write path that knows about
 * Obsidian, which is what keeps the Vault Writer's safety contract testable.
 */
export class ObsidianVaultIO implements VaultIO {
  constructor(private readonly vault: Vault) {}

  folderExists(path: string): boolean {
    return this.vault.getAbstractFileByPath(path) instanceof TFolder;
  }

  async createFolder(path: string): Promise<void> {
    try {
      await this.vault.createFolder(path);
    } catch (error) {
      // A concurrent create is fine; anything else is not.
      if (this.folderExists(path)) return;
      throw error;
    }
  }

  async create(path: string, contents: string): Promise<void> {
    // Cheap pre-check for the common case, then translate Obsidian's own
    // collision rejection — which is what actually closes the race.
    if (this.vault.getAbstractFileByPath(path)) throw new FileExistsError(path);

    try {
      await this.vault.create(path, contents);
    } catch (error) {
      if (/already exists/i.test(String((error as Error)?.message))) {
        throw new FileExistsError(path);
      }
      throw error;
    }
  }
}
