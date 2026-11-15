/**
 * localStorage 存取層測試
 *
 * 三層驗證：
 * 1. 契約：五個鍵名必須與 app.js 原始碼裡的字面值一字不差
 * 2. 對等：用沙箱載入真 app.js，直接呼叫原版的 store.get / store.set /
 *    TOKEN() / loadKeys() / saveReportLocal()，與本模組逐項比對
 * 3. 降級：storage 拋錯時不拋出、回預設值
 *
 * 執行：node --test tests/storage.test.js
 */
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const APP_JS = resolve(ROOT, "app.js");
const APP_SRC = readFileSync(APP_JS, "utf8");
const noop = () => {};

const storage = await import("../src/storage.js");
const { KEYS } = storage;

/* ══════════════════════════════════════════════════════════
   沙箱：載入真 app.js，保留原版函式供直接呼叫
   ══════════════════════════════════════════════════════════ */

function makeEl(o = {}) {
  return Object.assign(
    {
      classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
      style: { setProperty: noop },
      dataset: {},
      setAttribute: noop,
      getAttribute: () => null,
      hasAttribute: () => false,
      removeAttribute: noop,
      appendChild: noop,
      append: noop,
      addEventListener: noop,
      removeEventListener: noop,
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
}

/**
 * 建立一個載入了真 app.js 的沙箱。
 * @param {object} seed 預先寫入的 storage 內容
 * @param {object} [opts] { throwOnGet, throwOnSet }
 */
function makeSandbox(seed = {}, opts = {}) {
  const store = new Map(Object.entries(seed));
  const ls = {
    getItem(k) {
      if (opts.throwOnGet) throw new Error("SecurityError: storage blocked");
      return store.has(k) ? store.get(k) : null;
    },
    setItem(k, v) {
      if (opts.throwOnSet) throw new Error("QuotaExceededError");
      store.set(k, String(v));
    },
    removeItem(k) {
      if (opts.throwOnRemove) throw new Error("SecurityError");
      store.delete(k);
    },
  };
  const sb = {
    console: { log: noop, warn: noop, error: noop, info: noop },
    setTimeout: () => 0,
    clearTimeout: noop,
    setInterval: () => 0,
    clearInterval: noop,
    requestAnimationFrame: () => 0,
    localStorage: ls,
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
      title: "",
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
    location: { href: "http://localhost/", pathname: "/", search: "" },
    matchMedia: () => ({ matches: false, addEventListener: noop }),
    innerWidth: 1280,
    innerHeight: 900,
    devicePixelRatio: 1,
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
    URL,
    URLSearchParams,
    Date,
    Math,
    JSON,
    Promise,
    String,
    Number,
    Array,
    Object,
  };
  sb.globalThis = sb;
  const ctx = vm.createContext(sb);
  try {
    new vm.Script(APP_SRC).runInContext(ctx, { timeout: 15000 });
  } catch (e) {
    /* app.js 在假 DOM 下會在初始化階段拋錯，這是預期的；
       只要它跑到我們要比對的函式定義為止就算載入成功。 */
    if (!/is not (defined|a function)|Cannot read|Cannot set|not a constructor/.test(String(e.message))) {
      throw e;
    }
  }
  return { ctx, store, run: (code) => vm.runInContext(code, ctx) };
}

/* 一次性沙箱：僅用來確認原版函式存在且可呼叫 */
const probe = makeSandbox({});
const hasOriginal = {
  TOKEN: probe.run('typeof TOKEN === "function"'),
  loadKeys: probe.run('typeof loadKeys === "function"'),
  saveReportLocal: probe.run('typeof saveReportLocal === "function"'),
  store: probe.run('typeof store === "object" && typeof store.get === "function"'),
  BRAND_KEY: probe.run('typeof BRAND_KEY !== "undefined"'),
  LANG_KEY: probe.run('typeof LANG_KEY !== "undefined"'),
};

/* ══════════════════════════════════════════════════════════
   1. 鍵名契約：與 app.js 原始碼字面值一字不差
   ══════════════════════════════════════════════════════════ */

describe("鍵名與原 app.js 一字不差", () => {
  test("原版函式已在沙箱中可用（比對前提）", () => {
    assert.equal(hasOriginal.TOKEN, true, "找不到原版 TOKEN()，無法比對");
    assert.equal(hasOriginal.loadKeys, true, "找不到原版 loadKeys()");
    assert.equal(hasOriginal.saveReportLocal, true, "找不到原版 saveReportLocal()");
    assert.equal(hasOriginal.store, true, "找不到原版 store 物件");
  });

  test("五個鍵名逐字取自 app.js 原始碼", () => {
    /* 直接從原始碼 regex 抽字面值，不是我重打的 */
    const langLit = APP_SRC.match(/const LANG_KEY\s*=\s*"([^"]+)"/)?.[1];
    const tokenLit = APP_SRC.match(/localStorage\.getItem\("(beasttv\.token)"\)/)?.[1];
    const keysLit = APP_SRC.match(/localStorage\.getItem\("(beasttv\.keys)"\)/)?.[1];
    const reportsLit = APP_SRC.match(/const k\s*=\s*"(beasttv\.reports)"/)?.[1];
    const brandLit = APP_SRC.match(/const BRAND_KEY\s*=\s*"([^"]+)"/)?.[1];

    assert.equal(KEYS.LANG, langLit, "LANG 鍵名不符");
    assert.equal(KEYS.TOKEN, tokenLit, "TOKEN 鍵名不符");
    assert.equal(KEYS.KEYS, keysLit, "KEYS 鍵名不符");
    assert.equal(KEYS.REPORTS, reportsLit, "REPORTS 鍵名不符");
    assert.equal(KEYS.BRAND, brandLit, "BRAND 鍵名不符");
  });

  test("鍵名精確值（防止上面 regex 全部抓到 undefined 而假通過）", () => {
    assert.equal(KEYS.LANG, "beasttv.lang");
    assert.equal(KEYS.TOKEN, "beasttv.token");
    assert.equal(KEYS.KEYS, "beasttv.keys");
    assert.equal(KEYS.REPORTS, "beasttv.reports");
    assert.equal(KEYS.BRAND, "beastbrand.v1");
  });

  test("沙箱內常數與本模組相同", () => {
    assert.equal(probe.run("LANG_KEY"), KEYS.LANG);
    assert.equal(probe.run("BRAND_KEY"), KEYS.BRAND);
  });

  test("鍵名互不重複、物件凍結", () => {
    const vals = Object.values(KEYS);
    assert.equal(new Set(vals).size, 5, "鍵名有重複");
    assert.equal(Object.isFrozen(KEYS), true, "KEYS 應凍結，避免執行期改動外部契約");
  });

  test("上限常數與原版 slice(-10) 一致", () => {
    assert.match(APP_SRC, /arr\.slice\(-10\)/, "原版應為 slice(-10)");
    assert.equal(storage.REPORTS_LIMIT, 10);
  });
});

/* ══════════════════════════════════════════════════════════
   2. 與原版 store.get / store.set 逐項對等
   ══════════════════════════════════════════════════════════ */

/** 測試矩陣：涵蓋空值、空字串、合法 JSON、損壞 JSON、超長、中文 */
const VALUE_MATRIX = [
  ["不存在", undefined],
  ["空字串", ""],
  ["零", "0"],
  ["空物件", "{}"],
  ["空陣列", "[]"],
  ["物件", '{"a":1,"b":"x"}'],
  ["陣列", "[1,2,3]"],
  ["布林 true", "true"],
  ["布林 false", "false"],
  ["null", "null"],
  ["數字字串", "42"],
  ["損壞 JSON：{", "{"],
  ["損壞 JSON：]", "]"],
  ["損壞 JSON：{a:1}", "{a:1}"],
  ["純文字", "hello"],
  ["中文", "百獸台"],
  ["超長 5000 字", "x".repeat(5000)],
  ["巢狀", '{"t":"百獸台","s":{"deep":[1,2,{"k":null}]}}'],
];

describe("readJson / writeJson 與原版 store 逐項對等", () => {
  for (const [label, raw] of VALUE_MATRIX) {
    test(`store.get 對 ${label} 的行為相同`, () => {
      const seed = raw === undefined ? {} : { probe: raw };
      const { run } = makeSandbox(seed);
      const expected = run('store.get("probe", "DEFAULT")');
      globalThis.localStorage = makeFakeLs(seed);
      const actual = storage.readJson("probe", "DEFAULT");
      assert.deepEqual(actual, expected, `readJson 與 store.get 在「${label}」不一致`);
    });
  }

  test("store.set 寫入結果與 writeJson 相同", () => {
    for (const [, raw] of VALUE_MATRIX) {
      if (raw === undefined) continue;
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        continue; // 原版 set 只寫入可序列化的值，損壞 JSON 不是合法輸入
      }
      const a = makeSandbox({});
      a.run(`store.set("probe", ${raw})`);
      const sb = makeFakeLs({});
      globalThis.localStorage = sb;
      storage.writeJson("probe", parsed);
      assert.equal(sb.store.get("probe"), a.store.get("probe"), `writeJson 與 store.set 不一致（raw=${raw}）`);
    }
  });
});

/* 簡易 localStorage 替身，供本模組直接測試 */
function makeFakeLs(seed = {}, opts = {}) {
  const store = new Map(Object.entries(seed));
  const api = {
    store,
    getItem(k) {
      if (opts.throwOnGet) throw new Error("SecurityError: blocked");
      return store.has(k) ? store.get(k) : null;
    },
    setItem(k, v) {
      if (opts.throwOnSet) throw new Error("QuotaExceededError");
      store.set(k, String(v));
    },
    removeItem(k) {
      if (opts.throwOnRemove) throw new Error("SecurityError");
      store.delete(k);
    },
  };
  return api;
}

/* ══════════════════════════════════════════════════════════
   3. 語言：與原版初始化邏輯逐項對等
   ══════════════════════════════════════════════════════════ */

describe("getLang 與原版一致", () => {
  const LANG_SEEDS = [
    ["不存在", undefined],
    ["en", "en"],
    ["zh", "zh"],
    ["大寫 EN", "EN"],
    ["未知值 xx", "xx"],
    ["空字串", ""],
    ["含空白 en ", " en"],
    ["中文 en 混雜", "zh-Hant"],
  ];

  for (const [label, raw] of LANG_SEEDS) {
    test(`localStorage=${label} → 與原版 LANG 相同`, () => {
      const seed = raw === undefined ? {} : { [KEYS.LANG]: raw };
      const { run } = makeSandbox(seed);
      const original = run("LANG");
      globalThis.localStorage = makeFakeLs(seed);
      assert.equal(storage.getLang(), original, `getLang 與原版 LANG 在「${label}」不一致`);
    });
  }

  test("setLang 正規化：只有 en 存 en，其餘存 zh", () => {
    for (const [input, expected] of [
      ["en", "en"],
      ["zh", "zh"],
      ["EN", "zh"],
      ["xx", "zh"],
      ["", "zh"],
      [null, "zh"],
      [undefined, "zh"],
      [0, "zh"],
      [true, "zh"],
    ]) {
      const sb = makeFakeLs({});
      globalThis.localStorage = sb;
      assert.equal(storage.setLang(input), expected, `setLang(${String(input)}) 應正規化為 ${expected}`);
      assert.equal(sb.store.get(KEYS.LANG), expected);
    }
  });

  test("讀回剛寫入的值", () => {
    globalThis.localStorage = makeFakeLs({});
    storage.setLang("en");
    assert.equal(storage.getLang(), "en");
    storage.setLang("zh");
    assert.equal(storage.getLang(), "zh");
  });
});

/* ══════════════════════════════════════════════════════════
   4. Token：與原版 TOKEN() 逐項對等
   ══════════════════════════════════════════════════════════ */

describe("getToken 與原版 TOKEN() 一致", () => {
  const TOKEN_SEEDS = [
    ["不存在", undefined],
    ["正常 token", "abc123"],
    ["空字串", ""],
    ["含空白", " tok "],
    ["超長", "t".repeat(4000)],
    ["特殊字元", "a.b-c_d~e+f/g="],
  ];

  for (const [label, raw] of TOKEN_SEEDS) {
    test(`localStorage=${label} → 與原版 TOKEN() 相同`, () => {
      const seed = raw === undefined ? {} : { [KEYS.TOKEN]: raw };
      const { run } = makeSandbox(seed);
      const original = run("TOKEN()");
      globalThis.localStorage = makeFakeLs(seed);
      assert.equal(storage.getToken(), original, `getToken 與原版在「${label}」不一致`);
    });
  }

  test("setToken → getToken 往返", () => {
    globalThis.localStorage = makeFakeLs({});
    assert.equal(storage.setToken("newtok"), true);
    assert.equal(storage.getToken(), "newtok");
    assert.equal(storage.getToken(), "newtok");
  });

  test("clearToken 後回空字串（原版 removeItem 後 TOKEN() 也是 \"\"）", () => {
    const sb = makeFakeLs({ [KEYS.TOKEN]: "old" });
    globalThis.localStorage = sb;
    storage.clearToken();
    assert.equal(storage.getToken(), "");
    assert.equal(sb.store.has(KEYS.TOKEN), false);
  });
});

/* ══════════════════════════════════════════════════════════
   5. 按鍵設定的原始讀寫（結構驗證在 src/keys.js）
   ══════════════════════════════════════════════════════════ */

describe("getKeysRaw 與原版 loadKeys 的取值基礎一致", () => {
  test("損壞 JSON 回空物件（原版回 {} 再套 KEY_DEF）", () => {
    globalThis.localStorage = makeFakeLs({ [KEYS.KEYS]: "{bad" });
    assert.deepEqual(storage.getKeysRaw(), {});
  });

  test("不存在時回空物件", () => {
    globalThis.localStorage = makeFakeLs({});
    assert.deepEqual(storage.getKeysRaw(), {});
  });

  test("合法物件原樣返回（不合併 KEY_DEF，交由 keys.js 處理）", () => {
    globalThis.localStorage = makeFakeLs({ [KEYS.KEYS]: '{"foul":"KeyA"}' });
    assert.deepEqual(storage.getKeysRaw(), { foul: "KeyA" });
  });

  test("非字串欄位原樣返回（型別檢查在 keys.js）", () => {
    globalThis.localStorage = makeFakeLs({ [KEYS.KEYS]: '{"foul":123,"skip":null}' });
    assert.deepEqual(storage.getKeysRaw(), { foul: 123, skip: null });
  });

  test("setKeysRaw → getKeysRaw 往返", () => {
    globalThis.localStorage = makeFakeLs({});
    const keys = { foul: "KeyA", skip: "KeyS", ok: "KeyD", undo: "KeyW" };
    assert.equal(storage.setKeysRaw(keys), true);
    assert.deepEqual(storage.getKeysRaw(), keys);
  });

  test("與原版 loadKeys 在相同輸入下的取值基礎相同", () => {
    const seeds = ['{"foul":"KeyA"}', "{bad", "", '{"foul":123}', "[]", "null"];
    for (const raw of seeds) {
      const { run } = makeSandbox(raw ? { [KEYS.KEYS]: raw } : {});
      const original = JSON.parse(run("JSON.stringify(loadKeys())"));
      globalThis.localStorage = makeFakeLs(raw ? { [KEYS.KEYS]: raw } : {});
      const mineRaw = storage.getKeysRaw();
      /* 原版 loadKeys = KEY_DEF 當底 + 合法字串欄位覆蓋。這裡只要證明
         「本模組回的原始值」套上同一規則後等於原版輸出即可。 */
      const KEY_DEF = { foul: "ArrowLeft", skip: "ArrowDown", ok: "ArrowRight", undo: "ArrowUp" };
      const rebuilt = { ...KEY_DEF };
      if (mineRaw && typeof mineRaw === "object" && !Array.isArray(mineRaw)) {
        for (const k of ["foul", "skip", "ok", "undo"]) {
          if (typeof mineRaw[k] === "string" && mineRaw[k]) rebuilt[k] = mineRaw[k];
        }
      }
      assert.deepEqual(rebuilt, original, `raw=${raw} 時取值基礎與原版 loadKeys 不同`);
    }
  });
});

/* ══════════════════════════════════════════════════════════
   6. 品牌
   ══════════════════════════════════════════════════════════ */

describe("品牌快取", () => {
  test("不存在時回 null（原版 `if(c && c.t)` 依此判空）", () => {
    globalThis.localStorage = makeFakeLs({});
    assert.equal(storage.getBrand(), null);
  });

  test("損壞 JSON 回 null 不拋錯", () => {
    globalThis.localStorage = makeFakeLs({ [KEYS.BRAND]: "{oops" });
    assert.equal(storage.getBrand(), null);
  });

  test("合法物件原樣返回", () => {
    globalThis.localStorage = makeFakeLs({ [KEYS.BRAND]: '{"t":"甲","s":"乙"}' });
    assert.deepEqual(storage.getBrand(), { t: "甲", s: "乙" });
  });

  test("setBrand → getBrand 往返", () => {
    globalThis.localStorage = makeFakeLs({});
    assert.equal(storage.setBrand({ t: "百獸台", s: "派對" }), true);
    assert.deepEqual(storage.getBrand(), { t: "百獸台", s: "派對" });
  });

  test("clearBrand 後回 null", () => {
    globalThis.localStorage = makeFakeLs({ [KEYS.BRAND]: '{"t":"x"}' });
    storage.clearBrand();
    assert.equal(storage.getBrand(), null);
  });
});

/* ══════════════════════════════════════════════════════════
   7. 問題回報：上限與原版 saveReportLocal 逐項對等
   ══════════════════════════════════════════════════════════ */

describe("問題回報 10 筆上限", () => {
  test("追加 15 筆只保留最後 10 筆", () => {
    const sb = makeFakeLs({});
    globalThis.localStorage = sb;
    for (let i = 0; i < 15; i++) storage.addReport({ i });
    const saved = JSON.parse(sb.store.get(KEYS.REPORTS));
    assert.equal(saved.length, 10, "應只保留 10 筆");
    assert.equal(saved[0].i, 5, "應保留最新 10 筆（從第 5 筆開始）");
    assert.equal(saved[9].i, 14, "最後一筆應是最新的");
  });

  test("不足 10 筆時全留", () => {
    const sb = makeFakeLs({});
    globalThis.localStorage = sb;
    storage.addReport({ a: 1 });
    storage.addReport({ a: 2 });
    assert.equal(JSON.parse(sb.store.get(KEYS.REPORTS)).length, 2);
  });

  test("既有內容是損壞 JSON → 不寫入（與原版 try/catch 吞掉一致）", () => {
    const sb = makeFakeLs({ [KEYS.REPORTS]: "{broken" });
    globalThis.localStorage = sb;
    const ok = storage.addReport({ x: 1 });
    assert.equal(ok, false, "原版解析失敗會放棄整筆，回傳 false");
    assert.equal(sb.store.get(KEYS.REPORTS), "{broken", "storage 應原封不動");
  });

  test("既有內容不是陣列 → 不寫入（原版 push 拋錯被吞）", () => {
    const sb = makeFakeLs({ [KEYS.REPORTS]: '{"notArray":true}' });
    globalThis.localStorage = sb;
    assert.equal(storage.addReport({ x: 1 }), false);
    assert.equal(sb.store.get(KEYS.REPORTS), '{"notArray":true}');
  });

  test("getItem 拋錯但 setItem 成功 → 整筆放棄（原版直接存取，例外跳 catch）", () => {
    /* 這條是 Chief 親自重現的分歧：原版 L1168 直接 localStorage.getItem()，
       拋錯時整段跳進 catch、不寫入；若改用 readRaw() 會把降級成 [] 後照常寫入。
       模組必須照原版字面直接存取，不能吞掉 getItem 的例外。 */
    const sb = makeFakeLs({}, { throwOnGet: true });
    globalThis.localStorage = sb;
    const ok = storage.addReport({ x: 1 });
    assert.equal(ok, false, "getItem 拋錯時應放棄整筆");
    assert.equal(sb.store.get(KEYS.REPORTS), undefined, "storage 不應被寫入");
  });

  test("與原版 saveReportLocal 逐項對等", () => {
    const cases = [
      ["空", {}],
      ["已有 3 筆", { [KEYS.REPORTS]: JSON.stringify([{ i: 0 }, { i: 1 }, { i: 2 }]) }],
      ["已有 12 筆", { [KEYS.REPORTS]: JSON.stringify(Array.from({ length: 12 }, (_, i) => ({ i }))) }],
      ["損壞 JSON", { [KEYS.REPORTS]: "{broken" }],
      ["物件非陣列", { [KEYS.REPORTS]: '{"a":1}' }],
      ["空字串", { [KEYS.REPORTS]: "" }],
    ];
    for (const [label, seed] of cases) {
      const a = makeSandbox(seed);
      a.run('saveReportLocal({tag:"new"})');
      const expected = a.store.get(KEYS.REPORTS) ?? null;

      const sb = makeFakeLs(seed);
      globalThis.localStorage = sb;
      storage.addReport({ tag: "new" });
      const actual = sb.store.get(KEYS.REPORTS) ?? null;

      assert.equal(actual, expected, `「${label}」時與原版 saveReportLocal 結果不同`);
    }
  });

  test("getReports 損壞時回空陣列、非陣列也回空陣列", () => {
    globalThis.localStorage = makeFakeLs({ [KEYS.REPORTS]: "{bad" });
    assert.deepEqual(storage.getReports(), []);
    globalThis.localStorage = makeFakeLs({ [KEYS.REPORTS]: '{"a":1}' });
    assert.deepEqual(storage.getReports(), []);
    globalThis.localStorage = makeFakeLs({});
    assert.deepEqual(storage.getReports(), []);
  });

  test("clearReports 後回空陣列", () => {
    globalThis.localStorage = makeFakeLs({ [KEYS.REPORTS]: "[1,2]" });
    storage.clearReports();
    assert.deepEqual(storage.getReports(), []);
  });
});

/* ══════════════════════════════════════════════════════════
   8. 降級：storage 拋錯時不拋出
   ══════════════════════════════════════════════════════════ */

describe("寫入失敗不拋錯（隱私模式 / 配額用盡）", () => {
  const writers = [
    ["setToken", () => storage.setToken("t")],
    ["setKeysRaw", () => storage.setKeysRaw({ foul: "KeyA" })],
    ["setBrand", () => storage.setBrand({ t: "x" })],
    ["addReport", () => storage.addReport({ x: 1 })],
    ["writeRaw", () => storage.writeRaw("any", "v")],
    ["writeJson", () => storage.writeJson("any", { a: 1 })],
  ];

  for (const [name, fn] of writers) {
    test(`${name} 在 setItem 拋錯時不拋，並回 false`, () => {
      globalThis.localStorage = makeFakeLs({}, { throwOnSet: true });
      assert.doesNotThrow(fn, `${name} 不應把 storage 例外往上拋`);
      assert.equal(fn(), false, `${name} 應回報失敗`);
    });
  }

  test("setLang 在 setItem 拋錯時不拋（回正規化語言而非 false，與原版一致）", () => {
    globalThis.localStorage = makeFakeLs({}, { throwOnSet: true });
    assert.doesNotThrow(() => storage.setLang("en"));
    assert.equal(storage.setLang("en"), "en");
  });

  test("setLang 即使寫入失敗仍回傳正規化語言（原版也是先設 LANG 再吞例外）", () => {
    globalThis.localStorage = makeFakeLs({}, { throwOnSet: true });
    assert.equal(storage.setLang("en"), "en");
  });
});

describe("讀取失敗不拋錯", () => {
  const readers = [
    ["getLang", () => storage.getLang()],
    ["getToken", () => storage.getToken()],
    ["getKeysRaw", () => storage.getKeysRaw()],
    ["getBrand", () => storage.getBrand()],
    ["getReports", () => storage.getReports()],
    ["readRaw", () => storage.readRaw("any")],
    ["readJson", () => storage.readJson("any", "D")],
  ];

  for (const [name, fn] of readers) {
    test(`${name} 在 getItem 拋錯時不拋`, () => {
      globalThis.localStorage = makeFakeLs({}, { throwOnGet: true });
      assert.doesNotThrow(fn, `${name} 不應把 storage 例外往上拋`);
      fn();
    });
  }

  test("讀取失敗時回各自的預設值", () => {
    globalThis.localStorage = makeFakeLs({}, { throwOnGet: true });
    assert.equal(storage.getLang(), "zh");
    assert.equal(storage.getToken(), "");
    assert.deepEqual(storage.getKeysRaw(), {});
    assert.equal(storage.getBrand(), null);
    assert.deepEqual(storage.getReports(), []);
    assert.equal(storage.readRaw("any"), null);
    assert.equal(storage.readJson("any", "D"), "D");
  });
});

describe("localStorage 完全不存在時（SSR / 被沙箱封鎖）", () => {
  test("所有讀取回預設值", () => {
    globalThis.localStorage = undefined;
    assert.equal(storage.getLang(), "zh");
    assert.equal(storage.getToken(), "");
    assert.deepEqual(storage.getKeysRaw(), {});
    assert.equal(storage.getBrand(), null);
    assert.deepEqual(storage.getReports(), []);
  });

  test("所有寫入回 false 不拋錯", () => {
    globalThis.localStorage = undefined;
    assert.equal(storage.setToken("t"), false);
    assert.equal(storage.setBrand({ t: "x" }), false);
    assert.equal(storage.addReport({ x: 1 }), false);
    assert.equal(storage.writeRaw("k", "v"), false);
  });

  test("localStorage getter 本身拋錯時也降級", () => {
    const orig = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("SecurityError: blocked by policy");
      },
    });
    try {
      assert.equal(storage.getToken(), "");
      assert.equal(storage.getLang(), "zh");
      assert.doesNotThrow(() => storage.setToken("t"));
    } finally {
      Object.defineProperty(globalThis, "localStorage", { configurable: true, writable: true, value: orig });
    }
  });
});

/* ══════════════════════════════════════════════════════════
   9. 每次呼叫都重新取 localStorage（不快取節點）
   ══════════════════════════════════════════════════════════ */

describe("不快取 storage 節點", () => {
  test("換掉 localStorage 後立即生效", () => {
    const a = makeFakeLs({ [KEYS.TOKEN]: "first" });
    globalThis.localStorage = a;
    assert.equal(storage.getToken(), "first");

    const b = makeFakeLs({ [KEYS.TOKEN]: "second" });
    globalThis.localStorage = b;
    assert.equal(storage.getToken(), "second", "模組不應快取舊的 localStorage");
  });
});

/* ══════════════════════════════════════════════════════════
   復原全域狀態
   ══════════════════════════════════════════════════════════ */

beforeEach(() => {
  globalThis.localStorage = makeFakeLs({});
});
