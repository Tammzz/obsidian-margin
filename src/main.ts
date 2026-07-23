import { Notice, Plugin } from "obsidian";
import { CaptureModal } from "./capture/capture-modal";
import { quickDump } from "./capture/quick-dump";
import { ResolverProofModal } from "./dev/resolver-proof-modal";
import { buildSnapshot } from "./dev/vault-snapshot";
import { prepare } from "./matcher/prepare";
import { MarginSettings, parseSettings } from "./settings";
import { MarginSettingTab } from "./settings-tab";
import { ObsidianVaultIO } from "./vault/obsidian-vault-io";
import { VaultWriter } from "./vault/vault-writer";

/**
 * Margin routes a captured thought to the right note as it is written.
 *
 * This slice ships the capture path only: a command, a box, and a dump. The
 * matcher, the suggestion rail, and the routing verbs arrive in later slices.
 */
export default class MarginPlugin extends Plugin {
  settings: MarginSettings;
  private writer: VaultWriter;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.writer = new VaultWriter(new ObsidianVaultIO(this.app.vault));

    // No default hotkey: the user assigns their own, so Margin never fights an
    // existing keybinding.
    this.addCommand({
      id: "quick-capture",
      name: "Quick capture",
      callback: () => new CaptureModal(this.app, (text) => this.dump(text)).open()
    });

    // Tuning harness for the resolver proof (I-003). Removed in I-004 when the
    // live capture rail replaces it.
    this.addCommand({
      id: "resolver-proof",
      name: "Resolver proof (dev)",
      callback: () => {
        // Normalize the vault once per session, not once per keystroke.
        const started = performance.now();
        const snapshot = prepare(buildSnapshot(this.app));
        console.log(
          `Margin: prepared ${snapshot.notes.length} notes in ${(performance.now() - started).toFixed(0)} ms`
        );
        new ResolverProofModal(this.app, snapshot).open();
      }
    });

    this.addSettingTab(new MarginSettingTab(this.app, this));
  }

  /** Returns true only when the capture reached disk, so the box can close. */
  private async dump(text: string): Promise<boolean> {
    try {
      const path = await quickDump(text, {
        writer: this.writer,
        capturesFolder: this.settings.capturesFolder
      });
      if (path) new Notice(`Captured to ${path}`);
      return true;
    } catch (error) {
      console.error("Margin: quick dump failed", error);
      new Notice("Margin could not save that capture. Your text is still in the box.");
      return false;
    }
  }

  async loadSettings(): Promise<void> {
    this.settings = parseSettings(await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
