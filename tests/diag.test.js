import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import { diagPush, getDiag, getDiagLog, clearDiag } from "../src/diag.js";

function makeEl({ sw = 10, sh = 20, cw = 100, ch = 200, mw = "", fs = "16px", op = "1", vis = "visible" } = {}) {
  return {
    scrollWidth: sw,
    scrollHeight: sh,
    style: { maxWidth: mw },
    parentElement: { clientWidth: cw, clientHeight: ch },
    __cs: { fontSize: fs, opacity: op, visibility: vis },
  };
}

describe("diag：環形緩衝", () => {
  let origGetComputedStyle;

  beforeEach(() => {
    clearDiag();
    origGetComputedStyle = globalThis.getComputedStyle;
    globalThis.getComputedStyle = (el) => (el && el.__cs) || { fontSize: "", opacity: "", visibility: "" };
  });

  afterEach(() => {
    if (origGetComputedStyle === undefined) delete globalThis.getComputedStyle;
    else globalThis.getComputedStyle = origGetComputedStyle;
  });

  test("diagPush 記錄基本欄位與脈絡", () => {
    const el = makeEl({ sw: 11, sh: 22, cw: 300, ch: 400, mw: "80%", fs: "24px", op: "0.9", vis: "visible" });
    diagPush("測試題目", el, { team: "A隊", turn: 3, phase: "running" });
    const d = getDiag();
    assert.equal(d.length, 1);
    assert.equal(d[0].t, "測試題目");
    assert.equal(d[0].len, 4);
    assert.equal(d[0].team, "A隊");
    assert.equal(d[0].turn, 3);
    assert.equal(d[0].phase, "running");
    assert.equal(d[0].sw, 11);
    assert.equal(d[0].sh, 22);
    assert.equal(d[0].cw, 300);
    assert.equal(d[0].ch, 400);
    assert.equal(d[0].mw, "80%");
    assert.equal(d[0].fs, "24px");
    assert.equal(d[0].op, "0.9");
    assert.equal(d[0].vis, "visible");
    assert.ok(typeof d[0].at === "string" && d[0].at.length > 0);
  });

  test("最多保留 24 筆（最舊的被移除）", () => {
    for (let i = 0; i < 30; i++) diagPush("t" + i, makeEl(), { turn: i, phase: "running", team: "X" });
    const d = getDiag();
    assert.equal(d.length, 24);
    assert.equal(d[0].t, "t6");
    assert.equal(d[23].t, "t29");
  });

  test("getDiagLog 回傳最近 n 筆複本（新陣列）", () => {
    for (let i = 0; i < 5; i++) diagPush("t" + i, makeEl(), {});
    const log = getDiagLog(2);
    assert.deepEqual(log.map(x => x.t), ["t3", "t4"]);
    assert.notEqual(log, getDiag());
    assert.equal(log.length, 2);
  });

  test("缺少 el 或 ctx 時仍安全記錄", () => {
    assert.doesNotThrow(() => diagPush(null, null));
    const d = getDiag();
    assert.equal(d.length, 1);
    assert.equal(d[0].team, "");
    assert.equal(d[0].turn, -1);
    assert.equal(d[0].phase, "");
  });
});
