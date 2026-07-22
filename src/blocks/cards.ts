import type { TFile } from "obsidian";
import type MarginPlugin from "../main";
import { KIND_CLASS, firstHeading, overviewSnippet, stripMd } from "../util/markdown";

interface CaptureItem {
  file: TFile;
  kind: string;
  captured: string;
  topics: string[];
  title: string;
  snippet: string;
  words: number;
}

/** `inbox-grid` — unprocessed captures as a uniform bracket-card grid. */
export async function renderInboxGrid(plugin: MarginPlugin, el: HTMLElement) {
  const app = plugin.app;
  const folder = plugin.settings.capturesFolder.replace(/\/+$/, "");
  const files = app.vault.getMarkdownFiles()
    .filter((f) => f.path.startsWith(folder + "/"));

  const items: CaptureItem[] = [];
  for (const file of files) {
    const fm = app.metadataCache.getFileCache(file)?.frontmatter || {};
    if (String(fm.status || "unprocessed") === "processed") continue;
    const text = await app.vault.cachedRead(file);
    const body = stripMd(text);
    items.push({
      file,
      kind: String(fm.kind || fm.type || "note"),
      captured: fm.captured ? String(fm.captured) : "",
      topics: Array.isArray(fm.topics) ? fm.topics : [],
      title: fm.title || firstHeading(text) || file.basename,
      snippet: body.slice(0, 220),
      words: body ? body.split(/\s+/).length : 0
    });
  }
  items.sort((a, b) => (b.captured || "").localeCompare(a.captured || ""));

  el.empty();
  const wrap = el.createDiv({ cls: "mg-ig" });

  // statline
  const stat = wrap.createDiv({ cls: "mg-statline mg-ig-stat" });
  const cell = (k: string, v: string) => {
    const s = stat.createSpan();
    s.appendText(k + " ");
    s.createEl("b", { text: v });
  };
  cell("unprocessed", String(items.length));
  if (items.length) {
    cell("oldest", items[items.length - 1].captured || "—");
    cell("last capture", items[0].captured || "—");
  }
  const btn = stat.createSpan({ cls: "mg-ig-newcell" });
  const nb = btn.createEl("button", { cls: "mg-ig-newbtn" });
  nb.setText("＋ new capture");
  nb.addEventListener("click", () => plugin.newCapture());

  // grid
  const grid = wrap.createDiv({ cls: "mg-ig-grid" });
  for (const it of items) {
    const card = grid.createDiv({ cls: "mg-ig-card" });
    const head = card.createDiv({ cls: "mg-ig-head" });
    head.createSpan({
      cls: "mg-ig-badge " + (KIND_CLASS[it.kind] ?? "mg-b3"),
      text: it.kind
    });
    head.createSpan({ cls: "mg-ig-dt", text: (it.captured || "").slice(5) });
    card.createDiv({ cls: "mg-ig-title", text: it.title });
    card.createDiv({ cls: "mg-ig-snip", text: it.snippet });
    card.createDiv({
      cls: "mg-ig-foot",
      text: (it.topics.length ? it.topics.length + " topics · " : "") + it.words + " words"
    });
    card.addEventListener("click", () => {
      app.workspace.openLinkText(it.file.path, "", false);
    });
  }
  const tile = grid.createDiv({ cls: "mg-ig-card mg-ig-new" });
  tile.createSpan({ cls: "mg-ig-plus", text: "＋" });
  tile.createSpan({ cls: "mg-ig-newlbl", text: "new capture" });
  tile.addEventListener("click", () => plugin.newCapture());

  if (!items.length) {
    wrap.createDiv({ cls: "mg-ig-empty", text: "Inbox zero. Capture anything with ＋." });
  }
}

/* `project-cards` — 01-projects/<slug>/index.md portals with
   frontmatter type: project, as bracket cards. */
export async function renderProjectCards(plugin: MarginPlugin, el: HTMLElement) {
  const app = plugin.app;
  const folder = plugin.settings.projectsFolder.replace(/\/+$/, "");
  const indexes = app.vault.getMarkdownFiles().filter((f) => {
    if (!f.path.startsWith(folder + "/")) return false;
    const parts = f.path.split("/");
    return parts.length === 3 && parts[2] === "index.md";
  });

  const items = [];
  for (const file of indexes) {
    const fm = app.metadataCache.getFileCache(file)?.frontmatter || {};
    if (String(fm.type || "") !== "project") continue;
    const text = await app.vault.cachedRead(file);
    const projPath = file.path.slice(0, file.path.lastIndexOf("/"));
    let tasks = 0;
    for (const pf of app.vault.getMarkdownFiles()) {
      if (!pf.path.startsWith(projPath + "/")) continue;
      try {
        const t = await app.vault.cachedRead(pf);
        const m = t.match(/^\s*[-*]\s\[ \]\s+\S/gm);
        if (m) tasks += m.length;
      } catch (e) { /* skip */ }
    }
    items.push({
      file,
      title: firstHeading(text) || file.parent.name,
      snippet: overviewSnippet(text),
      topics: Array.isArray(fm.topics) ? fm.topics : [],
      updated: fm.updated ? String(fm.updated) : "",
      tasks
    });
  }
  items.sort((a, b) => (b.updated || "").localeCompare(a.updated || ""));

  el.empty();
  const grid = el.createDiv({ cls: "mg-ig-grid mg-pc-grid" });
  for (const it of items) {
    const card = grid.createDiv({ cls: "mg-ig-card" });
    const head = card.createDiv({ cls: "mg-ig-head" });
    head.createSpan({ cls: "mg-ig-badge", text: "project" });
    head.createSpan({ cls: "mg-ig-dt", text: it.updated.slice(5) || "—" });
    card.createDiv({ cls: "mg-ig-title", text: it.title });
    card.createDiv({ cls: "mg-ig-snip", text: it.snippet });
    const foot: string[] = [];
    if (it.tasks) foot.push(it.tasks + " open task" + (it.tasks === 1 ? "" : "s"));
    if (it.topics.length) foot.push(it.topics.slice(0, 3).join(" · "));
    card.createDiv({ cls: "mg-ig-foot", text: foot.join(" · ") || "—" });
    card.addEventListener("click", () => {
      app.workspace.openLinkText(it.file.path, "", false);
    });
  }
  if (!items.length) {
    el.createDiv({ cls: "mg-ig-empty", text: "No project portals found in " + folder + "/." });
  }
}
