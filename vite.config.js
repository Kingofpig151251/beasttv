import { defineConfig } from "vite";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

const STATIC_FILES = [
  "sw.js",
  "manifest.json",
  "favicon.ico",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
];
const STATIC_DIRS = ["art", "sfx"];

/**
 * spike 插件（最終版）
 *
 * 驗證三件事：
 * 1. app.js 冇 type="module" → Vite 唔處理，要用 transformIndexHtml 改寫 src
 * 2. sw.js SHELL 寫死 /app.js、/styles.css → 打包後檔名帶 hash，要動態注入
 * 3. PWA 靜態資源要原樣複製，唔 hash
 */
function beastSpikePlugin() {
  let outDir = resolve(root, "dist");

  return {
    name: "beasttv-spike",
    apply: "build",
    configResolved(config) {
      outDir = resolve(root, config.build.outDir);
    },

    // HTML：喺 closeBundle 直接改寫 dist 嘅 HTML（此時 assets 一定已寫入）
    closeBundle() {
      mkdirSync(outDir, { recursive: true });

      for (const f of STATIC_FILES) {
        const src = resolve(root, f);
        if (existsSync(src)) cpSync(src, resolve(outDir, f));
      }
      for (const d of STATIC_DIRS) {
        const src = resolve(root, d);
        if (existsSync(src)) cpSync(src, resolve(outDir, d), { recursive: true });
      }

      // 掃 dist/assets 拿實際 hash 檔名，改寫 sw.js 的 SHELL
      const assetsDir = resolve(outDir, "assets");
      const swPath = resolve(outDir, "sw.js");
      if (!existsSync(assetsDir) || !existsSync(swPath)) {
        console.warn("[spike] WARNING: assets 或 sw.js 缺失，SHELL 未改寫");
        return;
      }
      const files = readdirSync(assetsDir);
      const app = files.find((n) => /^app-.*\.js$/.test(n));
      const css = files.find((n) => /^styles-.*\.css$/.test(n));
      if (!app || !css) {
        console.warn(`[spike] WARNING: 找不到 hash 檔名 (app=${app}, css=${css})`);
        return;
      }
      let sw = readFileSync(swPath, "utf8");
      sw = sw.replace(/"\/styles\.css"/, `"/assets/${css}"`);
      sw = sw.replace(/"\/app\.js"/, `"/assets/${app}"`);
      writeFileSync(swPath, sw, "utf8");
      console.log(`[spike] sw.js SHELL 已改寫 → /assets/${css}, /assets/${app}`);

      // 改寫 dist 內的 HTML：/app.js → hash 檔名
      for (const name of ["index.html", "edit.html", "credits.html"]) {
        const p = resolve(outDir, name);
        if (!existsSync(p)) continue;
        let h = readFileSync(p, "utf8");
        const before = h;
        h = h.replace(/(<script\s+src=)"\/app\.js"/g, `$1"/assets/${app}"`);
        if (h !== before) {
          writeFileSync(p, h, "utf8");
          console.log(`[spike] ${name} script src 已改寫 → /assets/${app}`);
        }
      }
    },
  };
}

export default defineConfig({
  root,
  base: "/",
  publicDir: false,
  plugins: [beastSpikePlugin()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      input: {
        main: resolve(root, "index.html"),
        edit: resolve(root, "edit.html"),
        credits: resolve(root, "credits.html"),
        app: resolve(root, "app.js"),
        styles: resolve(root, "styles.css"),
      },
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
