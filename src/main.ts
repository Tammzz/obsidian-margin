import { Notice, Plugin, TFile, debounce } from "obsidian";
import type { MarginSettings } from "./types";
import { DEFAULT_SETTINGS, MarginSettingTab } from "./settings";
import { DEFAULT_SCHEMES, schemeCss } from "./schemes";
import { TODO_VIEW_TYPE, TodoView } from "./views/todo";
import { renderProgress, renderStatline } from "./blocks/statline";
import { renderInboxGrid, renderProjectCards } from "./blocks/cards";

export default class MarginPlugin extends Plugin {
  settings: MarginSettings;
  styleEl: HTMLStyleElement;
  statusEl: HTMLElement;
  lastFile: TFile | null = null;

  async onload() {
    await this.loadSettings();

    this.styleEl = document.createElement("style");
    this.styleEl.id = "mg-scheme-style";
    document.head.appendChild(this.styleEl);
    this.applyScheme();

    this.addSettingTab(new MarginSettingTab(this.app, this));

    this.registerView(TODO_VIEW_TYPE, (leaf) => new TodoView(leaf, this));
    this.addRibbonIcon("check-square", "Open to-do sidebar", () => this.activateTodoView());

    this.addCommand({
      id: "open-todo-view",
      name: "Open to-do sidebar",
      callback: () => this.activateTodoView()
    });
    this.addCommand({
      id: "cycle-scheme",
      name: "Cycle colour scheme",
      callback: async () => {
        const ids = Object.keys(this.settings.schemes);
        const i = ids.indexOf(this.settings.activeScheme);
        this.settings.activeScheme = ids[(i + 1) % ids.length];
        await this.saveSettings();
        this.applyScheme();
        new Notice("Scheme: " + this.settings.schemes[this.settings.activeScheme].name);
      }
    });

    // micro-UI code blocks
    this.registerMarkdownCodeBlockProcessor("statline", (source, el, ctx) =>
      renderStatline(this, source, el, ctx));
    this.registerMarkdownCodeBlockProcessor("progress", (source, el) =>
      renderProgress(source, el));
    this.registerMarkdownCodeBlockProcessor("inbox-grid", (_source, el) =>
      renderInboxGrid(this, el));
    this.registerMarkdownCodeBlockProcessor("project-cards", (_source, el) =>
      renderProjectCards(this, el));

    this.addCommand({
      id: "new-capture",
      name: "New capture",
      callback: () => this.newCapture()
    });
    this.addRibbonIcon("plus-square", "New capture", () => this.newCapture());

    // status bar: leaf + vault ok + note count
    this.statusEl = this.addStatusBarItem();
    this.statusEl.addClass("mg-vault-ok");
    this.updateStatusBar();

    // keep the to-do view fresh
    const refresh = debounce(() => { this.refreshTodoViews(); this.updateStatusBar(); }, 2000, true);
    this.registerEvent(this.app.vault.on("modify", refresh));
    this.registerEvent(this.app.vault.on("delete", refresh));
    this.registerEvent(this.app.vault.on("rename", refresh));

    // track the last opened note so the "this note" filter has a target
    this.registerEvent(this.app.workspace.on("file-open", (f) => {
      if (f) {
        this.lastFile = f;
        for (const leaf of this.app.workspace.getLeavesOfType(TODO_VIEW_TYPE)) {
          if (leaf.view instanceof TodoView && leaf.view.filter === "note") leaf.view.refresh();
        }
      }
    }));
    this.lastFile = this.app.workspace.getActiveFile();

    this.app.workspace.onLayoutReady(() => {
      if (this.app.workspace.getLeavesOfType(TODO_VIEW_TYPE).length === 0) {
        this.activateTodoView(false);
      }
    });
  }

  onunload() {
    this.styleEl?.remove();
  }

  async activateTodoView(reveal = true) {
    const existing = this.app.workspace.getLeavesOfType(TODO_VIEW_TYPE);
    let leaf = existing[0];
    if (!leaf) {
      leaf = this.app.workspace.getRightLeaf(false);
      if (!leaf) return;
      await leaf.setViewState({ type: TODO_VIEW_TYPE, active: false });
    }
    if (reveal) this.app.workspace.revealLeaf(leaf);
  }

  async newCapture() {
    const folder = this.settings.capturesFolder.replace(/\/+$/, "");
    if (!this.app.vault.getAbstractFileByPath(folder)) {
      await this.app.vault.createFolder(folder).catch(() => {});
    }
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const stamp = `${date}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const path = `${folder}/${stamp}-capture.md`;
    const lines = [
      "---",
      "type: capture",
      "kind: note",
      `captured: ${date}`,
      "status: unprocessed",
      "topics: []",
      "---",
      "",
      "# Untitled",
      "",
      ""
    ];
    const file = await this.app.vault.create(path, lines.join("\n"));
    const leaf = this.app.workspace.getLeaf(false);
    await leaf.openFile(file);
    // select the placeholder title so typing replaces it
    const editor = (leaf.view as any)?.editor;
    if (editor) {
      const h1 = lines.indexOf("# Untitled");
      editor.setSelection({ line: h1, ch: 2 }, { line: h1, ch: lines[h1].length });
      editor.focus();
    }
  }

  updateStatusBar() {
    if (!this.statusEl) return;
    const n = this.app.vault.getMarkdownFiles().length;
    this.statusEl.setText(`✿ vault ok · ${n} notes`);
  }

  refreshTodoViews() {
    for (const leaf of this.app.workspace.getLeavesOfType(TODO_VIEW_TYPE)) {
      if (leaf.view instanceof TodoView) leaf.view.refresh();
    }
  }

  applyScheme() {
    const scheme = this.settings.schemes[this.settings.activeScheme];
    if (!scheme) return;
    this.styleEl.textContent = schemeCss(scheme);
  }

  async loadSettings() {
    const data = await this.loadData();
    this.settings = Object.assign({}, JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), data);
    // ensure defaults exist if user data predates them
    if (!this.settings.schemes || Object.keys(this.settings.schemes).length === 0) {
      this.settings.schemes = JSON.parse(JSON.stringify(DEFAULT_SCHEMES));
    }
    if (!this.settings.schemes[this.settings.activeScheme]) {
      this.settings.activeScheme = Object.keys(this.settings.schemes)[0];
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
