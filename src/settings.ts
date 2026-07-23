/**
 * Settings shape and parsing. Deliberately free of Obsidian imports so the
 * parse rules are testable; the settings tab lives in `settings-tab.ts`.
 */

export interface MarginSettings {
  /** Folder new captures are written to. Created on first dump if missing. */
  capturesFolder: string;
}

export const DEFAULT_SETTINGS: MarginSettings = {
  capturesFolder: "Captures"
};

/**
 * Build settings from whatever is on disk, keeping only keys Margin knows.
 *
 * Reading key-by-key rather than spreading the stored object means data left by
 * an older version — or by a feature that has since been retired — is dropped
 * on the next save instead of being carried forward forever.
 */
export function parseSettings(stored: unknown): MarginSettings {
  const data = (stored ?? {}) as Record<string, unknown>;
  const capturesFolder =
    typeof data.capturesFolder === "string" && data.capturesFolder.trim()
      ? data.capturesFolder.trim()
      : DEFAULT_SETTINGS.capturesFolder;

  return { capturesFolder };
}
