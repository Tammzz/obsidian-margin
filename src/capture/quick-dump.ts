import { VaultWriter } from "../vault/vault-writer";
import { captureBaseName, capturedDate } from "./naming";

/**
 * Quick Dump — the inviolable "save now, process later" fallback.
 *
 * This path deliberately touches nothing but the Vault Writer. It reads no
 * index, resolves no matches, and consults no cache, so it keeps working while
 * the vault index is unavailable or rebuilding.
 *
 * A dumped capture is an ordinary note. It carries no pending state, no overdue
 * label, and no processing obligation — only the text and the date it arrived.
 */

export interface QuickDumpOptions {
  writer: VaultWriter;
  capturesFolder: string;
  /** Injectable clock, so naming and the `captured` date are testable. */
  now?: () => Date;
}

/** Frontmatter carrying the capture date, then the user's text and nothing else. */
export function captureNoteContents(text: string, now: Date): string {
  return `---\ncaptured: ${capturedDate(now)}\n---\n\n${text.trim()}\n`;
}

/**
 * Save `text` as a new note in the captures folder.
 *
 * Returns the path written, or `null` when there was nothing to save. Never
 * overwrites: name collisions are resolved by the Vault Writer.
 */
export async function quickDump(text: string, options: QuickDumpOptions): Promise<string | null> {
  if (!text.trim()) return null;

  const now = (options.now ?? (() => new Date()))();
  return options.writer.createNote(
    options.capturesFolder,
    captureBaseName(now),
    captureNoteContents(text, now)
  );
}
