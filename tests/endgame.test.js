/**
 * 用真實 endGame() 驗證排名（不複製演算法，直接跑原始碼）
 *
 * 手法：在沙箱內把 #rankList 換成可記錄的假元素，
 * 呼叫真的 endGame()，然後檢查它實際寫入的名次。
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

function makeEl(over = {}) {
  const el = {
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
    clientWidth: 0,
    clientHeight: 0,
    parentElement: null,
    children: [],
    childNodes: [],
    firstChild: null,
    tagName: "DIV",
    nodeType: 1,
    ...over,
  };
  return el;
}

let ctx;
let captured = {};

before(() => {
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
      querySelector: (sel) => {
        if (sel === "#rankList") return captured.rankList;
        if (sel === "#rSub") return captured.rSub;
        if (sel === "#confetti") return makeEl();
        return makeEl();
      },
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
      removeEventListener: noop,
      documentElement: makeEl(),
      body: makeEl(),
      hidden: false,
      readyState: "complete",
    },
    window: {
      addEventListener: noop,
      matchMedia: () => ({ matches: false, addEventListener: noop, addListener: noop }),
      location: { href: "http://localhost/", search: "", pathname: "/", origin: "http://localhost" },
      innerWidth: 1280,
      innerHeight: 900,
      devicePixelRatio: 1,
      scrollTo: noop,
    },
    navigator: { userAgent: "node-test", language: "zh-HK" },
    location: { href: "http://localhost/", search: "", pathname: "/", origin: "http://localhost" },
    matchMedia: () => ({ matches: false, addEventListener: noop }),
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
    fetch: () => Promise.reject(new Error("no network")),
    Audio: function () {
      return { play: () => Promise.resolve(), pause: noop, addEventListener: noop, volume: 1, currentTime: 0, loop: false };
    },
    Image: function () {
      return makeEl();
    },
    performance: { now: () => 0 },
    addEventListener: noop,
    removeEventListener: noop,
    scrollTo: noop,
    alert: noop,
    confirm: () => false,
    prompt: () => null,
    NodeFilter: { SHOW_TEXT: 4, SHOW_ELEMENT: 1, SHOW_ALL: 0xffffffff, FILTER_ACCEPT: 1, FILTER_REJECT: 2, FILTER_SKIP: 3 },
    Node: { ELEMENT_NODE: 1, TEXT_NODE: 3, DOCUMENT_NODE: 9 },
    requestIdleCallback: (fn) => fn(),
    URL,
    URLSearchParams,
    Date,
    Math,
    JSON,
  };
  sandbox.globalThis = sandbox;

  // 可記錄的假元素（不用 setter，因為 Object.assign 會覆寫 setter；
  // 改用普通屬性，事後讀取即可）
  captured.rankList = makeEl({
    classList: {
      add: noop,
      remove: noop,
      toggle: (cls, on) => {
        captured.compact = on;
      },
      contains: () => false,
    },
  });
  captured.rSub = makeEl();

  ctx = vm.createContext(sandbox);
  const code = readFileSync(APP_JS, "utf8");
  try {
    new vm.Script(code, { filename: "app.js" }).runInContext(ctx, { timeout: 10000 });
  } catch (e) {
    // 頂層 DOM 副作用失敗不影響函式定義
    if (!/is not (defined|a function)|Cannot read/.test(String(e.message))) throw e;
  }
});

const boot = (expr) => vm.runInContext(expr, ctx);

/* 沙箱內的替身 G：重寫後 G.phase 是狀態機鏡像，endGame() 會呼叫 G.sm.finish() */
boot(`
  globalThis.mkG = function(extra){
    const sm = new GameStateMachine();
    sm.force("interstitial");
    const g = {
      sm,
      allowSkip: true, skipCap: 3, skipLeft: 3,
      teams: [], cur: null, locked: false, judged: 0,
      canJudge(){ return this.sm.canJudge(); },
      canUndo(){ return this.sm.canUndo(); },
      canResume(){ return this.sm.canResume(); },
      canPause(){ return this.sm.canPause(); },
      get phase(){ return this.sm.phase; },
      get paused(){ return this.sm.paused; }
    };
    Object.assign(g, extra || {});
    return g;
  };
`);

/** 在沙箱內建 G 並呼叫真的 endGame() */
function runEndGame(teams) {
  // 重設假元素的內容
  captured.rankList.innerHTML = "";
  captured.rSub.textContent = "";
  captured.compact = null;

  boot(`
    G = mkG({
      turn: 5, rounds: 6,
      order: [0,1,2,3,4,5],
      teams: ${JSON.stringify(teams)},
      timerToken: 0,
      base: { ok:0, skip:0, foul:0, score:0 }
    });
  `);
  boot("endGame()");
  return {
    html: captured.rankList.innerHTML || "",
    sub: captured.rSub.textContent || "",
    compact: captured.compact,
  };
}

/** 從 rankList HTML 抽出每隊名次與名稱 */
function parseRank(html) {
  const out = [];
  const re = /<div class="no">(\d+)<\/div>[\s\S]*?<div class="nm">([^<]+)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    out.push({ rank: Number(m[1]), name: m[2].trim() });
  }
  return out;
}

const T = (name, score, ok) => ({ name, score, ok, skip: 0, foul: 0, id: "turtle", color: "#000" });

describe("真實 endGame() 排名輸出", () => {
  test("按分數排序，名次正確", () => {
    const r = runEndGame([T("A", 3, 3), T("B", 5, 5), T("C", 1, 1)]);
    const ranks = parseRank(r.html);
    assert.deepEqual(ranks, [
      { rank: 1, name: "B" },
      { rank: 2, name: "A" },
      { rank: 3, name: "C" },
    ]);
  });

  test("同分並列，名次跳號（10,10,8 → 1,1,3）", () => {
    const r = runEndGame([T("A", 10, 10), T("B", 10, 8), T("C", 8, 8)]);
    const ranks = parseRank(r.html);
    assert.deepEqual(ranks, [
      { rank: 1, name: "A" },
      { rank: 1, name: "B" },
      { rank: 3, name: "C" },
    ]);
  });

  test("全員 0 分 → 全部並列第 1", () => {
    const r = runEndGame([T("A", 0, 0), T("B", 0, 0), T("C", 0, 0)]);
    const ranks = parseRank(r.html);
    assert.deepEqual(ranks.map((x) => x.rank), [1, 1, 1]);
  });

  test("4 個以上並列冠軍 → 加 compact class", () => {
    const r = runEndGame([T("A", 5, 5), T("B", 5, 5), T("C", 5, 5), T("D", 5, 5)]);
    assert.equal(r.compact, true, "champs>=4 應加 compact");
  });

  test("3 個並列冠軍 → 不加 compact", () => {
    const r = runEndGame([T("A", 5, 5), T("B", 5, 5), T("C", 5, 5)]);
    assert.equal(r.compact, false, "champs<4 不應加 compact");
  });

  test("副標題含總分與答對總數", () => {
    const r = runEndGame([T("A", 3, 3), T("B", 5, 4)]);
    assert.match(r.sub, /8/, `副標題應含總分 8，實際：${r.sub}`);
    assert.match(r.sub, /7/, `副標題應含答對 7，實際：${r.sub}`);
  });

  test("負分仍正確排序", () => {
    const r = runEndGame([T("A", -2, 1), T("B", 0, 2)]);
    const ranks = parseRank(r.html);
    assert.deepEqual(ranks, [
      { rank: 1, name: "B" },
      { rank: 2, name: "A" },
    ]);
  });
});
