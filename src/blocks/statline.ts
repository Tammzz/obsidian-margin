import type { MarkdownPostProcessorContext } from "obsidian";
import type MarginPlugin from "../main";
import { humanAge } from "../util/markdown";

/* Vault/folder statistics for statline tokens. Scope is the folder
   containing the block ("" = whole vault); excluded folders are skipped. */
export async function computeStatTokens(plugin: MarginPlugin, scope: string) {
  const excluded = plugin.settings.excludeFolders.filter(Boolean);
  const all = plugin.app.vault.getMarkdownFiles()
    .filter((f) => !excluded.some((x) => f.path === x || f.path.startsWith(x + "/")));
  const files = scope ? all.filter((f) => f.path.startsWith(scope + "/")) : all;

  let tasks = 0;
  let latest = 0;
  for (const f of files) {
    latest = Math.max(latest, f.stat.mtime);
    try {
      const t = await plugin.app.vault.cachedRead(f);
      const m = t.match(/^\s*[-*]\s\[ \]\s+\S/gm);
      if (m) tasks += m.length;
    } catch (e) { /* unreadable file — skip */ }
  }

  const capFolder = plugin.settings.capturesFolder.replace(/\/+$/, "");
  let caps = 0;
  for (const f of all) {
    if (!f.path.startsWith(capFolder + "/")) continue;
    const fm = plugin.app.metadataCache.getFileCache(f)?.frontmatter || {};
    if (String(fm.status || "unprocessed") !== "processed") caps++;
  }

  return {
    "notes": files.length + " notes",
    "captures-open": String(caps),
    "tasks-open": String(tasks),
    "updated-age": humanAge(latest)
  } as Record<string, string>;
}

/** `statline` — a segmented status strip. */
export async function renderStatline(
  plugin: MarginPlugin,
  source: string,
  el: HTMLElement,
  ctx?: MarkdownPostProcessorContext
) {
  let text = source;
  if (text.includes("{")) {
    const p = ctx?.sourcePath || "";
    const scope = p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "";
    const tok = await computeStatTokens(plugin, scope);
    text = text.replace(/\{(notes|captures-open|tasks-open|updated-age)\}/g, (m, k) => tok[k] ?? m);
  }
  const line = el.createDiv({ cls: "mg-statline" });
  for (const raw of text.split("\n").map((l) => l.trim()).filter(Boolean)) {
    if (raw.includes("·")) {
      // "a · b · c" — one cell per segment, numbers emphasized
      for (const seg of raw.split("·").map((c) => c.trim()).filter(Boolean)) {
        const cell = line.createSpan();
        for (const part of seg.split(/(\d[\d,.%]*)/)) {
          if (!part) continue;
          if (/^\d/.test(part)) cell.createEl("b", { text: part });
          else cell.appendText(part);
        }
      }
      continue;
    }
    // legacy "key: value" rows
    const idx = raw.indexOf(":");
    const cell = line.createSpan();
    if (idx === -1) { cell.setText(raw); continue; }
    cell.appendText(raw.slice(0, idx).trim() + " ");
    cell.createEl("b", { text: raw.slice(idx + 1).trim() });
  }
}

/** `progress` — lines like "phase 3 | 7/12" render as segmented bars. */
export function renderProgress(source: string, el: HTMLElement) {
  for (const raw of source.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const m = raw.match(/^(.*?)\|?\s*(\d+)\s*\/\s*(\d+)\s*$/);
    if (!m) continue;
    const val = parseInt(m[2], 10), total = Math.max(1, parseInt(m[3], 10));
    const pct = Math.round((val / total) * 100);
    const row = el.createDiv({ cls: "mg-prog" });
    if (m[1].trim()) row.createSpan({ cls: "mg-lbl", text: m[1].replace(/\|$/, "").trim() });
    const cells = row.createSpan({ cls: "mg-cells" });
    const n = Math.min(24, total);
    const filled = Math.round((val / total) * n);
    for (let i = 0; i < n; i++) cells.createSpan({ cls: "mg-c" + (i < filled ? " mg-f" : "") });
    row.createSpan({ cls: "mg-pct", text: `${val}/${total} · ${pct}%` });
  }
}
