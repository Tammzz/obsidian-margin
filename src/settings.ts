import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type MarginPlugin from "./main";
import type { MarginSettings } from "./types";
import { DEFAULT_SCHEMES, TOKENS } from "./schemes";

export const DEFAULT_SETTINGS: MarginSettings = {
  activeScheme: "fluoro-moss",
  excludeFolders: ["09-archive"],
  capturesFolder: "00-inbox/captures",
  projectsFolder: "01-projects",
  schemes: DEFAULT_SCHEMES
};

export class MarginSettingTab extends PluginSettingTab {
  plugin: MarginPlugin;
  editMode: "dark" | "light";

  constructor(app: App, plugin: MarginPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.editMode = "dark";
  }

  display() {
    const { containerEl } = this;
    const s = this.plugin.settings;
    containerEl.empty();

    new Setting(containerEl).setName("Colour scheme").setHeading();

    new Setting(containerEl)
      .setName("Active scheme")
      .setDesc("Switch the palette used by the Margin theme.")
      .addDropdown((dd) => {
        for (const [id, sc] of Object.entries(s.schemes)) dd.addOption(id, sc.name);
        dd.setValue(s.activeScheme).onChange(async (v) => {
          s.activeScheme = v;
          await this.plugin.saveSettings();
          this.plugin.applyScheme();
          this.display();
        });
      });

    const active = s.schemes[s.activeScheme];

    new Setting(containerEl)
      .setName("Scheme name")
      .addText((t) =>
        t.setValue(active.name).onChange(async (v) => {
          active.name = v || "Unnamed";
          await this.plugin.saveSettings();
        })
      )
      .addButton((b) =>
        b.setButtonText("Duplicate").onClick(async () => {
          let n = 2;
          let id: string;
          do { id = `${s.activeScheme}-copy${n === 2 ? "" : "-" + n}`; n++; } while (s.schemes[id]);
          s.schemes[id] = JSON.parse(JSON.stringify(active));
          s.schemes[id].name = active.name + " copy";
          s.activeScheme = id;
          await this.plugin.saveSettings();
          this.plugin.applyScheme();
          this.display();
          new Notice("Scheme duplicated — edit it below.");
        })
      )
      .addButton((b) =>
        b.setButtonText("Delete").setWarning().onClick(async () => {
          if (Object.keys(s.schemes).length <= 1) {
            new Notice("Cannot delete the last scheme.");
            return;
          }
          delete s.schemes[s.activeScheme];
          s.activeScheme = Object.keys(s.schemes)[0];
          await this.plugin.saveSettings();
          this.plugin.applyScheme();
          this.display();
        })
      );

    new Setting(containerEl)
      .setName("Edit tokens for")
      .setDesc("Each scheme carries a dark and a light set. Auto mode follows Obsidian's base colour scheme setting.")
      .addDropdown((dd) =>
        dd.addOption("dark", "Dark mode").addOption("light", "Light mode")
          .setValue(this.editMode)
          .onChange((v) => { this.editMode = v as "dark" | "light"; this.display(); })
      );

    const vars = active[this.editMode];
    for (const token of TOKENS) {
      new Setting(containerEl)
        .setName(token)
        .setClass("mg-token-setting")
        .addColorPicker((cp) =>
          cp.setValue(String(vars[token])).onChange(async (v) => {
            vars[token] = v;
            await this.plugin.saveSettings();
            this.plugin.applyScheme();
          })
        );
    }
    new Setting(containerEl)
      .setName("hl (selection/highlight, any CSS colour)")
      .addText((t) =>
        t.setValue(String(vars["hl"])).onChange(async (v) => {
          vars["hl"] = v;
          await this.plugin.saveSettings();
          this.plugin.applyScheme();
        })
      );
    new Setting(containerEl)
      .setName("texture-opacity")
      .setDesc("Strength of the paper grain (0 disables it).")
      .addSlider((sl) =>
        sl.setLimits(0, 0.2, 0.01).setValue(Number(vars["texture-opacity"]))
          .setDynamicTooltip()
          .onChange(async (v) => {
            vars["texture-opacity"] = v;
            await this.plugin.saveSettings();
            this.plugin.applyScheme();
          })
      );

    new Setting(containerEl).setName("To-do sidebar").setHeading();

    new Setting(containerEl)
      .setName("Excluded folders")
      .setDesc("Comma-separated folder paths to skip when collecting tasks.")
      .addText((t) =>
        t.setValue(s.excludeFolders.join(", ")).onChange(async (v) => {
          s.excludeFolders = v.split(",").map((x) => x.trim()).filter(Boolean);
          await this.plugin.saveSettings();
          this.plugin.refreshTodoViews();
        })
      );

    new Setting(containerEl).setName("Inbox grid").setHeading();

    new Setting(containerEl)
      .setName("Captures folder")
      .setDesc("Folder scanned by the `inbox-grid` block and used by New capture.")
      .addText((t) =>
        t.setValue(s.capturesFolder).onChange(async (v) => {
          s.capturesFolder = v.trim() || "00-inbox/captures";
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl).setName("Project cards").setHeading();

    new Setting(containerEl)
      .setName("Projects folder")
      .setDesc("Folder scanned by the `project-cards` block for <slug>/index.md portals.")
      .addText((t) =>
        t.setValue(s.projectsFolder).onChange(async (v) => {
          s.projectsFolder = v.trim() || "01-projects";
          await this.plugin.saveSettings();
        })
      );
  }
}
