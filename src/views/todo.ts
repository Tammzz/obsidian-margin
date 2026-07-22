import { ItemView, WorkspaceLeaf } from "obsidian";
import type MarginPlugin from "../main";
import type { TodoItem } from "../types";
import { taskPriority } from "../util/markdown";

export const TODO_VIEW_TYPE = "mg-todo-view";

/* The desk sticky-note: every open `- [ ]` in the vault, grouped by
   top-level folder. Deliberately separate from the navigator. */
export class TodoView extends ItemView {
  plugin: MarginPlugin;
  filter: string;

  constructor(leaf: WorkspaceLeaf, plugin: MarginPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.filter = "all";
  }

  getViewType() { return TODO_VIEW_TYPE; }
  getDisplayText() { return "To-do"; }
  getIcon() { return "check-square"; }

  async onOpen() {
    this.contentEl.addClass("mg-todo");
    await this.refresh();
  }

  async collect() {
    const excluded = this.plugin.settings.excludeFolders.filter(Boolean);
    const files = this.app.vault.getMarkdownFiles()
      .filter((f) => !excluded.some((x) => f.path === x || f.path.startsWith(x + "/")));
    const groups = new Map<string, TodoItem[]>(); // top-level segment -> items
    let open = 0, done = 0;
    for (const file of files) {
      let text: string;
      try { text = await this.app.vault.cachedRead(file); } catch (e) { continue; }
      const lines = text.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(/^\s*[-*]\s\[([ xX])\]\s+(.+)/);
        if (!m) continue;
        if (m[1] === " ") {
          open++;
          const seg = file.path.includes("/") ? file.path.split("/")[0] : "(root)";
          if (!groups.has(seg)) groups.set(seg, []);
          const { pri, text: t } = taskPriority(m[2]);
          groups.get(seg).push({ file, line: i, text: t, pri });
        } else {
          done++;
        }
      }
    }
    return { groups, open, done };
  }

  async refresh() {
    const { groups, open, done } = await this.collect();
    const el = this.contentEl;
    el.empty();

    // summary
    const sum = el.createDiv({ cls: "mg-todo-sum" });
    const row = sum.createDiv({ cls: "mg-row" });
    row.createSpan({ cls: "mg-big", text: String(open) });
    row.createSpan({ cls: "mg-lbl", text: "open" });
    row.createSpan({ cls: "mg-big mg-ok", text: String(done) });
    row.createSpan({ cls: "mg-lbl", text: "done" });
    const total = open + done;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const prog = sum.createDiv({ cls: "mg-prog" });
    const cells = prog.createSpan({ cls: "mg-cells" });
    for (let i = 0; i < 10; i++) {
      cells.createSpan({ cls: "mg-c" + (i < Math.round(pct / 10) ? " mg-f" : "") });
    }
    prog.createSpan({ cls: "mg-pct", text: pct + "%" });

    // filters: all / p1 / this note
    const fb = el.createDiv({ cls: "mg-filters" });
    for (const f of ["all", "p1", "note"]) {
      const sp = fb.createSpan({ text: f === "note" ? "this note" : f });
      if (this.filter === f) sp.addClass("mg-on");
      sp.addEventListener("click", () => {
        this.filter = f;
        this.refresh();
      });
    }

    // apply filter
    const activePath = this.plugin.lastFile?.path;
    const keep = (item: TodoItem) => {
      if (this.filter === "p1") return item.pri === "p1";
      if (this.filter === "note") return activePath && item.file.path === activePath;
      return true;
    };
    let shown = 0;

    // groups
    const sorted = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    for (const [seg, items] of sorted) {
      const visible = items.filter(keep);
      if (!visible.length) continue;
      shown += visible.length;
      const g = el.createDiv({ cls: "mg-grp" });
      const gh = g.createDiv({ cls: "mg-gh" });
      gh.createSpan({ text: seg });
      gh.createSpan({ cls: "mg-cnt", text: String(visible.length) });
      for (const item of visible) {
        const r = g.createDiv({ cls: "mg-item" });
        const cb = r.createEl("input", { type: "checkbox" });
        cb.addEventListener("change", async () => {
          await this.toggle(item);
        });
        const body = r.createDiv({ cls: "mg-item-body" });
        body.createDiv({ cls: "mg-item-text", text: item.text });
        const sub = body.createDiv({ cls: "mg-item-sub" });
        if (item.pri) sub.createSpan({ cls: "mg-pri-" + item.pri, text: item.pri.toUpperCase() + " · " });
        sub.appendText(item.file.basename);
        body.addEventListener("click", () => {
          this.app.workspace.openLinkText(item.file.path, "", false, {
            eState: { line: item.line }
          });
        });
      }
    }
    if (shown === 0) {
      el.createDiv({
        cls: "mg-empty",
        text: this.filter === "all"
          ? "Nothing open. The margin is clear."
          : "Nothing matches this filter."
      });
    }
  }

  async toggle(item: TodoItem) {
    const text = await this.app.vault.read(item.file);
    const lines = text.split("\n");
    if (item.line < lines.length) {
      const replaced = lines[item.line].replace(/\[ \]/, "[x]");
      if (replaced !== lines[item.line]) {
        lines[item.line] = replaced;
        await this.app.vault.modify(item.file, lines.join("\n"));
      }
    }
    await this.refresh();
  }
}
