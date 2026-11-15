/**
 * beasttv 純邏輯行為測試
 *
 * 目的：把 app.js 現有的判定／計分／排名規則抽成純函式並鎖定，
 * 重寫後這些測試必須全部通過，才能證明行為沒變。
 *
 * 這些函式是從 app.js @ 19b5279 逐行對照抽取的「規格實作」，
 * 不是重寫後的產物 —— 所以現在就能拿來驗證規格寫得對不對。
 *
 * 執行：node --test tests/logic.test.js
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

// ─────────────────────────────────────────────────────────────
// 規格實作（對照 app.js 抽取，變數名刻意保留原樣以便對照）
// ─────────────────────────────────────────────────────────────

/** 跳過是否被允許（app.js:1111） */
export function skipAllowed(G) {
  if (!G.allowSkip) return false;
  if (G.skipCap !== 0 && G.skipLeft <= 0) return false;
  return true;
}

/** 判定（app.js:1110-1136 的計分部分） */
export function judge(team, G, kind) {
  if (kind === "skip" && !skipAllowed(G)) return { accepted: false };

  let delta = 0;
  if (kind === "ok") {
    team.ok++;
    delta = 1;
  } else if (kind === "skip") {
    team.skip++;
    if (G.skipCap !== 0) G.skipLeft--;
    if (G.skipPenalty) delta = -1;
  } else if (kind === "foul") {
    team.foul++;
    if (G.foulPenalty) delta = -1;
  } else {
    return { accepted: false };
  }

  team.score += delta;
  G.judged = (G.judged || 0) + 1;
  return { accepted: true, delta };
}

/** act() 的閘門（app.js:1018） */
export function canAct(G) {
  return !!(G && G.phase === "running" && !G.paused && G.cur && !G.locked);
}

/** 排名（app.js:1289-1300） */
export function rankTeams(teams) {
  const sorted = teams
    .map((t, i) => ({ ...t, i }))
    .sort((a, b) => b.score - a.score || b.ok - a.ok);

  let rank = 0;
  let prev = null;
  return sorted.map((t, i) => {
    if (t.score !== prev) {
      rank = i + 1;
      prev = t.score;
    }
    return { ...t, rank };
  });
}

/** 冠軍數（app.js:1302） */
export function champCount(ranked) {
  return ranked.filter((t) => t.rank === 1).length;
}

// ─────────────────────────────────────────────────────────────
// 測試
// ─────────────────────────────────────────────────────────────

const mkG = (over = {}) => ({
  phase: "running",
  paused: false,
  cur: { t: "測試題" },
  locked: false,
  allowSkip: true,
  skipCap: 3,
  skipLeft: 3,
  skipPenalty: false,
  foulPenalty: false,
  judged: 0,
  ...over,
});

const mkTeam = () => ({ name: "A", ok: 0, skip: 0, foul: 0, score: 0 });

describe("判定閘門 canAct()", () => {
  test("running + 未暫停 + 有題 + 未鎖 → 可判定", () => {
    assert.equal(canAct(mkG()), true);
  });

  test("暫停時不可判定（F-01 的核心）", () => {
    assert.equal(canAct(mkG({ paused: true })), false);
  });

  test("非 running 階段不可判定", () => {
    for (const phase of ["ready", "countdown", "interstitial", "done"]) {
      assert.equal(canAct(mkG({ phase })), false, `phase=${phase} 應拒絕`);
    }
  });

  test("沒有當前題目不可判定", () => {
    assert.equal(canAct(mkG({ cur: null })), false);
  });

  test("locked（防連按 190ms 內）不可判定", () => {
    assert.equal(canAct(mkG({ locked: true })), false);
  });
});

describe("跳過閘門 skipAllowed()", () => {
  test("allowSkip=false 一律拒絕", () => {
    assert.equal(skipAllowed(mkG({ allowSkip: false })), false);
  });

  test("skipCap=3, skipLeft=3 → 允許", () => {
    assert.equal(skipAllowed(mkG()), true);
  });

  test("skipCap=3, skipLeft=0 → 拒絕", () => {
    assert.equal(skipAllowed(mkG({ skipLeft: 0 })), false);
  });

  test("skipCap=0（無限）即使 skipLeft=0 也允許", () => {
    assert.equal(skipAllowed(mkG({ skipCap: 0, skipLeft: 0 })), true);
  });

  test("skipCap=1 首次允許、用完拒絕", () => {
    const G = mkG({ skipCap: 1, skipLeft: 1 });
    const t = mkTeam();
    assert.equal(judge(t, G, "skip").accepted, true);
    assert.equal(G.skipLeft, 0);
    assert.equal(judge(t, G, "skip").accepted, false, "用完後應拒絕");
  });
});

describe("判定計分 judge()", () => {
  test("正確 → +1 分、ok++", () => {
    const t = mkTeam();
    const r = judge(t, mkG(), "ok");
    assert.equal(r.delta, 1);
    assert.equal(t.score, 1);
    assert.equal(t.ok, 1);
  });

  test("跳過（無罰分）→ 0 分、skip++、skipLeft--", () => {
    const t = mkTeam();
    const G = mkG();
    const r = judge(t, G, "skip");
    assert.equal(r.delta, 0);
    assert.equal(t.score, 0);
    assert.equal(t.skip, 1);
    assert.equal(G.skipLeft, 2);
  });

  test("跳過（有罰分）→ -1 分、skipLeft 仍遞減", () => {
    const t = mkTeam();
    const G = mkG({ skipPenalty: true });
    const r = judge(t, G, "skip");
    assert.equal(r.delta, -1);
    assert.equal(t.score, -1);
    assert.equal(G.skipLeft, 2);
  });

  test("犯規（無罰分）→ 0 分、foul++", () => {
    const t = mkTeam();
    const r = judge(t, mkG(), "foul");
    assert.equal(r.delta, 0);
    assert.equal(t.foul, 1);
    assert.equal(t.score, 0);
  });

  test("犯規（有罰分）→ -1 分", () => {
    const t = mkTeam();
    const r = judge(t, mkG({ foulPenalty: true }), "foul");
    assert.equal(r.delta, -1);
    assert.equal(t.score, -1);
  });

  test("無限跳過不遞減 skipLeft", () => {
    const t = mkTeam();
    const G = mkG({ skipCap: 0, skipLeft: 5 });
    judge(t, G, "skip");
    assert.equal(G.skipLeft, 5, "skipCap=0 時不應遞減");
  });

  test("跳過被拒時不改任何計數", () => {
    const t = mkTeam();
    const G = mkG({ skipLeft: 0 });
    const before = JSON.stringify({ t, skipLeft: G.skipLeft, judged: G.judged });
    const r = judge(t, G, "skip");
    assert.equal(r.accepted, false);
    assert.equal(JSON.stringify({ t, skipLeft: G.skipLeft, judged: G.judged }), before);
  });

  test("judged 每次成功判定 +1", () => {
    const t = mkTeam();
    const G = mkG();
    judge(t, G, "ok");
    judge(t, G, "foul");
    assert.equal(G.judged, 2);
  });
});

describe("排名 rankTeams()", () => {
  test("按分數降序", () => {
    const r = rankTeams([
      { name: "A", score: 3, ok: 3 },
      { name: "B", score: 5, ok: 5 },
      { name: "C", score: 1, ok: 1 },
    ]);
    assert.deepEqual(r.map((t) => t.name), ["B", "A", "C"]);
    assert.deepEqual(r.map((t) => t.rank), [1, 2, 3]);
  });

  test("同分時答對多者排前面", () => {
    const r = rankTeams([
      { name: "A", score: 5, ok: 3 },
      { name: "B", score: 5, ok: 7 },
    ]);
    assert.deepEqual(r.map((t) => t.name), ["B", "A"]);
  });

  test("同分同名次，名次跳號（competition ranking）", () => {
    const r = rankTeams([
      { name: "A", score: 10, ok: 10 },
      { name: "B", score: 10, ok: 8 },
      { name: "C", score: 8, ok: 8 },
    ]);
    assert.deepEqual(r.map((t) => t.rank), [1, 1, 3], "同分同名次後應跳號成 3");
  });

  test("三個同分 → 三個都是 rank 1", () => {
    const r = rankTeams([
      { name: "A", score: 5, ok: 5 },
      { name: "B", score: 5, ok: 5 },
      { name: "C", score: 5, ok: 5 },
    ]);
    assert.deepEqual(r.map((t) => t.rank), [1, 1, 1]);
    assert.equal(champCount(r), 3);
  });

  test("全員 0 分 → 全部並列冠軍", () => {
    const r = rankTeams([
      { name: "A", score: 0, ok: 0 },
      { name: "B", score: 0, ok: 0 },
    ]);
    assert.equal(champCount(r), 2);
  });

  test("負分也正確排序", () => {
    const r = rankTeams([
      { name: "A", score: -2, ok: 1 },
      { name: "B", score: 0, ok: 2 },
    ]);
    assert.deepEqual(r.map((t) => t.name), ["B", "A"]);
    assert.deepEqual(r.map((t) => t.rank), [1, 2]);
  });
});

describe("冠軍數 champCount()", () => {
  test("唯一冠軍 → 1", () => {
    const r = rankTeams([
      { name: "A", score: 9, ok: 9 },
      { name: "B", score: 4, ok: 4 },
    ]);
    assert.equal(champCount(r), 1);
  });

  test("並列兩個 → 2", () => {
    const r = rankTeams([
      { name: "A", score: 5, ok: 5 },
      { name: "B", score: 5, ok: 4 },
      { name: "C", score: 1, ok: 1 },
    ]);
    assert.equal(champCount(r), 2);
  });
});

describe("撤回還原（快照語意）", () => {
  test("撤回後分數與計數回到判定前", () => {
    const t = mkTeam();
    const G = mkG();
    const snap = { ok: t.ok, skip: t.skip, foul: t.foul, score: t.score, skipLeft: G.skipLeft, judged: G.judged };

    judge(t, G, "ok");
    assert.equal(t.score, 1);

    // 還原
    t.ok = snap.ok;
    t.skip = snap.skip;
    t.foul = snap.foul;
    t.score = snap.score;
    G.skipLeft = snap.skipLeft;
    G.judged = snap.judged;

    assert.equal(t.score, 0);
    assert.equal(t.ok, 0);
    assert.equal(G.judged, 0);
  });

  test("跳過後撤回，skipLeft 亦要還原", () => {
    const t = mkTeam();
    const G = mkG();
    const snap = { skipLeft: G.skipLeft };
    judge(t, G, "skip");
    assert.equal(G.skipLeft, 2);
    G.skipLeft = snap.skipLeft;
    assert.equal(G.skipLeft, 3);
  });
});
