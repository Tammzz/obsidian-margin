import type { TFile } from "obsidian";

/** One half of a colour scheme: every token, for one light/dark mode. */
export type TokenSet = Record<string, string | number>;

export interface Scheme {
  name: string;
  dark: TokenSet;
  light: TokenSet;
}

export interface MarginSettings {
  activeScheme: string;
  excludeFolders: string[];
  capturesFolder: string;
  projectsFolder: string;
  schemes: Record<string, Scheme>;
}

/** An open `- [ ]` found in a note, for the to-do sidebar. */
export interface TodoItem {
  file: TFile;
  line: number;
  text: string;
  pri: string | null;
}
