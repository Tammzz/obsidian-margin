import { App, normalizePath, PluginSettingTab, Setting } from "obsidian";
import type MarginPlugin from "./main";
import { DEFAULT_SETTINGS } from "./settings";

export class MarginSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: MarginPlugin
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Captures folder")
      .setDesc("Where Quick Dump saves new notes. Created automatically if it does not exist.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.capturesFolder)
          .setValue(this.plugin.settings.capturesFolder)
          .onChange(async (value) => {
            // normalizePath flattens backslashes and stray slashes, so the
            // dump path downstream can stay Obsidian-free.
            const trimmed = value.trim();
            this.plugin.settings.capturesFolder = trimmed
              ? normalizePath(trimmed)
              : DEFAULT_SETTINGS.capturesFolder;
            await this.plugin.saveSettings();
          })
      );
  }
}
