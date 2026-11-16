/**
 * 鍵盤快捷鍵模組測試
 *
 * 策略：雙軌比對。
 * 1. **基準軌**：在 vm 沙箱載入真實 app.js，取出它的 KEY_DEF / loadKeys / keyLabel / codeOf。
 * 2. **模組軌**：import ../src/keys.js。
 * 然後用同一批輸入同時跑兩邊，斷言結果完全相同。這比「照抄一份期望值」可靠，
 * 因為期望值是從 app.js 本身產生的，不是從我的理解產生的。
 *
 * 有幾個地方一定要用「原版」的函式才能比，因為原版的 loadKeys 讀全域 localStorage：
 * 沙箱的 localStorage stub 會回傳我預先塞進去的值。
 *
 * 執行：node --test tests/keys.test.js
 */
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import { runnableAppCode, injectedGlobals } from "./helpers/load-app.js";
const HERE = dirname(fileURLToPath(import.meta.url));
const APP_JS = resolve(HERE, "..", "app.js");
const noop = () => {};

/* ── 沙箱：把 app.js 載入，並保留一個可操控的 store ───────────────── */
function makeSandbox() {
  const store = new Map();
  const fakeEl = () => ({
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
    querySelector: () => fakeEl(),
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
    clientWidth: 0,
    clientHeight: 0,
    parentElement: null,
    children: [],
    childNodes: [],
    firstChild: null,
    tagName: "DIV",
    nodeType: 1,
  });

  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };

  const sandbox = {
    console: { log: noop, warn: noop, error: noop, info: noop, debug: noop },
    setTimeout: () => 0,
    clearTimeout: noop,
    setInterval: () => 0,
    clearInterval: noop,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: noop,
    localStorage,
    document: {
      querySelector: () => fakeEl(),
      querySelectorAll: () => [],
      getElementById: () => fakeEl(),
      createElement: () => fakeEl(),
      createTextNode: () => ({ nodeType: 3, textContent: "" }),
      createTreeWalker: () => ({ nextNode: () => null }),
      addEventListener: noop,
      removeEventListener: noop,
      documentElement: fakeEl(),
      body: fakeEl(),
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
      localStorage,
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
      return fakeEl();
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
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox.window;
  return { sandbox, store };
}

/** 載入一份全新的 app.js 沙箱（每次呼叫都是乾淨狀態） */
function bootApp() {
  const { sandbox, store } = makeSandbox();
  Object.assign(sandbox, injectedGlobals());
  const ctx = vm.createContext(sandbox);
  try {
    new vm.Script(runnableAppCode(), { filename: "app.js" }).runInContext(ctx, {
      timeout: 10000,
    });
  } catch (e) {
    if (!/is not defined|Cannot read/.test(String(e))) throw e;
  }
  const run = (expr) => vm.runInContext(expr, ctx);
  return { ctx, run, store, sandbox };
}

/* 基準軌：預設狀態下的原版 app.js */
let legacy;
before(() => {
  const app = bootApp();
  legacy = {
    run: app.run,
    KEY_DEF: JSON.parse(app.run("JSON.stringify(KEY_DEF)")),
    KEY_WHAT: JSON.parse(app.run("JSON.stringify(KEY_WHAT)")),
    KEY_ORDER: JSON.parse(app.run("JSON.stringify(KEY_ORDER)")),
  };
});

const mod = await import("../src/keys.js");

/* ── 假的 Storage，可指定 getItem 回傳值或讓 setItem 拋錯 ─────────── */
function fakeStore({ raw = null, throwOnGet = false, throwOnSet = false } = {}) {
  const map = new Map();
  if (raw !== null) map.set("beasttv.keys", raw);
  return {
    _map: map,
    getItem(k) {
      if (throwOnGet) throw new Error("storage blocked");
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      if (throwOnSet) throw new Error("quota / private mode");
      map.set(k, String(v));
    },
    removeItem(k) {
      map.delete(k);
    },
  };
}

// ── 常數 ──────────────────────────────────────────────────────────
describe("常數與原 app.js 逐項相同", () => {
  test("KEY_DEF 四個預設值一字不差", () => {
    assert.deepEqual({ ...mod.KEY_DEF }, legacy.KEY_DEF);
    assert.deepEqual({ ...mod.KEY_DEF }, {
      foul: "ArrowLeft",
      skip: "ArrowDown",
      ok: "ArrowRight",
      undo: "ArrowUp",
    });
  });

  test("KEY_WHAT 四個中文名一字不差", () => {
    assert.deepEqual({ ...mod.KEY_WHAT }, legacy.KEY_WHAT);
  });

  test("KEY_ORDER 順序完全相同", () => {
    assert.deepEqual([...mod.KEY_ORDER], legacy.KEY_ORDER);
    assert.deepEqual([...mod.KEY_ORDER], ["foul", "skip", "ok", "undo"]);
  });

  test("KEY_ORDER 的每一項都在 KEY_DEF 與 KEY_WHAT 裡", () => {
    for (const k of mod.KEY_ORDER) {
      assert.ok(k in mod.KEY_DEF, `${k} 不在 KEY_DEF`);
      assert.ok(k in mod.KEY_WHAT, `${k} 不在 KEY_WHAT`);
    }
  });

  test("常數是凍結的（防止意外就地改寫）", () => {
    assert.ok(Object.isFrozen(mod.KEY_DEF));
    assert.ok(Object.isFrozen(mod.KEY_WHAT));
    assert.ok(Object.isFrozen(mod.KEY_ORDER));
  });
});

// ── keyLabel ─────────────────────────────────────────────────────
describe("keyLabel：與原版逐一比對", () => {
  const codes = [
    // 方向鍵與斜體字表
    "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
    "Space", "Enter", "Backspace", "Delete", "Home", "End",
    "PageUp", "PageDown", "Insert", "Escape",
    // Key / Digit / Numpad
    "KeyA", "KeyZ", "KeyQ", "Digit0", "Digit9", "Numpad0", "Numpad5", "Numpad9",
    // 邊界：多字母、多數字、小寫、空字串
    "KeyAB", "Digit10", "Numpad10", "keya", "digit1", "numpad1",
    // 未命中任何規則
    "F1", "F12", "ShiftLeft", "ControlRight", "AltLeft", "MetaLeft",
    "NumpadEnter", "NumpadAdd", "NumpadDecimal", "NumpadMultiply",
    "Semicolon", "Quote", "BracketLeft", "Backquote", "IntlBackslash",
    "", " ", "中文", "Tab", "CapsLock",
  ];

  test("所有 code 的輸出與原版完全相同", () => {
    for (const c of codes) {
      const got = mod.keyLabel(c);
      const want = legacy.run(`keyLabel(${JSON.stringify(c)})`);
      assert.equal(got, want, `keyLabel(${JSON.stringify(c)}) 不一致：模組=${got} 原版=${want}`);
    }
  });

  test("方向鍵輸出為箭頭", () => {
    assert.equal(mod.keyLabel("ArrowLeft"), "←");
    assert.equal(mod.keyLabel("ArrowRight"), "→");
    assert.equal(mod.keyLabel("ArrowUp"), "↑");
    assert.equal(mod.keyLabel("ArrowDown"), "↓");
  });

  test("Space 顯示為「空格」", () => {
    assert.equal(mod.keyLabel("Space"), "空格");
  });

  test("Key→單個大寫字母", () => {
    assert.equal(mod.keyLabel("KeyA"), "A");
    assert.equal(mod.keyLabel("KeyZ"), "Z");
    assert.equal(mod.keyLabel("KeyQ"), "Q");
  });

  test("Digit→單個數字", () => {
    assert.equal(mod.keyLabel("Digit0"), "0");
    assert.equal(mod.keyLabel("Digit9"), "9");
  });

  test("Numpad→Num 加數字", () => {
    assert.equal(mod.keyLabel("Numpad0"), "Num0");
    assert.equal(mod.keyLabel("Numpad5"), "Num5");
    assert.equal(mod.keyLabel("Numpad9"), "Num9");
  });

  test("KeyAB 不誤判成字母（只認單字母）", () => {
    /* /^Key[A-Z]$/ 不匹配 KeyAB，落到最後的 replace，而 replace 只換 Numpad 前綴，
       所以 KeyAB 原樣返回。這正是原版行為。 */
    assert.equal(mod.keyLabel("KeyAB"), "KeyAB");
    assert.equal(mod.keyLabel("KeyAB"), legacy.run(`keyLabel("KeyAB")`));
  });

  test("未知 code 原樣返回", () => {
    assert.equal(mod.keyLabel("F1"), "F1");
    assert.equal(mod.keyLabel("ShiftLeft"), "ShiftLeft");
    assert.equal(mod.keyLabel("中文"), "中文");
    assert.equal(mod.keyLabel(""), "");
  });

  test("NumpadEnter 這類非數字 Numpad 鍵被換成 NumEnter", () => {
    /* 這是原版 replace(/^Numpad/, "Num") 的效果，不是 bug，照抄。 */
    assert.equal(mod.keyLabel("NumpadEnter"), "NumEnter");
    assert.equal(mod.keyLabel("NumpadEnter"), legacy.run(`keyLabel("NumpadEnter")`));
  });
});

// ── codeOf ───────────────────────────────────────────────────────
describe("codeOf：與原版逐一比對", () => {
  const events = [
    // code 優先
    { code: "ArrowLeft", key: "ArrowLeft" },
    { code: "KeyA", key: "a" },
    { code: "Space", key: " " },
    // code 與 key 不一致時，code 勝
    { code: "KeyQ", key: "a" },
    { code: "Digit1", key: "q" },
    // 冇 code，用 key 反推
    { key: "ArrowLeft" }, { key: "ArrowRight" }, { key: "ArrowUp" }, { key: "ArrowDown" },
    { key: " " }, { key: "Spacebar" },
    { key: "a" }, { key: "z" }, { key: "A" }, { key: "Z" },
    { key: "0" }, { key: "9" },
    // 反推不了就原樣
    { key: "Enter" }, { key: "Escape" }, { key: "Tab" }, { key: "中文" },
    { key: "AB" }, { key: "12" }, { key: "" },
    // 全空
    {},
    // code 是空字串（falsy）→ 走 key 反推
    { code: "", key: "a" },
    { code: "", key: "ArrowUp" },
    { code: "", key: "" },
    // code 為 null
    { code: null, key: "b" },
    { code: undefined, key: "1" },
  ];

  test("所有事件的輸出與原版完全相同", () => {
    for (const e of events) {
      const got = mod.codeOf(e);
      const want = legacy.run(`codeOf(${JSON.stringify(e)})`);
      assert.equal(got, want, `codeOf(${JSON.stringify(e)}) 不一致：模組=${got} 原版=${want}`);
    }
  });

  test("code 優先於 key", () => {
    assert.equal(mod.codeOf({ code: "KeyQ", key: "a" }), "KeyQ");
    assert.equal(mod.codeOf({ code: "ArrowLeft", key: "x" }), "ArrowLeft");
  });

  test("空 code 退回用 key 反推", () => {
    assert.equal(mod.codeOf({ code: "", key: "a" }), "KeyA");
    assert.equal(mod.codeOf({ code: "", key: "ArrowUp" }), "ArrowUp");
    assert.equal(mod.codeOf({ key: "1" }), "Digit1");
  });

  test("KeyAB 這種多字母 key 不誤判", () => {
    /* /^[a-zA-Z]$/ 只認單字母，AB 原樣返回 */
    assert.equal(mod.codeOf({ key: "AB" }), "AB");
    assert.equal(mod.codeOf({ key: "AB" }), legacy.run(`codeOf({key:"AB"})`));
  });

  test("數字 key 只認單個數字", () => {
    assert.equal(mod.codeOf({ key: "1" }), "Digit1");
    assert.equal(mod.codeOf({ key: "12" }), "12");
  });

  test("空格與 Spacebar 都變成 Space", () => {
    assert.equal(mod.codeOf({ key: " " }), "Space");
    assert.equal(mod.codeOf({ key: "Spacebar" }), "Space");
  });

  test("小寫與大寫字母都變成 Key 加對應大寫", () => {
    assert.equal(mod.codeOf({ key: "a" }), "KeyA");
    assert.equal(mod.codeOf({ key: "A" }), "KeyA");
  });

  test("中文 key 原樣返回", () => {
    assert.equal(mod.codeOf({ key: "中文" }), "中文");
  });

  test("完全空的事件物件回空字串", () => {
    assert.equal(mod.codeOf({}), "");
    assert.equal(mod.codeOf({ code: null, key: undefined }), "");
  });
});

// ── loadKeys ─────────────────────────────────────────────────────
describe("loadKeys：損壞時降級回預設", () => {
  test("空 storage 回預設值", () => {
    assert.deepEqual({ ...mod.loadKeys(fakeStore()) }, { ...mod.KEY_DEF });
  });

  test("storage 不存在（null）回預設值", () => {
    assert.deepEqual({ ...mod.loadKeys(null) }, { ...mod.KEY_DEF });
  });

  test("壞 JSON 回預設值且不拋錯", () => {
    const s = fakeStore({ raw: "{不是 JSON" });
    assert.doesNotThrow(() => mod.loadKeys(s));
    assert.deepEqual({ ...mod.loadKeys(s) }, { ...mod.KEY_DEF });
  });

  test("JSON 是 null 字面量時回預設值", () => {
    const s = fakeStore({ raw: "null" });
    assert.deepEqual({ ...mod.loadKeys(s) }, { ...mod.KEY_DEF });
  });

  test("JSON 是陣列或數字時回預設值", () => {
    for (const raw of ["[]", "123", '"字串"', "true"]) {
      const s = fakeStore({ raw });
      assert.deepEqual({ ...mod.loadKeys(s) }, { ...mod.KEY_DEF }, `raw=${raw}`);
    }
  });

  test("缺欄位時缺的那個用預設、有的保留", () => {
    const s = fakeStore({ raw: JSON.stringify({ foul: "KeyQ" }) });
    const got = mod.loadKeys(s);
    assert.equal(got.foul, "KeyQ");
    assert.equal(got.skip, "ArrowDown");
    assert.equal(got.ok, "ArrowRight");
    assert.equal(got.undo, "ArrowUp");
  });

  test("非字串值被忽略，用回預設", () => {
    const s = fakeStore({ raw: JSON.stringify({ foul: 123, skip: null, ok: {}, undo: [] }) });
    assert.deepEqual({ ...mod.loadKeys(s) }, { ...mod.KEY_DEF });
  });

  test("空字串值被忽略，用回預設（原版 j[k] 為真值的條件）", () => {
    const s = fakeStore({ raw: JSON.stringify({ foul: "", skip: "", ok: "", undo: "" }) });
    assert.deepEqual({ ...mod.loadKeys(s) }, { ...mod.KEY_DEF });
  });

  test("多出來的欄位不會帶進結果", () => {
    const s = fakeStore({ raw: JSON.stringify({ foul: "KeyQ", 奇怪欄位: "x", extra: "y" }) });
    const got = mod.loadKeys(s);
    assert.deepEqual(Object.keys(got).sort(), [...mod.KEY_ORDER].sort());
    assert.equal(got["奇怪欄位"], undefined);
  });

  test("getItem 拋錯（storage 被封鎖）回預設值", () => {
    const s = fakeStore({ throwOnGet: true });
    assert.doesNotThrow(() => mod.loadKeys(s));
    assert.deepEqual({ ...mod.loadKeys(s) }, { ...mod.KEY_DEF });
  });

  test("完整合法的設定原樣讀回", () => {
    const raw = JSON.stringify({ foul: "KeyA", skip: "KeyS", ok: "KeyD", undo: "KeyW" });
    const got = mod.loadKeys(fakeStore({ raw }));
    assert.deepEqual({ ...got }, { foul: "KeyA", skip: "KeyS", ok: "KeyD", undo: "KeyW" });
  });
});

describe("loadKeys：與原版行為比對（同一份 localStorage 內容）", () => {
  const raws = [
    null,
    "",
    "{}",
    "{不是 JSON",
    "null",
    "[]",
    JSON.stringify({ foul: "KeyQ" }),
    JSON.stringify({ foul: "KeyQ", skip: "KeyW", ok: "KeyE", undo: "KeyR" }),
    JSON.stringify({ foul: 123, skip: null }),
    JSON.stringify({ foul: "", skip: "" }),
    JSON.stringify({ 奇怪: "x" }),
  ];

  test("每一種 storage 內容，模組與原版結果一致", () => {
    for (const raw of raws) {
      /* 原版：把 raw 塞進沙箱的 localStorage，再重新載入一份 app.js 讓它跑 loadKeys() */
      const app = bootApp();
      if (raw !== null) app.store.set("beasttv.keys", raw);
      let want;
      try {
        want = JSON.parse(app.run("JSON.stringify(loadKeys())"));
      } catch (e) {
        want = { __threw: String(e.message) };
      }
      const got = { ...mod.loadKeys(fakeStore({ raw })) };
      assert.deepEqual(got, want, `raw=${JSON.stringify(raw)} 時不一致`);
    }
  });
});

// ── saveKeys ─────────────────────────────────────────────────────
describe("saveKeys：寫入與失敗降級", () => {
  test("寫入後可以讀回同一份內容", () => {
    const s = fakeStore();
    const keys = { foul: "KeyA", skip: "KeyS", ok: "KeyD", undo: "KeyW" };
    assert.equal(mod.saveKeys(keys, s), true);
    assert.deepEqual({ ...mod.loadKeys(s) }, keys);
  });

  test("寫入的鍵名是 beasttv.keys（外部契約，不可改）", () => {
    const s = fakeStore();
    mod.saveKeys({ ...mod.KEY_DEF }, s);
    assert.ok(s._map.has("beasttv.keys"), "鍵名必須是 beasttv.keys");
    assert.equal(mod.KEYS_STORAGE_KEY, "beasttv.keys");
  });

  test("寫入的是 JSON 字串", () => {
    const s = fakeStore();
    mod.saveKeys({ foul: "KeyQ" }, s);
    const raw = s._map.get("beasttv.keys");
    assert.equal(typeof raw, "string");
    assert.deepEqual(JSON.parse(raw), { foul: "KeyQ" });
  });

  test("setItem 拋錯（隱私模式）不拋錯，回 false", () => {
    const s = fakeStore({ throwOnSet: true });
    assert.doesNotThrow(() => mod.saveKeys({ ...mod.KEY_DEF }, s));
    assert.equal(mod.saveKeys({ ...mod.KEY_DEF }, s), false);
  });

  test("storage 不存在時回 false 不拋錯", () => {
    assert.doesNotThrow(() => mod.saveKeys({ ...mod.KEY_DEF }, null));
    assert.equal(mod.saveKeys({ ...mod.KEY_DEF }, null), false);
  });

  test("saveKeys 與原版寫出的內容完全相同", () => {
    /* 原版 saveKeys 寫的是全域 KKEYS；先改 KKEYS 再叫原版，比對寫出的字串 */
    const app = bootApp();
    app.run(`KKEYS.foul="KeyA"; KKEYS.skip="KeyS"; KKEYS.ok="KeyD"; KKEYS.undo="KeyW"; saveKeys();`);
    const want = app.store.get("beasttv.keys");

    const s = fakeStore();
    mod.saveKeys({ foul: "KeyA", skip: "KeyS", ok: "KeyD", undo: "KeyW" }, s);
    const got = s._map.get("beasttv.keys");

    assert.equal(got, want, "寫入的 JSON 字串必須逐字相同");
  });
});

// ── 模組邊界 ─────────────────────────────────────────────────────
describe("模組邊界：KKEYS / ACT_BY_CODE 沒有被搬進來", () => {
  test("模組不匯出 KKEYS", () => {
    assert.equal(mod.KKEYS, undefined, "KKEYS 是可變狀態，應留在 app.js");
  });

  test("模組不匯出 ACT_BY_CODE", () => {
    assert.equal(mod.ACT_BY_CODE, undefined, "ACT_BY_CODE 由 applyKeys 重建，應留在 app.js");
  });

  test("模組不匯出 applyKeys / renderKeyRows（它們碰 DOM）", () => {
    assert.equal(mod.applyKeys, undefined);
    assert.equal(mod.renderKeyRows, undefined);
  });

  test("載入模組不會碰到全域 localStorage", () => {
    /* 模組只在被呼叫且冇注入 store 時才讀全域，import 本身零副作用 */
    assert.equal(typeof mod.loadKeys, "function");
    assert.equal(typeof mod.saveKeys, "function");
  });
});
