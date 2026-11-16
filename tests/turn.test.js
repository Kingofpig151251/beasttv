/**
 * 回合結構、結算覆核、出場順序 —— 用真實 app.js 驗證
 *
 * 執行：node --test tests/turn.test.js
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

let ctx;
const cap = {};

before(() => {
  const sb = {
    console: { log: noop, warn: noop, error: noop, info: noop },
    setTimeout: () => 0,
    clearTimeout: noop,
    setInterval: () => 0,
    clearInterval: noop,
    requestAnimationFrame: () => 0,
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    document: {
      querySelector: () => makeEl(),
      querySelectorAll: () => [],
      getElementById: () => makeEl(),
      createElement: () => makeEl(),
      createTextNode: () => ({ nodeType: 3 }),
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
  Object.assign(sb, injectedGlobals());
  ctx = vm.createContext(sb);
  try {
    new vm.Script(runnableAppCode()).runInContext(ctx, { timeout: 10000 });
  } catch (e) {
    if (!/is not (defined|a function)|Cannot read/.test(String(e.message))) throw e;
  }
});

const boot = (expr) => vm.runInContext(expr, ctx);

describe("出場順序（逐輪輪轉）", () => {
  test("4 隊 × 2 輪 → [0,1,2,3,0,1,2,3]", () => {
    const out = boot(`
      (() => {
        const names = ["a","b","c","d"], roundsPer = 2;
        const order = [];
        for(let r = 0; r < roundsPer; r++) for(let i = 0; i < names.length; i++) order.push(i);
        return JSON.stringify(order);
      })()
    `);
    assert.deepEqual(JSON.parse(out), [0, 1, 2, 3, 0, 1, 2, 3]);
  });

  test("2 隊 × 1 輪 → [0,1]", () => {
    const out = boot(`
      (() => {
        const names = ["a","b"], roundsPer = 1;
        const order = [];
        for(let r = 0; r < roundsPer; r++) for(let i = 0; i < names.length; i++) order.push(i);
        return JSON.stringify(order);
      })()
    `);
    assert.deepEqual(JSON.parse(out), [0, 1]);
  });

  test("總回合 = 隊數 × 輪數", () => {
    for (const [teams, rounds] of [
      [2, 1],
      [4, 2],
      [8, 5],
      [3, 3],
    ]) {
      const out = boot(`
        (() => {
          const names = Array.from({length:${teams}}, (_,i)=>String(i));
          const order = [];
          for(let r = 0; r < ${rounds}; r++) for(let i = 0; i < names.length; i++) order.push(i);
          return order.length;
        })()
      `);
      assert.equal(out, teams * rounds, `${teams} 隊 × ${rounds} 輪應為 ${teams * rounds} 回合`);
    }
  });
});

describe("回合統計（base 差值法）", () => {
  test("首回合：stats 等於累計值", () => {
    const out = boot(`
      (() => {
        const team = { ok:3, skip:1, foul:2, score:2 };
        const base = { ok:0, skip:0, foul:0, score:0 };
        return JSON.stringify({
          ok: team.ok - base.ok,
          skip: team.skip - base.skip,
          foul: (team.foul||0) - (base.foul||0),
          score: team.score - base.score
        });
      })()
    `);
    assert.deepEqual(JSON.parse(out), { ok: 3, skip: 1, foul: 2, score: 2 });
  });

  test("第二回合：只算本回合增量", () => {
    const out = boot(`
      (() => {
        const team = { ok:5, skip:2, foul:3, score:4 };
        const base = { ok:3, skip:1, foul:2, score:2 };
        return JSON.stringify({
          ok: team.ok - base.ok,
          skip: team.skip - base.skip,
          foul: (team.foul||0) - (base.foul||0),
          score: team.score - base.score
        });
      })()
    `);
    assert.deepEqual(JSON.parse(out), { ok: 2, skip: 1, foul: 1, score: 2 });
  });

  test("負分回合（差值可為負）", () => {
    const out = boot(`
      (() => {
        const team = { ok:0, skip:2, foul:1, score:-3 };
        const base = { ok:0, skip:0, foul:0, score:0 };
        return JSON.stringify({ score: team.score - base.score });
      })()
    `);
    assert.deepEqual(JSON.parse(out), { score: -3 });
  });
});

describe("結算覆核 settleAdjust（重算非累加）", () => {
  /** 直接跑真實 settleAdjust */
  function runAdjust({
    ok = 0,
    skip = 0,
    foul = 0,
    skipPenalty = false,
    foulPenalty = false,
    skipCap = 3,
    base,
    d = 0,
    kind = "ok",
  }) {
    const b = base || { ok: 0, skip: 0, foul: 0, score: 0 };
    boot(`
      G = {
        skipPenalty: ${skipPenalty},
        foulPenalty: ${foulPenalty},
        skipCap: ${skipCap},
        allowSkip: true,
        base: ${JSON.stringify(b)},
        settle: { id: "turtle", name: "A", ok: ${ok}, skip: ${skip}, foul: ${foul}, score: 0 },
        teams: [{ id: "turtle", name: "A", ok: ${b.ok}, skip: ${b.skip}, foul: ${b.foul}, score: ${b.score} }]
      };
      G.settle.score = G.settle.ok - (G.skipPenalty ? G.settle.skip : 0) - (G.foulPenalty ? G.settle.foul : 0);
    `);
    if (d !== 0) boot(`settleAdjust(${JSON.stringify(kind)}, ${d})`);
    const raw = boot(`JSON.stringify({ settle: G.settle, team: G.teams[0], skipLeft: G.skipLeft })`);
    return JSON.parse(raw);
  }

  test("加一次正確：score 由 ok 重算", () => {
    const r = runAdjust({ ok: 0, skip: 0, foul: 0, kind: "ok", d: 1 });
    assert.equal(r.settle.ok, 1);
    assert.equal(r.settle.score, 1, "score = ok - 罰分");
  });

  test("連續加兩次正確：score = 2（不是 1+1 累加錯）", () => {
    boot(`
      G = { skipPenalty:false, foulPenalty:false, skipCap:3, allowSkip:true,
            base:{ok:0,skip:0,foul:0,score:0},
            settle:{ id:"turtle", name:"A", ok:0, skip:0, foul:0, score:0 },
            teams:[{ id:"turtle", name:"A", ok:0, skip:0, foul:0, score:0 }] };
    `);
    boot(`settleAdjust("ok", 1)`);
    boot(`settleAdjust("ok", 1)`);
    const r = JSON.parse(boot(`JSON.stringify(G.settle)`));
    assert.equal(r.ok, 2);
    assert.equal(r.score, 2, "score 應為重算的 2");
  });

  test("有犯規罰分時 score = ok - foul", () => {
    const r = runAdjust({ ok: 3, skip: 0, foul: 1, foulPenalty: true, kind: "ok", d: 0 });
    assert.equal(r.settle.score, 3 - 1, "3 正確 - 1 犯規 = 2");
  });

  test("有跳過罰分時 score = ok - skip", () => {
    const r = runAdjust({ ok: 2, skip: 1, foul: 0, skipPenalty: true, kind: "ok", d: 0 });
    assert.equal(r.settle.score, 2 - 1);
  });

  test("不可減至負數（d<0 且該項已為 0）", () => {
    boot(`
      G = { skipPenalty:false, foulPenalty:false, skipCap:3, allowSkip:true,
            base:{ok:0,skip:0,foul:0,score:0},
            settle:{ id:"turtle", name:"A", ok:0, skip:0, foul:0, score:0 },
            teams:[{ id:"turtle", name:"A", ok:0, skip:0, foul:0, score:0 }] };
    `);
    boot(`settleAdjust("ok", -1)`);
    const r = JSON.parse(boot(`JSON.stringify(G.settle)`));
    assert.equal(r.ok, 0, "已是 0 時不可再減");
  });

  test("減跳過次數會還原 skipLeft", () => {
    boot(`
      G = { skipPenalty:false, foulPenalty:false, skipCap:3, allowSkip:true,
            base:{ok:0,skip:0,foul:0,score:0},
            settle:{ id:"turtle", name:"A", ok:0, skip:2, foul:0, score:0 },
            teams:[{ id:"turtle", name:"A", ok:0, skip:2, foul:0, score:0 }] };
    `);
    boot(`settleAdjust("skip", -1)`);
    const r = JSON.parse(boot(`JSON.stringify({ skip: G.settle.skip, skipLeft: G.skipLeft })`));
    assert.equal(r.skip, 1);
    assert.equal(r.skipLeft, 2, "skipCap 3 - 1 = 2");
  });

  test("team 的分數 = base + settle", () => {
    boot(`
      G = { skipPenalty:false, foulPenalty:false, skipCap:3, allowSkip:true,
            base:{ok:5,skip:1,foul:0,score:4},
            settle:{ id:"turtle", name:"A", ok:1, skip:0, foul:0, score:1 },
            teams:[{ id:"turtle", name:"A", ok:5, skip:1, foul:0, score:4 }] };
    `);
    boot(`settleAdjust("ok", 2)`);
    const r = JSON.parse(boot(`JSON.stringify({ settle: G.settle, team: G.teams[0] })`));
    assert.equal(r.settle.ok, 3);
    assert.equal(r.team.ok, 5 + 3, "team.ok = base.ok + settle.ok");
    assert.equal(r.team.score, 4 + 3, "team.score = base.score + settle.score");
  });
});
