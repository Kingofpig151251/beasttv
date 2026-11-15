/**
 * beasttv 遊戲狀態機
 *
 * 設計要點
 * ────────
 * 舊版把「階段」和「暫停」當成兩個獨立變數（G.phase + G.paused），
 * 兩者正交組合出 10 種狀態，而每個守門函式都要自己記得檢查兩者。
 * F-01（暫停時仍可判定）與 F-02（倒數中開面板背景偷跑）就是這樣漏掉的。
 *
 * 新版把「暫停」也變成狀態（PAUSED_PLAYING / PAUSED_COUNTDOWN），
 * 於是守門只需檢查「單一狀態是否存在於允許集合」，忘記檢查在結構上不可能發生。
 *
 * 狀態圖
 * ──────
 *
 *   IDLE ──start──> READY ──go──> COUNTDOWN ──begin──> PLAYING
 *                     │              │  ▲                │  ▲
 *                     │              │  │                │  │
 *                     │              │  └──resume────────┼──┤
 *                     │              │                  │  │
 *                     │           pause                pause
 *                     │              │                  │  │
 *                     │              ▼                  ▼  │
 *                     │      PAUSED_COUNTDOWN      PAUSED_PLAYING
 *                     │                                    │
 *                     │                                    │
 *                     ├──> INTERSTITIAL <──turnEnd─────────┘
 *                     │          │
 *                     │      nextTurn (有下一回合) ──> READY
 *                     │          │
 *                     │      lastTurn
 *                     ▼          ▼
 *                   DONE <───────┘
 */

/** 合法狀態 */
export const State = Object.freeze({
  IDLE: "idle",
  READY: "ready",
  COUNTDOWN: "countdown",
  PLAYING: "playing",
  PAUSED_PLAYING: "paused-playing",
  PAUSED_COUNTDOWN: "paused-countdown",
  INTERSTITIAL: "interstitial",
  DONE: "done",
});

const ALL_STATES = new Set(Object.values(State));

/** 可判定的狀態集合：只有一個成員，就是「正在玩且未暫停」 */
const JUDGEABLE = new Set([State.PLAYING]);

/** 可撤回的狀態集合 */
const UNDOABLE = new Set([State.PLAYING]);

/** 可暫停的狀態集合 */
const PAUSABLE = new Set([State.PLAYING, State.COUNTDOWN]);

/** 可繼續（解除暫停）的狀態集合 */
const RESUMABLE = new Set([State.PAUSED_PLAYING, State.PAUSED_COUNTDOWN]);

/** 暫停後應回到的狀態 */
const RESUME_TARGET = Object.freeze({
  [State.PAUSED_PLAYING]: State.PLAYING,
  [State.PAUSED_COUNTDOWN]: State.COUNTDOWN,
});

/** 合法轉移表：from → Set<to> */
const TRANSITIONS = Object.freeze({
  [State.IDLE]: new Set([State.READY]),
  [State.READY]: new Set([State.COUNTDOWN, State.IDLE]),
  [State.COUNTDOWN]: new Set([State.PLAYING, State.PAUSED_COUNTDOWN, State.IDLE]),
  [State.PLAYING]: new Set([State.PAUSED_PLAYING, State.INTERSTITIAL, State.IDLE]),
  [State.PAUSED_PLAYING]: new Set([State.PLAYING, State.INTERSTITIAL, State.IDLE]),
  [State.PAUSED_COUNTDOWN]: new Set([State.COUNTDOWN, State.IDLE]),
  [State.INTERSTITIAL]: new Set([State.READY, State.DONE, State.IDLE]),
  // DONE 允許回 IDLE（重新開局）
  [State.DONE]: new Set([State.IDLE, State.READY]),
});

export class StateError extends Error {
  constructor(from, to) {
    super(`非法狀態轉移：${from} → ${to}`);
    this.name = "StateError";
    this.from = from;
    this.to = to;
  }
}

export class GameStateMachine {
  /**
   * @param {object} [opts]
   * @param {boolean} [opts.strict] true 時非法轉移會拋錯（測試用）；預設回傳 false
   */
  constructor(opts = {}) {
    this.state = State.IDLE;
    this.strict = !!opts.strict;
    /** 狀態變更歷史，方便除錯與斷言 */
    this.history = [State.IDLE];
  }

  // ── 查詢 ──────────────────────────────────────────────

  get paused() {
    return RESUMABLE.has(this.state);
  }

  /** 是否可判定（正確／跳過／犯規） */
  canJudge() {
    return JUDGEABLE.has(this.state);
  }

  /** 是否可撤回 */
  canUndo() {
    return UNDOABLE.has(this.state);
  }

  /** 是否可暫停 */
  canPause() {
    return PAUSABLE.has(this.state);
  }

  /** 是否可解除暫停 */
  canResume() {
    return RESUMABLE.has(this.state);
  }

  /** 是否可開始下一回合 */
  canNextTurn() {
    return this.state === State.INTERSTITIAL;
  }

  /** 是否正在計時（供 UI 決定要不要跑 timer） */
  isTimerActive() {
    return this.state === State.PLAYING;
  }

  // ── 轉移 ──────────────────────────────────────────────

  /**
   * 嘗試轉移到目標狀態。
   * @returns {boolean} 成功與否（strict 模式下非法轉移直接拋錯）
   */
  go(to) {
    if (!ALL_STATES.has(to)) {
      throw new StateError(this.state, to);
    }
    const allowed = TRANSITIONS[this.state];
    if (!allowed || !allowed.has(to)) {
      if (this.strict) throw new StateError(this.state, to);
      return false;
    }
    this.state = to;
    this.history.push(to);
    return true;
  }

  /** 開始遊戲（IDLE/US DONE → READY） */
  start() {
    return this.go(State.READY);
  }

  /** READY → COUNTDOWN */
  goCountdown() {
    return this.go(State.COUNTDOWN);
  }

  /** COUNTDOWN → PLAYING */
  begin() {
    return this.go(State.PLAYING);
  }

  /** 暫停：PLAYING → PAUSED_PLAYING，COUNTDOWN → PAUSED_COUNTDOWN */
  pause() {
    if (!this.canPause()) return false;
    if (this.state === State.PLAYING) return this.go(State.PAUSED_PLAYING);
    if (this.state === State.COUNTDOWN) return this.go(State.PAUSED_COUNTDOWN);
    return false;
  }

  /** 解除暫停：回到暫停前的階段 */
  resume() {
    const target = RESUME_TARGET[this.state];
    if (!target) return false;
    return this.go(target);
  }

  /** 回合結束：PLAYING / PAUSED_PLAYING → INTERSTITIAL */
  turnEnd() {
    return this.go(State.INTERSTITIAL);
  }

  /** 下一回合：INTERSTITIAL → READY */
  nextTurn() {
    return this.go(State.READY);
  }

  /** 全部結束：INTERSTITIAL → DONE */
  finish() {
    return this.go(State.DONE);
  }

  /** 中止遊戲，回到 IDLE（退出／返回設定）。已在 IDLE 時視為成功（idempotent）。 */
  abort() {
    if (this.state === State.IDLE) return true;
    return this.go(State.IDLE);
  }

  /** 重設（測試用） */
  reset() {
    this.state = State.IDLE;
    this.history = [State.IDLE];
  }
}

export default GameStateMachine;
