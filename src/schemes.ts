import type { Scheme, TokenSet } from "./types";

/** Tokens every scheme must define, per mode. Drives the settings editor. */
export const TOKENS = [
  "bg", "bg2", "panel", "ink", "ink2", "ink3", "line", "line2",
  "accent", "accent2", "ok", "warn", "err", "chip", "chip-ink", "sel"
];

export const DEFAULT_SCHEMES: Record<string, Scheme> = {
  "fluoro-moss": {
    name: "Fluoro Moss",
    dark: {
      "bg": "#0b0d0c", "bg2": "#0f1210", "panel": "#131614", "ink": "#dde1d8",
      "ink2": "#909a8c", "ink3": "#5a645a", "line": "#262c27", "line2": "#1b201c",
      "accent": "#ffeb0d", "accent2": "#ffa51f", "ok": "#ffa51f", "warn": "#ff7a1f",
      "err": "#ff4d3d", "chip": "#1c1f16", "chip-ink": "#e5da6a", "sel": "#20231b",
      "hl": "rgba(255,235,13,0.11)", "texture-opacity": 0.05
    },
    light: {
      "bg": "#f1f0ea", "bg2": "#e9e8e0", "panel": "#e4e3da", "ink": "#292c27",
      "ink2": "#5f665c", "ink3": "#8d948a", "line": "#d1d0c2", "line2": "#dddcd0",
      "accent": "#8a7a00", "accent2": "#b06d00", "ok": "#a86a00", "warn": "#b5541c",
      "err": "#c23a2a", "chip": "#e9e4bc", "chip-ink": "#6a5e0a", "sel": "#e5e3d2",
      "hl": "rgba(138,122,0,0.10)", "texture-opacity": 0.07
    }
  },
  "aluminum-midnight": {
    name: "Aluminum Midnight",
    dark: {
      "bg": "#151928", "bg2": "#191d30", "panel": "#1c2136", "ink": "#d9deea",
      "ink2": "#8e99b2", "ink3": "#5a6379", "line": "#2a3049", "line2": "#20263c",
      "accent": "#ffeb0d", "accent2": "#91a9c3", "ok": "#ffb52e", "warn": "#fe540e",
      "err": "#fe540e", "chip": "#222842", "chip-ink": "#b9c6da", "sel": "#232946",
      "hl": "rgba(145,169,195,0.12)", "texture-opacity": 0.04
    },
    light: {
      "bg": "#e9edf2", "bg2": "#dfe5ed", "panel": "#dae1ea", "ink": "#2c3242",
      "ink2": "#5c6577", "ink3": "#8b93a5", "line": "#c4cddb", "line2": "#d3dae5",
      "accent": "#33456e", "accent2": "#d87a00", "ok": "#a87200", "warn": "#c24a08",
      "err": "#c22a1a", "chip": "#d6deea", "chip-ink": "#33456e", "sel": "#d8dfe9",
      "hl": "rgba(51,69,110,0.09)", "texture-opacity": 0.05
    }
  },
  "ember-anton": {
    name: "Ember Anton",
    dark: {
      "bg": "#14100d", "bg2": "#191410", "panel": "#1e1813", "ink": "#e8ddd2",
      "ink2": "#a1948a", "ink3": "#6a5f56", "line": "#302822", "line2": "#251f1a",
      "accent": "#ff5a1f", "accent2": "#ffd60a", "ok": "#ffb428", "warn": "#ffd60a",
      "err": "#ff4d3d", "chip": "#26201a", "chip-ink": "#ffb38a", "sel": "#282019",
      "hl": "rgba(255,90,31,0.13)", "texture-opacity": 0.06
    },
    light: {
      "bg": "#f2ece2", "bg2": "#eae3d6", "panel": "#e5ded0", "ink": "#2b241e",
      "ink2": "#6a6055", "ink3": "#988d81", "line": "#d5cab8", "line2": "#e0d7c7",
      "accent": "#d84a10", "accent2": "#9a7c00", "ok": "#a86a00", "warn": "#b5541c",
      "err": "#c23a10", "chip": "#e6dcc8", "chip-ink": "#8a3d14", "sel": "#e4dbca",
      "hl": "rgba(216,74,16,0.09)", "texture-opacity": 0.08
    }
  }
};

/** Render a scheme as the --mg-* custom properties the theme consumes. */
export function schemeCss(scheme: Scheme): string {
  const block = (mode: string, vars: TokenSet) => {
    const lines = Object.entries(vars)
      .map(([k, v]) => `  --mg-${k}: ${v};`)
      .join("\n");
    return `.theme-${mode} {\n${lines}\n}`;
  };
  return block("dark", scheme.dark) + "\n" + block("light", scheme.light);
}
