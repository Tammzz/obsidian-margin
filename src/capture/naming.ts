/**
 * Capture note naming.
 *
 * Names are timestamp-based so a dump is predictable and sorts chronologically,
 * and they avoid every character Obsidian forbids in a file name
 * (`* " \ / < > : | ?`) — note the absence of colons in the time.
 *
 * Nothing here reads the vault index. Quick Dump must work while the index is
 * unavailable or rebuilding, so the whole dump path stays index-free.
 */

const pad = (value: number, width = 2): string => String(value).padStart(width, "0");

/**
 * Base file name (no extension) for a capture taken at `now`, in local time:
 * `2026-07-23 2312 05`-style, rendered as `2026-07-23 231205`.
 */
export function captureBaseName(now: Date): string {
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${date} ${time}`;
}

/** Local calendar date for the `captured` property: `2026-07-23`. */
export function capturedDate(now: Date): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * The nth candidate name for a base. The first attempt is the bare base; later
 * attempts add a numeric suffix, matching how Obsidian itself disambiguates.
 */
export function candidateName(base: string, attempt: number): string {
  return attempt === 0 ? base : `${base} ${attempt + 1}`;
}
