import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["main.js", "node_modules/**"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Build tooling runs in Node, not in Obsidian's browser context.
    files: ["*.mjs", "*.js"],
    languageOptions: {
      globals: { process: "readonly", console: "readonly" }
    }
  },
  {
    files: ["**/*.ts"],
    rules: {
      // Obsidian's API surfaces plenty of unavoidable `any`; flag it, don't fail on it.
      "@typescript-eslint/no-explicit-any": "warn"
    }
  }
);
