/**
 * 狀態機測試
 *
 * 重點：用測試證明 F-01 / F-02 這類 bug 在新架構下「不可能發生」，
 * 而不是只保證轉移表看起來正確。
 *
 * 執行：node --test tests/state.test.js
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { GameStateMachine, State, StateError } from "../src/state.js";

const sm = () => new GameStateMachine({ strict: true });

/** 快進到 PLAYING */
function playing() {
  const m = sm();
  m.start();
  m.goCountdown();
  m.begin();
  return m;
}

/** 快進到 PAUSED_PLAYING */
function pausedPlaying() {
  const m = playing();
  m.pause();
  return m;
}

describe("初始狀態", () => {
  test("新機器是 IDLE", () => {
    assert.equal(sm().state, State.IDLE);
  });

  test("IDLE 不可判定、不可暫停、不可撤回、timer 不跑", () => {
    const m = sm();
    assert.equal(m.canJudge(), false);
    assert.equal(m.canPause(), false);
    assert.equal(m.canUndo(), false);
    assert.equal(m.isTimerActive(), false);
  });
});

describe("正常流程", () => {
  test("IDLE → READY → COUNTDOWN → PLAYING", () => {
    const m = sm();
    assert.equal(m.start(), true);
    assert.equal(m.state, State.READY);
    assert.equal(m.goCountdown(), true);
    assert.equal(m.state, State.COUNTDOWN);
    assert.equal(m.begin(), true);
    assert.equal(m.state, State.PLAYING);
  });

  test("PLAYING 才可判定與撤回、timer 才跑", () => {
    const m = playing();
    assert.equal(m.canJudge(), true);
    assert.equal(m.canUndo(), true);
    assert.equal(m.isTimerActive(), true);
  });

  test("PLAYING → INTERSTITIAL → READY（下一回合）", () => {
    const m = playing();
    assert.equal(m.turnEnd(), true);
    assert.equal(m.state, State.INTERSTITIAL);
    assert.equal(m.nextTurn(), true);
    assert.equal(m.state, State.READY);
  });

  test("INTERSTITIAL → DONE（最後一回合）", () => {
    const m = playing();
    m.turnEnd();
    assert.equal(m.finish(), true);
    assert.equal(m.state, State.DONE);
  });
});

describe("F-01：暫停時不可判定", () => {
  test("PAUSED_PLAYING 時 canJudge() 為 false", () => {
    const m = pausedPlaying();
    assert.equal(m.state, State.PAUSED_PLAYING);
    assert.equal(m.canJudge(), false, "暫停時絕不可判定");
  });

  test("PAUSED_PLAYING 時 canUndo() 為 false", () => {
    assert.equal(pausedPlaying().canUndo(), false, "暫停時不可撤回");
  });

  test("PAUSED_PLAYING 時 timer 不跑", () => {
    assert.equal(pausedPlaying().isTimerActive(), false);
  });

  test("解除暫停後恢復可判定", () => {
    const m = pausedPlaying();
    assert.equal(m.resume(), true);
    assert.equal(m.state, State.PLAYING);
    assert.equal(m.canJudge(), true);
  });

  test("迴歸：舊版是多個守門各查各的，新版只有一個來源", () => {
    // 只要 canJudge() 只看 PLAYING，就不存在「某處漏查 paused」的可能。
    // 這裡列舉所有狀態，確認只有 PLAYING 回 true。
    const all = Object.values(State);
    for (const s of all) {
      const m = sm();
      m.state = s; // 直接設定以遍歷所有狀態
      assert.equal(
        m.canJudge(),
        s === State.PLAYING,
        `狀態 ${s} 的 canJudge() 應為 ${s === State.PLAYING}`
      );
    }
  });
});

describe("F-02：倒數中暫停可正確回復", () => {
  test("COUNTDOWN 可暫停 → PAUSED_COUNTDOWN", () => {
    const m = sm();
    m.start();
    m.goCountdown();
    assert.equal(m.pause(), true);
    assert.equal(m.state, State.PAUSED_COUNTDOWN);
  });

  test("PAUSED_COUNTDOWN 的 timer 不跑（不會背景偷跑）", () => {
    const m = sm();
    m.start();
    m.goCountdown();
    m.pause();
    assert.equal(m.isTimerActive(), false, "暫停的倒數不應計時");
  });

  test("PAUSED_COUNTDOWN 不可判定", () => {
    const m = sm();
    m.start();
    m.goCountdown();
    m.pause();
    assert.equal(m.canJudge(), false);
  });

  test("解除暫停回到 COUNTDOWN（不是跳去 PLAYING）", () => {
    const m = sm();
    m.start();
    m.goCountdown();
    m.pause();
    assert.equal(m.resume(), true);
    assert.equal(m.state, State.COUNTDOWN, "應回到倒數，繼續跑完再進 PLAYING");
  });

  test("COUNTDOWN 不能直接跳到 INTERSTITIAL", () => {
    const m = sm();
    m.start();
    m.goCountdown();
    assert.throws(() => m.turnEnd(), StateError, "倒數中不應能結束回合");
  });
});

describe("非法轉移", () => {
  test("IDLE 不能直接開始倒數", () => {
    assert.throws(() => sm().goCountdown(), StateError);
  });

  test("IDLE 不能直接 begin", () => {
    assert.throws(() => sm().begin(), StateError);
  });

  test("READY 不能直接 turnEnd", () => {
    const m = sm();
    m.start();
    assert.throws(() => m.turnEnd(), StateError);
  });

  test("DONE 不能再判定", () => {
    const m = playing();
    m.turnEnd();
    m.finish();
    assert.equal(m.canJudge(), false);
  });

  test("非 strict 模式下非法轉移回 false 而不拋錯", () => {
    const m = new GameStateMachine();
    assert.equal(m.goCountdown(), false);
    assert.equal(m.state, State.IDLE, "狀態不應改變");
  });

  test("未知狀態值會拋錯", () => {
    assert.throws(() => sm().go("bogus"), StateError);
  });
});

describe("paused getter", () => {
  test("只有 PAUSED_* 兩個狀態回 true", () => {
    for (const s of Object.values(State)) {
      const m = sm();
      m.state = s;
      const expected = s === State.PAUSED_PLAYING || s === State.PAUSED_COUNTDOWN;
      assert.equal(m.paused, expected, `狀態 ${s} 的 paused 應為 ${expected}`);
    }
  });
});

describe("中止與重設", () => {
  test("任何活動狀態都可 abort 回 IDLE", () => {
    for (const setup of [
      () => sm(),
      () => {
        const m = sm();
        m.start();
        return m;
      },
      () => playing(),
      () => pausedPlaying(),
      () => {
        const m = playing();
        m.turnEnd();
        return m;
      },
    ]) {
      const m = setup();
      assert.equal(m.abort(), true, `從 ${m.state} 應可 abort`);
      assert.equal(m.state, State.IDLE);
    }
  });

  test("history 記錄所有轉移", () => {
    const m = playing();
    assert.deepEqual(m.history, [State.IDLE, State.READY, State.COUNTDOWN, State.PLAYING]);
  });
});
