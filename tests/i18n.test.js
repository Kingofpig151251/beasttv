/**
 * i18n 測試
 *
 * 重點：新的 src/i18n.js 必須與原 app.js 的翻譯行為完全一致。
 * 用真實 app.js 的 EN 字典與 T() 作為對照基準。
 *
 * 執行：node --test tests/i18n.test.js
 */
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_JS = resolve(HERE, "..", "app.js");
const noop = () => {};

// ── 用真實 app.js 抽基準 ─────────────────────────────────────
let legacy; // { EN, T, LANG }

before(() => {
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
        querySelector: () => makeEl(),
        querySelectorAll: () => [],
        getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 }),
        focus: noop,
        textContent: "",
        innerHTML: "",
        value: "",
        hidden: false,
        offsetWidth: 0,
        offsetHeight: 0,
        parentElement: null,
        tagName: "DIV",
        nodeType: 1,
      },
      o
    );

  const store = new Map();
  const sb = {
    console: { log: noop, warn: noop, error: noop, info: noop },
    setTimeout: () => 0,
    clearTimeout: noop,
    setInterval: () => 0,
    clearInterval: noop,
    requestAnimationFrame: () => 0,
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
    document: {
      querySelector: () => makeEl(),
      querySelectorAll: () => [],
      getElementById: () => makeEl(),
      createElement: () => makeEl(),
      createTextNode: () => ({ nodeType: 3, textContent: "" }),
      createTreeWalker: () => ({ nextNode: () => null }),
      createRange: () => ({
        selectNodeContents: noop,
        getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 }),
      }),
      addEventListener: noop,
      documentElement: makeEl(),
      body: makeEl(),
      hidden: false,
      readyState: "complete",
    },
    window: {
      addEventListener: noop,
      matchMedia: () => ({ matches: false, addEventListener: noop }),
      location: { href: "http://localhost/", pathname: "/" },
      innerWidth: 1280,
      innerHeight: 900,
      scrollTo: noop,
    },
    navigator: { userAgent: "n" },
    location: { href: "http://localhost/", pathname: "/" },
    matchMedia: () => ({ matches: false, addEventListener: noop }),
    innerWidth: 1280,
    innerHeight: 900,
    getComputedStyle: () => ({ fontSize: "16px", opacity: "1", visibility: "visible" }),
    fetch: () => Promise.reject(new Error("x")),
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
    URL,
    URLSearchParams,
    Date,
    Math,
    JSON,
  };
  sb.globalThis = sb;
  const ctx = vm.createContext(sb);
  try {
    new vm.Script(readFileSync(APP_JS, "utf8")).runInContext(ctx, { timeout: 10000 });
  } catch (e) {
    if (!/is not (defined|a function)|Cannot read/.test(String(e.message))) throw e;
  }
  legacy = {
    EN: JSON.parse(vm.runInContext("JSON.stringify(EN)", ctx)),
    setLang: (v) => {
      vm.runInContext(`LANG = ${JSON.stringify(v)}`, ctx);
    },
    T: (s) => vm.runInContext(`T(${JSON.stringify(s)})`, ctx),
  };
});

// ── 新模組 ──────────────────────────────────────────────────
const i18n = await import("../src/i18n.js");

describe("字典完整性", () => {
  test("key 數量與原 app.js 相同", () => {
    const legacyKeys = Object.keys(legacy.EN);
    const newKeys = Object.keys(i18n.EN);
    assert.equal(newKeys.length, legacyKeys.length, `原 ${legacyKeys.length} 條，新 ${newKeys.length} 條`);
  });

  test("每一條 key 都存在", () => {
    for (const k of Object.keys(legacy.EN)) {
      assert.ok(k in i18n.EN, `缺少 key: ${k}`);
    }
  });

  test("每一條翻譯值都與原版逐字相同", () => {
    for (const [k, v] of Object.entries(legacy.EN)) {
      assert.equal(i18n.EN[k], v, `key「${k}」的值不同：原「${v}」新「${i18n.EN[k]}」`);
    }
  });

  test("沒有多出原版沒有的 key", () => {
    for (const k of Object.keys(i18n.EN)) {
      assert.ok(k in legacy.EN, `新版多了原版沒有的 key: ${k}`);
    }
  });
});

describe("T() 翻譯行為", () => {
  test("中文模式回原文", () => {
    i18n.setLang("zh");
    for (const k of Object.keys(legacy.EN).slice(0, 20)) {
      assert.equal(i18n.T(k), k, `中文模式下「${k}」應回原文`);
    }
  });

  test("英文模式查字典", () => {
    i18n.setLang("en");
    assert.equal(i18n.T("開始"), legacy.EN["開始"]);
    assert.equal(i18n.T("百獸台"), legacy.EN["百獸台"]);
  });

  test("英文模式下查不到的 key 回原文", () => {
    i18n.setLang("en");
    const missing = "這個字串不在字典裡";
    assert.equal(i18n.T(missing), missing);
  });

  test("逐條與原版 T() 結果一致（中文模式）", () => {
    legacy.setLang("zh");
    i18n.setLang("zh");
    for (const k of Object.keys(legacy.EN)) {
      assert.equal(i18n.T(k), legacy.T(k), `中文模式下 key「${k}」結果不同`);
    }
  });

  test("逐條與原版 T() 結果一致（英文模式）", () => {
    legacy.setLang("en");
    i18n.setLang("en");
    for (const k of Object.keys(legacy.EN)) {
      assert.equal(i18n.T(k), legacy.T(k), `英文模式下 key「${k}」結果不同`);
    }
  });

  test("空字串與一般字串行為一致", () => {
    i18n.setLang("en");
    assert.equal(i18n.T(""), "");
    assert.equal(i18n.T("完全無關的字"), "完全無關的字");
  });
});

describe("語言偏好持久化", () => {
  test("setLang 寫入 localStorage 正確鍵名", () => {
    i18n.setLang("en");
    assert.equal(i18n.getLang(), "en");
    assert.equal(i18n.LANG_KEY, "beasttv.lang", "localStorage 鍵名必須是 beasttv.lang");
  });

  test("只接受 zh / en，其他值一律當中文", () => {
    i18n.setLang("fr");
    assert.equal(i18n.getLang(), "zh");
  });

  test("toggleLang 在兩者間切換", () => {
    i18n.setLang("zh");
    assert.equal(i18n.toggleLang(), "en");
    assert.equal(i18n.toggleLang(), "zh");
  });

  test("isEn 反映目前語言", () => {
    i18n.setLang("en");
    assert.equal(i18n.isEn(), true);
    i18n.setLang("zh");
    assert.equal(i18n.isEn(), false);
  });
});
