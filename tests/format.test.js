/**
 * 格式化模組測試
 *
 * 策略：與 tests/utils.test.js、tests/sfx.test.js 相同 —— 在 Node 的 vm 沙箱裡
 * 載入真正的 app.js，取出原版的 esc / fmtScore / statLine 當作「基準實作」，
 * 再逐項與 src/format.js 比對。不複製一份預期值，測的是真的 app.js。
 *
 * 原版 statLine 讀全域 LANG 與 G.skipPenalty；新模組改成參數注入，
 * 所以每個比對都在沙箱內把 LANG／G 設成對應組合，確認新模組的
 * { lang, skipPenalty } 與舊模組的全域狀態一一對應。
 *
 * 執行：node --test tests/format.test.js
 */
import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import { esc, fmtScore, statLine } from "../src/format.js";

import { runnableAppCode, injectedGlobals, legacyAppCode } from "./helpers/load-app.js";
const HERE = dirname(fileURLToPath(import.meta.url));
const APP_JS = resolve(HERE, "..", "app.js");
const FORMAT_JS = resolve(HERE, "..", "src", "format.js");
const MINUS = "\u2212"; // U+2212 MINUS SIGN

// ── 基準：真實 app.js 裡的三個函式 ────────────────────────────
let legacy; // { esc, fmtScore, statLine }
let boot;

before(() => {
  const noop = () => {};
  const makeEl = (o = {}) =>
    Object.assign(
      {
        classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
        style: { setProperty: noop },
        dataset: {},
        setAttribute: noop,
        getAttribute: () => null,
        removeAttribute: noop,
        appendChild: noop,
        append: noop,
        addEventListener: noop,
        removeEventListener: noop,
        querySelector: () => makeEl(),
        querySelectorAll: () => [],
        getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 }),
        focus: noop,
        blur: noop,
        click: noop,
        textContent: "",
        innerHTML: "",
        value: "",
        hidden: false,
        offsetWidth: 0,
        offsetHeight: 0,
        scrollWidth: 0,
        scrollHeight: 0,
        parentElement: null,
        children: [],
        childNodes: [],
        tagName: "DIV",
        nodeType: 1,
      },
      o
    );

  const store = new Map();
  const sb = {
    console: { log: noop, warn: noop, error: noop, info: noop, debug: noop },
    setTimeout: () => 0,
    clearTimeout: noop,
    setInterval: () => 0,
    clearInterval: noop,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: noop,
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    },
    document: {
      querySelector: () => makeEl(),
      querySelectorAll: () => [],
      getElementById: () => makeEl(),
      createElement: () => makeEl(),
      createTextNode: () => ({ nodeType: 3, textContent: "" }),
      createTreeWalker: () => ({ nextNode: () => null }),
      addEventListener: noop,
      removeEventListener: noop,
      documentElement: makeEl(),
      body: makeEl(),
      hidden: false,
      readyState: "complete",
    },
    window: {
      addEventListener: noop,
      removeEventListener: noop,
      matchMedia: () => ({ matches: false, addEventListener: noop }),
      location: { href: "http://localhost/", pathname: "/", search: "" },
      innerWidth: 1280,
      innerHeight: 900,
      scrollTo: noop,
      localStorage: {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
      },
    },
    navigator: { userAgent: "node-test" },
    location: { href: "http://localhost/", pathname: "/", search: "" },
    matchMedia: () => ({ matches: false, addEventListener: noop }),
    innerWidth: 1280,
    innerHeight: 900,
    getComputedStyle: () => ({ fontSize: "16px", opacity: "1", visibility: "visible" }),
    fetch: () => Promise.reject(new Error("no network in test")),
    Audio: function () {
      return { play: () => Promise.resolve(), pause: noop, addEventListener: noop };
    },
    Image: function () {
      return makeEl();
    },
    performance: { now: () => 0 },
    addEventListener: noop,
    NodeFilter: { SHOW_TEXT: 4 },
    Node: { ELEMENT_NODE: 1, TEXT_NODE: 3 },
    caches: { open: () => Promise.resolve({ add: () => Promise.resolve(), match: () => Promise.resolve() }) },
    URL,
    URLSearchParams,
    Date,
    Math,
    JSON,
    Object,
    Array,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    TypeError,
    Promise,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Symbol,
    Intl,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
    alert: noop,
    confirm: () => false,
    prompt: () => null,
  };
  sb.globalThis = sb;
  sb.self = sb.window;

  Object.assign(sb, injectedGlobals());

  /* 基準用「module 化之前」的 app.js（git 裡的固定 commit），
     而不是工作區版本——工作區的 esc/fmtScore/statLine 已經換成 src/ 模組了。 */
  const ctx = vm.createContext(sb);
  try {
    new vm.Script(legacyAppCode(), { filename: "app.js (legacy)" }).runInContext(ctx, { timeout: 10000 });
  } catch (e) {
    // 頂層有些依賴真 DOM 的呼叫會失敗，只要函式定義存在即可
    if (!/is not defined|Cannot read/.test(String(e))) throw e;
  }
  boot = (expr) => vm.runInContext(expr, ctx);
  legacy = {
    esc: boot("esc"),
    fmtScore: boot("fmtScore"),
    statLine: boot("statLine"),
  };
});

/* 每個測試前把沙箱的隱含狀態歸零：中文、G 為 null */
beforeEach(() => {
  boot("LANG = 'zh'; G = null;");
});

/** 在沙箱內設定 LANG / G，再跑原版 statLine */
function legacyStat(t, bold, { lang = "zh", skipPenalty = false, gNull = false } = {}) {
  boot(`LANG = ${JSON.stringify(lang)}; G = ${gNull ? "null" : `{ skipPenalty: ${skipPenalty} }`};`);
  return legacy.statLine(t, bold);
}

// ── esc：與原版逐項比對 ────────────────────────────────────
describe("esc：與原 app.js 逐項比對", () => {
  const INPUTS = [
    "&",
    "<",
    ">",
    '"',
    "'",
    "&<>\"'",
    "",
    "hello",
    "百獸台 派對",
    "&amp;",
    "&lt;tag&gt;",
    '<b class="x">中</b>',
    "<script>alert(1)</script>",
    "&notanentity;",
    'He said "hi" & left\'s',
    " ",
    " 混合 <中> & 'en' \"引號\" ",
    "\\",
    "`",
    "$",
    "<!--",
    "-- >",
  ];

  test("五個危險字元逐一比對", () => {
    for (const s of INPUTS) {
      assert.equal(esc(s), legacy.esc(s), `esc(${JSON.stringify(s)}) 與原版不同`);
    }
  });

  test("null / undefined / 數字 / 布林都先經 String()", () => {
    for (const v of [null, undefined, 0, -12.5, true, false, NaN, Infinity]) {
      assert.equal(esc(v), legacy.esc(v), `esc(${String(v)}) 與原版不同`);
    }
    assert.equal(esc(null), "null", "原版行為：null 變字串 'null'，不是空字串");
    assert.equal(esc(undefined), "undefined");
    assert.equal(esc(0), "0");
  });

  test("單一 replace 不二次跳脫", () => {
    assert.equal(esc("&amp;"), "&amp;amp;");
    assert.equal(esc("&amp;"), legacy.esc("&amp;"));
  });

  test("完整的 <script> 被中和（不再含有可執行標籤）", () => {
    const out = esc("<script>alert(1)</script>");
    assert.ok(!out.includes("<script"), "輸出不得含 <script");
    assert.ok(!out.includes("</script>"), "輸出不得含 </script");
    assert.equal(out, legacy.esc("<script>alert(1)</script>"));
    assert.equal(out, "&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  test("5000 字超長輸入與原版一致，且長度按倍數增長", () => {
    const long = "<".repeat(5000);
    const out = esc(long);
    assert.equal(out, legacy.esc(long));
    assert.equal(out.length, 5000 * 4, "每個 '<' 變 4 個字元");
    assert.ok(!out.includes("<"));
  });

  test("500 個五字元混合字串與原版一致", () => {
    const s = "&<>\"'".repeat(500);
    assert.equal(esc(s), legacy.esc(s));
    /* & → &amp;(5)  < → &lt;(4)  > → &gt;(4)  " → &quot;(6)  ' → &#39;(5) = 24 */
    assert.equal(esc(s).length, 500 * 24);
  });

  test("回傳型別永遠是 string", () => {
    for (const v of [null, undefined, 0, {}, [], () => {}]) {
      assert.equal(typeof esc(v), "string", `esc(${String(v)}) 應回 string`);
    }
  });
});

// ── esc：隨機比對 ─────────────────────────────────────────
describe("esc：隨機輸入與原版一致", () => {
  test("2000 組偽隨機字串", () => {
    const alphabet = ["&", "<", ">", '"', "'", "a", "Z", "0", " ", "中", "文", "\n", "\\", "`", "/"];
    let seed = 123456789;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed;
    };
    for (let i = 0; i < 2000; i++) {
      const len = rnd() % 12;
      let s = "";
      for (let j = 0; j < len; j++) s += alphabet[rnd() % alphabet.length];
      assert.equal(esc(s), legacy.esc(s), `隨機字串 ${JSON.stringify(s)} 不一致`);
    }
  });
});

// ── fmtScore：與原版逐項比對 ──────────────────────────────
describe("fmtScore：與原 app.js 逐項比對", () => {
  const NUMS = [
    0, -0, 1, -1, 5, -5, 12, -12, 2.5, -2.5, 0.1, -0.1,
    100, -100, 1234567, -1234567, 999999999, -999999999,
    Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER,
    "5", "5" - 0, true, false, null, undefined, NaN, Infinity, -Infinity,
  ];

  test("全部數值與原版一致", () => {
    for (const v of NUMS) {
      assert.equal(fmtScore(v), legacy.fmtScore(v), `fmtScore(${String(v)}) 與原版不同`);
    }
  });

  test("零與負零都是 +0", () => {
    assert.equal(fmtScore(0), "+0");
    assert.equal(fmtScore(-0), "+0");
    assert.equal(fmtScore(-0), legacy.fmtScore(-0));
  });

  test("負號是 U+2212 而非 ASCII hyphen", () => {
    const out = fmtScore(-5);
    assert.equal(out, `${MINUS}5`);
    assert.equal(out.charCodeAt(0), 0x2212, "必須是 U+2212 MINUS SIGN");
    assert.notEqual(out.charCodeAt(0), 0x2d, "不可用 ASCII hyphen-minus");
    assert.ok(!out.includes("-"), "整個字串不得出現 ASCII '-'");
  });

  test("NaN / Infinity 等與原版同樣不拋錯", () => {
    assert.doesNotThrow(() => fmtScore(NaN));
    assert.equal(fmtScore(NaN), legacy.fmtScore(NaN));
    assert.equal(fmtScore(Infinity), "+Infinity");
    assert.equal(fmtScore(-Infinity), `${MINUS}Infinity`);
  });

  test("大數不加千分位", () => {
    assert.equal(fmtScore(1234567), "+1234567");
    assert.equal(fmtScore(-1234567), `${MINUS}1234567`);
    assert.ok(!fmtScore(1234567).includes(","), "不得有千分位逗號");
    assert.ok(!fmtScore(1234567).includes(" "), "不得有空白分隔");
  });

  test("字串輸入與原版一致（'5' 不加號）", () => {
    assert.equal(fmtScore("5"), legacy.fmtScore("5"));
  });
});

// ── statLine：注入參數 vs 原版全域 ────────────────────────
describe("statLine：與原 app.js 逐項比對（LANG × skipPenalty × bold）", () => {
  const CASES = [
    { ok: 3 },
    { ok: 3, foul: 1 },
    { ok: 3, skip: 2 },
    { ok: 3, foul: 1, skip: 2 },
    { ok: 1, skip: 9 },
    { ok: 0, foul: 0, skip: 0 },
    { ok: 2, foul: 1, skip: 0 },
    { ok: 2, foul: 0, skip: 5 },
    {},
    { ok: 0 },
    { foul: 4 },
    { skip: 4 },
    { ok: 12, foul: 3, skip: 7 },
  ];

  test("四種組合 × 粗體開關 × 13 組統計，逐一比對", () => {
    for (const lang of ["zh", "en"]) {
      for (const skipPenalty of [false, true]) {
        for (const bold of [false, true]) {
          for (const t of CASES) {
            const oldVal = legacyStat(t, bold, { lang, skipPenalty });
            const newVal = statLine(t, { bold, skipPenalty, lang });
            assert.equal(
              newVal,
              oldVal,
              `lang=${lang} skipPenalty=${skipPenalty} bold=${bold} t=${JSON.stringify(t)}`
            );
          }
        }
      }
    }
  });

  test("中文預設：答中 N", () => {
    assert.equal(statLine({ ok: 3 }), "答中 3");
    assert.equal(statLine({ ok: 3 }), legacyStat({ ok: 3 }));
  });

  test("英文：N correct", () => {
    assert.equal(statLine({ ok: 3 }, { lang: "en" }), "3 correct");
    assert.equal(statLine({ ok: 3 }, { lang: "en" }), legacyStat({ ok: 3 }, undefined, { lang: "en" }));
  });

  test("犯規只在 truthy 時出現", () => {
    assert.equal(statLine({ ok: 3, foul: 1 }), "答中 3 · 犯規 1");
    assert.equal(statLine({ ok: 3, foul: 0 }), "答中 3");
    assert.equal(statLine({ ok: 3, foul: 1 }), legacyStat({ ok: 3, foul: 1 }));
  });

  test("跳過只在 skipPenalty 開啟且 t.skip truthy 時出現", () => {
    assert.equal(statLine({ ok: 3, skip: 2 }, { skipPenalty: false }), "答中 3");
    assert.equal(statLine({ ok: 3, skip: 2 }, { skipPenalty: true }), "答中 3 · 跳過 2");
    assert.equal(statLine({ ok: 3, skip: 0 }, { skipPenalty: true }), "答中 3", "skip=0 不算跳過過");
    assert.equal(
      statLine({ ok: 3, skip: 2 }, { skipPenalty: true }),
      legacyStat({ ok: 3, skip: 2 }, undefined, { skipPenalty: true })
    );
  });

  test("G 為 null 時（等於 skipPenalty 關）不拋錯且與原版一致", () => {
    assert.doesNotThrow(() => statLine({ ok: 3, skip: 2 }));
    assert.equal(statLine({ ok: 3, skip: 2 }), legacyStat({ ok: 3, skip: 2 }, undefined, { gNull: true }));
  });

  test("bold 包 <b>", () => {
    assert.equal(statLine({ ok: 2, foul: 1 }, { bold: true }), "答中 <b>2</b> · 犯規 <b>1</b>");
    assert.equal(
      statLine({ ok: 2, foul: 1 }, { bold: true }),
      legacyStat({ ok: 2, foul: 1 }, true)
    );
    assert.equal(
      statLine({ ok: 3, foul: 2, skip: 1 }, { bold: true, skipPenalty: true, lang: "en" }),
      "<b>3</b> correct · <b>2</b> foul · <b>1</b> skipped"
    );
    assert.equal(
      statLine({ ok: 3, foul: 2, skip: 1 }, { bold: true, skipPenalty: true, lang: "en" }),
      legacyStat({ ok: 3, foul: 2, skip: 1 }, true, { lang: "en", skipPenalty: true })
    );
  });

  test("中英雙語：同一組統計只差語言", () => {
    const t = { ok: 4, foul: 1, skip: 3 };
    assert.equal(statLine(t), "答中 4 · 犯規 1");
    assert.equal(statLine(t, { skipPenalty: true }), "答中 4 · 犯規 1 · 跳過 3");
    assert.equal(statLine(t, { lang: "en" }), "4 correct · 1 foul");
    assert.equal(statLine(t, { lang: "en", skipPenalty: true }), "4 correct · 1 foul · 3 skipped");
  });

  test("分隔符固定為空白 + U+00B7 + 空白", () => {
    assert.equal(statLine({ ok: 1, foul: 1 }), "答中 1 \u00b7 犯規 1");
  });

  test("t.ok 缺失時顯示 0", () => {
    assert.equal(statLine({}), "答中 0");
    assert.equal(statLine({}), legacyStat({}));
  });

  test("參數注入：第二參數收 boolean 時視為 bold（相容舊呼叫點）", () => {
    assert.equal(statLine({ ok: 2 }, true), statLine({ ok: 2 }, { bold: true }));
    assert.equal(statLine({ ok: 2 }, true), legacyStat({ ok: 2 }, true));
  });

  test("選項物件可省略或為 null，全走預設值", () => {
    assert.equal(statLine({ ok: 2 }), "答中 2");
    assert.equal(statLine({ ok: 2 }, undefined), "答中 2");
    assert.equal(statLine({ ok: 2 }, null), "答中 2");
  });

  test("lang 非 'en' 一律當中文（與原版 LANG === 'en' 判斷一致）", () => {
    for (const lang of ["zh", "ZH", "en-US", "", null, undefined, 0]) {
      assert.equal(statLine({ ok: 2 }, { lang }), legacyStat({ ok: 2 }, undefined, { lang: lang == null ? null : lang }));
    }
  });

  test("t 為 null 時與原版一樣拋 TypeError", () => {
    assert.throws(() => statLine(null), TypeError);
    assert.throws(() => legacyStat(null));
    boot("LANG = 'zh'; G = null;");
    assert.throws(() => legacy.statLine(null));
  });
});

// ── 模組化本身：不得再依賴全域 ────────────────────────────
describe("模組化：不再讀取全域 LANG / G", () => {
  test("全域 LANG='en' 不影響模組輸出", () => {
    const saved = globalThis.LANG;
    globalThis.LANG = "en";
    try {
      assert.equal(statLine({ ok: 1 }), "答中 1", "模組不應讀 globalThis.LANG");
      assert.equal(statLine({ ok: 1 }, { lang: "en" }), "1 correct");
    } finally {
      if (saved === undefined) delete globalThis.LANG;
      else globalThis.LANG = saved;
    }
  });

  test("全域 G.skipPenalty=true 不影響模組輸出", () => {
    const saved = globalThis.G;
    globalThis.G = { skipPenalty: true };
    try {
      assert.equal(statLine({ ok: 1, skip: 2 }), "答中 1", "模組不應讀 globalThis.G");
    } finally {
      if (saved === undefined) delete globalThis.G;
      else globalThis.G = saved;
    }
  });

  test("原始碼不引用 LANG / G / window / document / localStorage", () => {
    const src = readFileSync(FORMAT_JS, "utf8");
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    for (const bad of ["LANG", "G.", "G ", "window", "document", "localStorage", "G["]) {
      assert.ok(!code.includes(bad), `src/format.js 不應出現 ${JSON.stringify(bad)}`);
    }
  });
});

// ── 匯出介面 ──────────────────────────────────────────────
describe("模組介面", () => {
  test("三個函式都是 function，且不需要任何前置初始化", async () => {
    const mod = await import("../src/format.js");
    assert.equal(typeof mod.esc, "function");
    assert.equal(typeof mod.fmtScore, "function");
    assert.equal(typeof mod.statLine, "function");
    assert.equal(typeof mod.default, "object");
    assert.equal(mod.default.esc, mod.esc);
    assert.equal(mod.default.fmtScore, mod.fmtScore);
    assert.equal(mod.default.statLine, mod.statLine);
  });
});
