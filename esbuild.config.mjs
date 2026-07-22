import esbuild from "esbuild";

const production = process.argv[2] === "production";

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  outfile: "main.js",
  format: "cjs",
  target: "es2020",
  platform: "browser",
  logLevel: "info",
  sourcemap: production ? false : "inline",
  treeShaking: true,
  minify: production,
  // Supplied by Obsidian at runtime — never bundle these.
  external: ["obsidian", "electron", "@codemirror/*", "@lezer/*"]
});

if (production) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}
