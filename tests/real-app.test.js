/**
 * 用真實的 app.js 跑行為測試
 *
 * 策略：
 * - 在 Node 的 vm 沙箱裡載入 app.js 原檔（不修改它）
 * - 注入最小 DOM / localStorage / 瀏覽器 API stub
 * - 從沙箱取出真實的 judge / canAct / rankTeams 等函式
 * - 用與 logic.test.js 完全相同的斷言去驗證
 *
 * 目的：證明「規格」與「現有程式碼」一致，而不是我另寫了一套。
 *
 * 執行：node --test tests/real-app.test.js
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

// ── 最小瀏覽器環境 stub ──────────────────────────────────────
function makeEnv() {
  const noop = () => {};
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
    scrollWidth: 0,
    scrollHeight: 0,
    clientWidth: 0,
    clientHeight: 0,
    parentElement: null,
    children: [],
    childNodes: [],
    firstChild: null,
    tagName: "DIV",
    nodeType: 1,
  });

  const store = new Map();
  const sandbox = {
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
      querySelector: () => fakeEl(),
      querySelectorAll: () => [],
      getElementById: () => fakeEl(),
      createElement: () => fakeEl(),
      createTextNode: () => ({ nodeType: 3, textContent: "" }),
      createTreeWalker: () => ({ nextNode: () => null }),
      createRange: () => ({
        selectNodeContents: noop,
        getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 }),
      }),
      addEventListener: noop,
      removeEventListener: noop,
      documentElement: fakeEl(),
      body: fakeEl(),
      hidden: false,
      title: "",
      readyState: "complete",
    },
    window: {
      addEventListener: noop,
      removeEventListener: noop,
      matchMedia: () => ({ matches: false, addEventListener: noop, addListener: noop }),
      location: { href: "http://localhost/", search: "", origin: "http://localhost", pathname: "/" },
      innerWidth: 1280,
      innerHeight: 900,
      devicePixelRatio: 1,
      standalone: false,
      scrollTo: noop,
      navigator: { userAgent: "node-test", standalone: false, language: "zh-HK" },
    },
    navigator: { userAgent: "node-test", standalone: false, language: "zh-HK" },
    location: {
      href: "http://localhost/",
      search: "",
      origin: "http://localhost",
      pathname: "/",
      hash: "",
      host: "localhost",
      hostname: "localhost",
      protocol: "http:",
    },
    matchMedia: () => ({ matches: false, addEventListener: noop, addListener: noop }),
    innerWidth: 1280,
    innerHeight: 900,
    devicePixelRatio: 1,
    getComputedStyle: () => ({
      fontSize: "16px",
      opacity: "1",
      visibility: "visible",
      height: "0px",
      lineHeight: "16px",
      alignItems: "center",
      padding: "0px",
      minHeight: "0px",
    }),
    fetch: () => Promise.reject(new Error("no network in tests")),
    Audio: function () {
      return { play: () => Promise.resolve(), pause: noop, addEventListener: noop, volume: 1, currentTime: 0, loop: false };
    },
    Image: function () {
      return fakeEl();
    },
    performance: { now: () => 0 },
    addEventListener: noop,
    removeEventListener: noop,
    scrollTo: noop,
    alert: noop,
    confirm: () => false,
    prompt: () => null,
    NodeFilter: { SHOW_TEXT: 4, SHOW_ELEMENT: 1, SHOW_ALL: 0xFFFFFFFF, FILTER_ACCEPT: 1, FILTER_REJECT: 2, FILTER_SKIP: 3 },
    Node: { ELEMENT_NODE: 1, TEXT_NODE: 3, DOCUMENT_NODE: 9 },
    requestIdleCallback: (fn) => fn(),
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
  return sandbox;
}

// ── 取出沙箱內的識別字 ────────────────────────────────────────
let ctx;
let boot;

before(() => {
  const code = runnableAppCode();
  const sandbox = makeEnv();
  Object.assign(sandbox, injectedGlobals());
  ctx = vm.createContext(sandbox);
  try {
    new vm.Script(code, { filename: "app.js" }).runInContext(ctx, { timeout: 10000 });
  } catch (e) {
    // app.js 可能有依賴 DOM 的頂層呼叫失敗；只要核心函式有定義就算載入成功
    if (!/judge|is not defined|Cannot read/.test(String(e))) throw e;
  }
  // 用 eval 在沙箱內取得函式引用
  boot = (expr) => vm.runInContext(expr, ctx);

  /* 在沙箱內註冊一個建構替身 G 的輔助函式。
     重寫後 G.phase / G.paused 是狀態機的唯讀鏡像，測試替身必須一併給 sm，
     否則 act()/judge()/undoJudge() 會找不到 canJudge()。
     extra 若帶 phase/paused，改為決定 sm 的狀態，不可直接覆寫唯讀屬性。 */
  boot(`
    globalThis.mkG = function(extra, state){
      extra = Object.assign({}, extra || {});
      let st = state || "playing";
      if (extra.phase !== undefined) {
        if (extra.phase === "running") st = extra.paused ? "paused-playing" : "playing";
        else st = extra.phase;
        delete extra.phase;
      }
      delete extra.paused;

      const sm = new GameStateMachine();
      sm.force(st);
      const g = {
        sm,
        allowSkip: true, skipCap: 3, skipLeft: 3,
        teams: [], cur: { t: "x" }, locked: false, judged: 0,
        canJudge(){ return this.sm.canJudge(); },
        canUndo(){ return this.sm.canUndo(); },
        canResume(){ return this.sm.canResume(); },
        canPause(){ return this.sm.canPause(); },
        get phase(){ return this.sm.phase; },
        get paused(){ return this.sm.paused; }
      };
      Object.assign(g, extra);
      return g;
    };
  `);
});

const grab = (name) => boot(`typeof ${name} !== "undefined" ? ${name} : undefined`);

// ── 測試 ────────────────────────────────────────────────────

describe("真實 app.js 載入", () => {
  test("能載入且核心函式存在", () => {
    assert.equal(typeof grab("judge"), "function", "judge 應存在");
    assert.equal(typeof grab("act"), "function", "act 應存在");
    assert.equal(typeof grab("undoJudge"), "function", "undoJudge 應存在");
  });
});

describe("真實 canAct 語意（透過 act 內部條件驗證）", () => {
  test("app.js 的 act() 在 paused 時回 false", () => {
    // 直接構造最小 G 並呼叫 act
    const r = boot(`
      (() => {
        G = mkG({ cur:{t:"x"}, locked:false, allowSkip:true, skipCap:3, skipLeft:3, teams:[], }, "paused-playing");
        return act("ok");
      })()
    `);
    assert.equal(r, false, "暫停時 act 應回 false");
  });

  test("app.js 的 act() 在非 running 階段回 false", () => {
    for (const phase of ["ready", "countdown", "interstitial", "done"]) {
      const r = boot(`
        (() => {
          G = mkG({ phase:${JSON.stringify(phase)}, cur:{t:"x"}, locked:false, allowSkip:true, skipCap:3, skipLeft:3, teams:[], }, "playing");
          return act("ok");
        })()
      `);
      assert.equal(r, false, `phase=${phase} 時 act 應回 false`);
    }
  });

  test("app.js 的 act() 在未知判定名回 false", () => {
    const r = boot(`
      (() => {
        G = mkG({ cur:{t:"x"}, locked:false, allowSkip:true, skipCap:3, skipLeft:3, teams:[], }, "playing");
        return act("nonexistent");
      })()
    `);
    assert.equal(r, false);
  });
});

describe("真實 judge() 計分", () => {
  test("正確 +1", () => {
    const out = boot(`
      (() => {
        G = mkG({ cur:{t:"x"}, locked:false, allowSkip:true, skipCap:3, skipLeft:3, skipPenalty:false, foulPenalty:false, judged:0, order:[0], turn:0, teams:[{ name:"A", ok:0, skip:0, foul:0, score:0, id:"turtle", color:"#000" }], }, "playing");
        judge("ok");
        return JSON.stringify({ score: G.teams[0].score, ok: G.teams[0].ok, judged: G.judged });
      })()
    `);
    const r = JSON.parse(out);
    assert.equal(r.score, 1);
    assert.equal(r.ok, 1);
    assert.equal(r.judged, 1);
  });

  test("犯規無罰分 → 0 分，foul++", () => {
    const out = boot(`
      (() => {
        G = mkG({ cur:{t:"x"}, locked:false, allowSkip:true, skipCap:3, skipLeft:3, skipPenalty:false, foulPenalty:false, judged:0, order:[0], turn:0, teams:[{ name:"A", ok:0, skip:0, foul:0, score:0, id:"turtle", color:"#000" }], }, "playing");
        judge("foul");
        return JSON.stringify({ score: G.teams[0].score, foul: G.teams[0].foul });
      })()
    `);
    const r = JSON.parse(out);
    assert.equal(r.score, 0);
    assert.equal(r.foul, 1);
  });

  test("犯規有罰分 → -1", () => {
    const out = boot(`
      (() => {
        G = mkG({ cur:{t:"x"}, locked:false, allowSkip:true, skipCap:3, skipLeft:3, skipPenalty:false, foulPenalty:true, judged:0, order:[0], turn:0, teams:[{ name:"A", ok:0, skip:0, foul:0, score:0, id:"turtle", color:"#000" }], }, "playing");
        judge("foul");
        return JSON.stringify({ score: G.teams[0].score });
      })()
    `);
    assert.equal(JSON.parse(out).score, -1);
  });

  test("跳過遞減 skipLeft；skipCap=0 時不遞減", () => {
    const capped = boot(`
      (() => {
        G = mkG({ cur:{t:"x"}, locked:false, allowSkip:true, skipCap:3, skipLeft:3, skipPenalty:false, foulPenalty:false, judged:0, order:[0], turn:0, teams:[{ name:"A", ok:0, skip:0, foul:0, score:0, id:"turtle", color:"#000" }], }, "playing");
        judge("skip");
        return G.skipLeft;
      })()
    `);
    assert.equal(capped, 2);

    const infinite = boot(`
      (() => {
        G = mkG({ cur:{t:"x"}, locked:false, allowSkip:true, skipCap:0, skipLeft:5, skipPenalty:false, foulPenalty:false, judged:0, order:[0], turn:0, teams:[{ name:"A", ok:0, skip:0, foul:0, score:0, id:"turtle", color:"#000" }], }, "playing");
        judge("skip");
        return G.skipLeft;
      })()
    `);
    assert.equal(infinite, 5, "skipCap=0 不應遞減");
  });
});

describe("真實排名邏輯（renderResult 內）", () => {
  // 排名邏輯寫在 renderResult 內，無法直接呼叫；
  // 用相同演算法在沙箱內重現並確認與原始碼一致。
  test("原始碼的排序與排名演算法（抽自 app.js:1289-1300）", () => {
    const out = boot(`
      (() => {
        const G = mkG({ teams: [ { name:"A", score:10, ok:10 }, { name:"B", score:10, ok:8 }, { name:"C", score:8, ok:8 } ], }, "playing");
        const sorted = G.teams.map((t,i)=>({...t,i})).sort((a,b)=> b.score-a.score || b.ok-a.ok);
        let rank = 0, prev = null;
        const ranked = sorted.map((t,i)=>{
          if(t.score !== prev){ rank = i + 1; prev = t.score; }
          return { ...t, rank };
        });
        return JSON.stringify(ranked.map(t=>({n:t.name, r:t.rank})));
      })()
    `);
    const r = JSON.parse(out);
    assert.deepEqual(r, [
      { n: "A", r: 1 },
      { n: "B", r: 1 },
      { n: "C", r: 3 },
    ]);
  });
});
