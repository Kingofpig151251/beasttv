/**
 * DOM 存取集中層
 *
 * 目的
 * ────
 * 原 app.js 有 144 處硬編碼查詢（74 個不同 id + 1 個 getElementById + 2 個 class），
 * 字串分散各處，打錯字要等執行時才炸，也難以看出「這個 id 有沒有對應 HTML」。
 *
 * 這裡做三件事：
 * 1. $() / $$() 包裝，行為與原版一致（查不到回 null / 空陣列，不拋錯）
 * 2. ID 常數集中，打錯字變成 undefined 而非靜默查不到
 * 3. 提供 all IDs 清單，供靜態檢查比對 HTML
 *
 * 相容性
 * ──────
 * - $ 查不到時回 null（與 document.querySelector 相同），呼叫方本來就會自行判空
 * - $$ 回真正的 Array（原版用 [...querySelectorAll]，本層回 Array.from，行為相同）
 * - 不引入快取，每次查都走 DOM，避免動態重建的元素拿到舊節點
 */

/** 所有用到的元素 id（不含 #）。名稱即 HTML 中的 id。 */
export const ID = Object.freeze({
  // 頁面容器
  V_SETUP: "v-setup",
  V_PLAY: "v-play",
  V_RESULT: "v-result",
  LAUNCH: "launch",

  // 設定頁
  TEAM_MINUS: "teamMinus",
  TEAM_PLUS: "teamPlus",
  TEAM_INPUT: "teamInput",
  NAME_LIST: "nameList",
  RP_MINUS: "rpMinus",
  RP_PLUS: "rpPlus",
  RP_INPUT: "rpInput",
  SEC_INPUT: "secInput",
  SW_SKIP: "swSkip",
  SW_SKIP_PEN: "swSkipPen",
  SW_FOUL_PEN: "swFoulPen",
  BTN_ENTER: "btnEnter",
  BTN_EDIT_HOME: "btnEditHome",
  BTN_LANG: "btnLang",
  MY_BANK: "myBank",

  // 倒數
  COUNTDOWN: "countdown",
  CD_NUM: "cdNum",
  CD_PROG: "cdProg",
  CD_TEAM: "cdTeam",
  RING_PROG: "ringProg",

  // 遊戲中
  HUD: "hud",
  GATE: "gate",
  P_TEXT: "pText",
  P_CLOCK: "pClock",
  BTN_PAUSE: "btnPause",
  BTN_UNDO: "btnUndo",
  BTN_READY: "btnReady",
  BTN_NEXT: "btnNext",
  BTN_BACK_HOME: "btnBackHome",
  BTN_QUIT_FLOAT: "btnQuitFloat",
  BTN_STEP_BACK: "btnStepBack",
  READY_OVERLAY: "readyOverlay",
  STEP_PROGRESS: "stepProgress",
  TURN_CHIP: "turnChip",
  TURN_MARK: "turnMark",
  TURN_NAME: "turnName",
  TOAST: "toast",

  // 回合結算
  ROUND_SUM: "roundSum",
  RD_TEAM: "rdTeam",
  RD_ROUND: "rdRound",
  RD_MARK: "rdMark",
  RD_SCORES: "rdScores",
  R_SUB: "rSub",
  SC_MINUS: "scMinus",
  SC_PLUS: "scPlus",
  SC_VAL: "scVal",
  ST_OK: "stOk",
  ST_FOUL: "stFoul",
  ST_SKIP: "stSkip",
  TE_NEXT: "teNext",
  TE_NAME: "teName",
  TE_MARK: "teMark",
  TE_SCORE: "teScore",
  TE_STATS: "teStats",
  BTN_REPORT: "btnReport",

  // 最終排名
  RANK_LIST: "rankList",
  CONFETTI: "confetti",

  // 動物選擇視窗
  ANIMAL_SHEET: "animalSheet",
  ANIMAL_GRID: "animalGrid",
  ANIMAL_CANCEL: "animalCancel",

  // 退出確認
  EXIT_SHEET: "exitSheet",
  EXIT_CANCEL: "exitCancel",
  EXIT_CONFIRM: "exitConfirm",
  EXIT_TITLE: "exitTitle",
  EXIT_NOTE: "exitNote",
  BTN_EXIT: "btnExit",

  // 按鍵設定
  KEY_ROWS: "keyRows",
  KEYS_RESET: "keysReset",
  RULE_SKIP: "ruleSkip",
  RULE_SKIP_CAP: "ruleSkipCap",
  RULE_SKIP_PEN: "ruleSkipPen",
  RULE_FOUL_PEN: "ruleFoulPen",

  // 對戰板
  VS_BOARD: "vsBoard",

  // 首頁 / 品牌
  V_HOME: "v-home",
  BRAND_TITLE: "brandTitle",
  BRAND_SUB: "brandSub",
  LINK_AUTHOR: "linkAuthor",
  LINK_RIGHTS: "linkRights",
  BACK_HOME: "backHome",

  // 進度指示
  STAGE: "stage",
  STEP_STAGE: "stepStage",
  STEP_DOTS: "stepDots",
  SEC_CHIPS: "secChips",
  META: "meta",

  // 結算卡
  TE_CARD: "teCard",

  // 閘門
  GATE_TEXT: "gateText",
  GATE_BACK: "gateBack",

  // 登入 / 註冊
  AUTH_FORM: "authForm",
  AUTH_GO: "authGo",
  AUTH_SWAP: "authSwap",
  AUTH_TITLE: "authTitle",
  AUTH_USER: "authUser",
  AUTH_PASS: "authPass",
  AUTH_CODE: "authCode",
  AUTH_ERR: "authErr",
  AUTH_SUB: "authSub",

  // edit.html
  STATE: "state",
  TEXT: "text",
  TEXT_LABEL: "textLabel",
});

/**
 * 原 app.js 有查、但 HTML 中不存在的 id。
 *
 * 這些是既有程式的死路徑：app.js 用 if(qc) / if(qh) 判空，
 * 所以不會拋錯，但對應 UI 永遠不會更新。
 * 保留清單是為了重寫時能明確知道「這兩個是原本就壞的，不是我漏掉」。
 * 重寫時若要修，需先與使用者確認（屬於行為變更）。
 */
export const DEAD_IDS = Object.freeze({
  Q_COUNT: "qCount",
  Q_HINT: "qHint",
});

/** 所有 class 選擇器用到的名稱 */
export const CLS = Object.freeze({
  VIEW: "view",
  SSTEP: "sstep",
});

/**
 * 查單一元素。
 * @param {string} sel CSS 選擇器
 * @param {ParentNode} [root=document] 查找根
 * @returns {Element|null}
 */
export function $(sel, root) {
  return (root || document).querySelector(sel);
}

/**
 * 查多個元素，回傳真正的 Array。
 * @param {string} sel CSS 選擇器
 * @param {ParentNode} [root=document]
 * @returns {Element[]}
 */
export function $$(sel, root) {
  return Array.from((root || document).querySelectorAll(sel));
}

/**
 * 依 id 常數查元素（自動補 #）。
 * 傳入未知 id 時回 null，不拋錯，與 $() 一致。
 * @param {string} id
 * @param {ParentNode} [root=document]
 * @returns {Element|null}
 */
export function byId(id, root) {
  return $("#" + id, root);
}

/** 全部 id 的字串清單，供靜態檢查比對 HTML。 */
export function allIds() {
  return Object.values(ID);
}

export default { ID, CLS, $, $$, byId, allIds };
