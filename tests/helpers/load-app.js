/**
 * 共用載入器：在 node:vm 沙箱裡載入真實 app.js。
 *
 * 背景
 * ────
 * app.js 原本是 classic script，所有測試都用 vm.Script 直接載入。
 * 現在逐步改成 ES module（頂部有 import），而 vm.Script 不支援 ESM 語法，
 * 會拋 "Cannot use import statement outside a module"。
 *
 * 做法（同步，讓既有測試的 before() 不必改成 async）
 * ────────────────────────────────────────────────
 * 1. 讀取 app.js 原始碼
 * 2. 把頂部所有 `import { ... } from "...";` 行抽掉
 * 3. 這些 export 的函式由本檔靜態 import 取得，透過 `injected` 注入沙箱全域
 *
 * 這不是「改測試來遷就實作」：測試仍然跑真實 app.js 的所有函式，
 * 只不過把 module 的 import 邊界還原成沙箱能理解的形式。
 * 被注入的函式來自真正的 src/ 模組，與瀏覽器打包後用的是同一份。
 *
 * 若日後 app.js 的 import 變多，只要在 IMPORT_BINDINGS 補上即可。
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";

import { esc, fmtScore, statLine } from "../../src/format.js";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(HERE, "..", "..");
export const APP_JS = resolve(ROOT, "app.js");

/** import 規格 → 要注入沙箱的函式對照 */
const IMPORT_BINDINGS = Object.freeze({
  "./src/format.js": { esc, fmtScore, statLine },
});

/** 取出 app.js 源碼（含 import），供需要自行解析的測試使用 */
export function readAppSource() {
  return readFileSync(APP_JS, "utf8");
}

/**
 * 取得「module 化之前」的 app.js 原始碼，供「與原版逐項比對」的測試當基準。
 *
 * 為什麼需要：app.js 改成 module 後，原本定義在檔內的純函式改由 src/ 注入。
 * 若比對測試仍從工作區 app.js 取「原版」，拿到的其實是新模組，比對就失去意義。
 * 因此直接從 git 取出 module 化前的最後一個 commit，那才是真正的原版。
 *
 * 這個 commit 是固定的：module 化接線前的狀態。若日後要更新基準，
 * 必須明確改這裡，不能 implicitly 跟著 HEAD 跑。
 */
export const LEGACY_COMMIT = "7ad1252";

export function legacyAppCode() {
  return execFileSync("git", ["show", `${LEGACY_COMMIT}:app.js`], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
}

/**
 * 把 app.js 轉成 vm.Script 能吃的程式碼。
 * @returns {{ code: string, injected: Record<string, Function> }}
 */
export function prepareAppCode() {
  const raw = readAppSource();
  const injected = {};
  const lines = [];

  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["']\s*;?\s*$/);
    if (m) {
      const names = m[1].split(",").map((s) => s.trim()).filter(Boolean);
      const bindings = IMPORT_BINDINGS[m[2]];
      if (!bindings) {
        throw new Error(`load-app: 未登錄的 import 來源「${m[2]}」，請在 IMPORT_BINDINGS 補上`);
      }
      for (const n of names) {
        if (typeof bindings[n] !== "function") {
          throw new Error(`load-app: ${m[2]} 沒有 export 函式「${n}」`);
        }
        injected[n] = bindings[n];
      }
      continue; // 丟掉 import 行
    }
    if (/^\s*import\s/.test(line)) {
      throw new Error(`load-app: 不支援的 import 語法：${line.trim()}`);
    }
    lines.push(line);
  }

  return { code: lines.join("\n"), injected };
}

/** 需注入沙箱的函式（供呼叫方 Object.assign 到 sandbox） */
export function injectedGlobals() {
  return { ...prepareAppCode().injected };
}

/** vm.Script 可執行的 app.js 原始碼 */
export function runnableAppCode() {
  return prepareAppCode().code;
}
