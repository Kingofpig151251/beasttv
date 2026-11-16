/**
 * beasttv 正式 Vite 建置設定
 *
 * 目的：讓 app.js（ES module，import src/）與既有 FastAPI api/ 共存於
 * 同一個 Vercel 專案。靜態檔從 dist/ 出，/api/* 仍走 Python function。
 *
 * 三個關鍵設計（缺一上線就壞）
 * ────────────────────────────
 * 1. publicDir：PWA 靜態檔（sw.js / manifest.json / icons / art / sfx）
 *    必須原封不動複製到 dist 根目錄，不能進 Vite 的 asset pipeline。
 *    否則檔名被 hash、HTML 內 /manifest.json 被改寫成 /assets/...，
 *    連 vercel.json 針對 /manifest.json 的 header 規則都會失效。
 *
 * 2. app.js 是 module entry：index.html 的 <script src="/app.js"> 沒有
 *    type="module" 時，Vite 會「build 成功但不打包 app.js」（最危險的假成功）。
 *    本設定把 app.js 列為 rollup input，並在 closeBundle 把三個 HTML 的
 *    script src 改寫成實際 hash 檔名。
 *
 * 3. sw.js SHELL 改寫：SHELL 寫死 /app.js、/styles.css 與 8 個 CSS 分片。
 *    打包後這些都變成 /assets/app-<hash>.js、/assets/styles-<hash>.css，
 *    且 8 個 @import 分片會被 Vite 合併進同一份 CSS（不再有 8 個實體檔）。
 *    closeBundle 會掃 dist/assets 拿真實檔名，重寫 dist/sw.js 的 SHELL。
 *    cache-first 下若漏了這步，首次離線載入樣式／JS 會全部失效。
 *
 * 本設定只在 rewrite/modular 分支使用，尚未改 vercel.json、未上線。
 */
import { defineConfig } from "vite";
import {
  cpSync, existsSync, mkdirSync, readFileSync, writeFileSync,
  readdirSync, rmSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

/** 必須保持原路徑的 PWA 靜態檔 */
const PWA_FILES = [
  "sw.js",
  "manifest.json",
  "favicon.ico",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
];
/** 必須保持原路徑的目錄 */
const PWA_DIRS = ["art", "sfx"];

/** 建置期暫存的 public 目錄（gitignore，不入 repo） */
const PUBLIC_DIR = resolve(root, ".vite-public");

function preparePublicDir() {
  rmSync(PUBLIC_DIR, { recursive: true, force: true });
  mkdirSync(PUBLIC_DIR, { recursive: true });
  for (const f of PWA_FILES) {
    const src = resolve(root, f);
    if (existsSync(src)) cpSync(src, resolve(PUBLIC_DIR, f));
  }
  for (const d of PWA_DIRS) {
    const src = resolve(root, d);
    if (existsSync(src)) cpSync(src, resolve(PUBLIC_DIR, d), { recursive: true });
  }
}

/** 從 dist/assets 找出實際 hash 檔名 */
function findAssets(outDir) {
  const assetsDir = resolve(outDir, "assets");
  const files = existsSync(assetsDir) ? readdirSync(assetsDir) : [];
  return {
    app: files.find((n) => /^app-.*\.js$/.test(n)),
    // HTML entry 的 thin wrapper（index.html 會載入它，它再 import app-*.js）
    main: files.find((n) => /^main-.*\.js$/.test(n)),
    css: files.find((n) => /^styles-.*\.css$/.test(n)),
    files,
  };
}

function beastBuildPlugin() {
  let outDir = resolve(root, "dist");

  return {
    name: "beasttv-build",
    apply: "build",

    config() {
      preparePublicDir();
    },

    configResolved(config) {
      outDir = resolve(root, config.build.outDir);
    },

    closeBundle() {
      const { app, main, css } = findAssets(outDir);
      const swPath = resolve(outDir, "sw.js");

      // ── 1. 重寫 dist/sw.js 的 SHELL ──────────────────────────
      if (existsSync(swPath)) {
        let sw = readFileSync(swPath, "utf8");
        const before = sw;

        if (app) sw = sw.replace(/"\/app\.js"/g, `"/assets/${app}"`);
        if (css) {
          // styles.css 原本是 8 條 @import 的聚合器；Vite 會把 8 個分片
          // 合併成單一 CSS。先收掉 8 個分片（連同行尾逗號），
          // 再把 /styles.css 換成同一份 hash CSS，避免 SHELL 出現 8 個重複項。
          const cssShard = /"\/css\/\d\d-[a-z]+\.css"\s*,?\s*/g;
          sw = sw.replace(cssShard, "");
          sw = sw.replace(/"\/styles\.css"/g, `"/assets/${css}"`);
        }
        // index.html 實際載入的是 main-*.js（HTML entry wrapper），
        // 它再 import app-*.js。SHELL 必須兩個都預快取，否則離線首次
        // 載入會缺 main entry、整個 JS 不起來。
        if (main && app) {
          sw = sw.replace(
            `"/assets/${app}",`,
            `"/assets/${main}", "/assets/${app}",`
          );
        }

        if (sw !== before) {
          writeFileSync(swPath, sw, "utf8");
          console.log(`[beasttv] sw.js SHELL 已改寫 → main=/assets/${main}, app=/assets/${app}, css=/assets/${css}`);
        } else {
          console.warn("[beasttv] WARNING: sw.js SHELL 沒有任何改動，請檢查檔名規則");
        }
        if (!app || !css || !main) {
          console.warn(`[beasttv] WARNING: 搵唔到 hash 檔名 (main=${main}, app=${app}, css=${css})`);
        }
      }

      // ── 2. 重寫三個 HTML 的 <script src="/app.js"> ────────────
      // 註：index.html 已改成 type="module"，Vite 會自己改寫；
      // edit.html / credits.html 沒有引用 app.js，這裡仍保險處理。
      if (app) {
        for (const name of ["index.html", "edit.html", "credits.html"]) {
          const p = resolve(outDir, name);
          if (!existsSync(p)) continue;
          const src = readFileSync(p, "utf8");
          const out = src.replace(
            /(<script\s+[^>]*src=)"\/app\.js"/g,
            `$1"/assets/${app}"`
          );
          if (out !== src) {
            writeFileSync(p, out, "utf8");
            console.log(`[beasttv] ${name} script src → /assets/${app}`);
          }
        }
      }

      // ── 3. 清走暫存 public 目錄 ──────────────────────────────
      rmSync(PUBLIC_DIR, { recursive: true, force: true });
    },
  };
}

export default defineConfig({
  root,
  base: "/",
  publicDir: PUBLIC_DIR,
  plugins: [beastBuildPlugin()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    minify: false,
    target: "es2020",
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
