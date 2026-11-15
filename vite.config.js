import { defineConfig } from "vite";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

// PWA 靜態資源：唔可以入 Vite 嘅 asset pipeline，否則檔名會被 hash 之餘，
// HTML 內 /manifest.json、/icon-*.png 亦會被改寫成 /assets/...-<hash>.json，
// 連 vercel.json 針對 /manifest.json 嘅 header 規則都會失效。
const PWA_FILES = [
  "sw.js",
  "manifest.json",
  "favicon.ico",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
];
const PWA_DIRS = ["art", "sfx"];

// 建置期暫存嘅 public 目錄（gitignore，唔入 repo）
const PUBLIC_DIR = resolve(root, ".vite-public");

/** 開 build 之前，把 PWA 資源複製成 publicDir */
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

/**
 * sw.js 嘅 SHELL 清單寫死 /app.js、/styles.css。
 * Vite 打包後真實檔名帶 hash，所以建置完要掃 dist/assets 把實際檔名注返 sw.js。
 * 呢個插件同時負責清走暫存 public 目錄。
 */
function beastSpikePlugin() {
  let outDir = resolve(root, "dist");

  return {
    name: "beasttv-spike",
    apply: "build",

    config() {
      preparePublicDir();
    },

    configResolved(config) {
      outDir = resolve(root, config.build.outDir);
    },

    closeBundle() {
      // 掃 dist/assets 拿實際 hash 檔名，改寫 sw.js 的 SHELL
      const assetsDir = resolve(outDir, "assets");
      const swPath = resolve(outDir, "sw.js");
      if (existsSync(assetsDir) && existsSync(swPath)) {
        const files = readdirSync(assetsDir);
        const app = files.find((n) => /^app-.*\.js$/.test(n));
        const css = files.find((n) => /^styles-.*\.css$/.test(n));
        if (app && css) {
          let sw = readFileSync(swPath, "utf8");
          sw = sw.replace(/"\/styles\.css"/, `"/assets/${css}"`);
          sw = sw.replace(/"\/app\.js"/, `"/assets/${app}"`);
          writeFileSync(swPath, sw, "utf8");
          console.log(`[spike] sw.js SHELL 已改寫 → /assets/${css}, /assets/${app}`);
        } else {
          console.warn(`[spike] WARNING: 搵唔到 hash 檔名 (app=${app}, css=${css})`);
        }
      }

      // classic script 唔會被打包：HTML 內 /app.js 要改寫成 hash 檔名
      for (const name of ["index.html", "edit.html", "credits.html"]) {
        const p = resolve(outDir, name);
        if (!existsSync(p)) continue;
        const before = readFileSync(p, "utf8");
        const files = existsSync(assetsDir) ? readdirSync(assetsDir) : [];
        const app = files.find((n) => /^app-.*\.js$/.test(n));
        if (!app) continue;
        const after = before.replace(/(<script\s+src=)"\/app\.js"/g, `$1"/assets/${app}"`);
        if (after !== before) {
          writeFileSync(p, after, "utf8");
          console.log(`[spike] ${name} script src 已改寫 → /assets/${app}`);
        }
      }

      rmSync(PUBLIC_DIR, { recursive: true, force: true });
    },
  };
}

export default defineConfig({
  root,
  base: "/",
  publicDir: PUBLIC_DIR,
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
