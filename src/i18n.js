/**
 * 國際化（中／英）
 *
 * 從 app.js 抽取（原 L4-L175）。設計維持與原版完全一致：
 * - 偏好存 localStorage["beasttv.lang"]，預設中文
 * - 字典 key 用中文原文，值是英文
 * - T(zh) 在 en 模式查字典，查不到回原文
 * - translateTree() 走訪文字節點，處理 title／aria-label／placeholder
 *
 * 不可改動的相容性約定
 * ──────────────────────
 * - localStorage 鍵名必須是 "beasttv.lang"
 * - 字典 key 必須用中文原文（既有翻譯資料靠這個對應）
 * - 查不到 key 時回傳原文，不可回傳 undefined 或空字串
 */

export const LANG_KEY = "beasttv.lang";

let LANG = (() => {
  try {
    return localStorage.getItem(LANG_KEY) === "en" ? "en" : "zh";
  } catch (_) {
    return "zh";
  }
})();

/** 取得目前語言 */
export function getLang() {
  return LANG;
}

/** 設定語言並持久化 */
export function setLang(lang) {
  LANG = lang === "en" ? "en" : "zh";
  try {
    localStorage.setItem(LANG_KEY, LANG);
  } catch (_) {}
  return LANG;
}

/** 切換語言，回傳新語言 */
export function toggleLang() {
  return setLang(LANG === "en" ? "zh" : "en");
}

/**
 * 是否英文模式。
 * 用函式而非 getter，是因為呼叫方常寫 `LANG === "en"`，
 * 用函式能保持呼叫點意圖清楚。
 */
export function isEn() {
  return LANG === "en";
}

/** 中英字典。key 為中文原文，值為英文。 */
export const EN = {
  "百獸台": "Beast TV",
  "派對猜詞主持台": "Party word-guessing game",
  "開始": "Start",
  "設定": "Settings",
  "繼續": "Continue",
  "準備好": "Ready",
  "犯規": "Foul",
  "跳過": "Skip",
  "正確": "Correct",
  "上一步": "Back",
  "上一步（Esc）": "Back (Esc)",
  "開始遊戲": "Start game",
  "隊伍數量": "Teams",
  "每隊回合數": "Rounds per team",
  "每回合秒數": "Seconds per round",
  "每回合可跳次數": "Skips per round",
  "可以跳過": "Allow skipping",
  "跳過扣分": "Skipping costs 1",
  "犯規扣分": "Foul costs 1",
  "選擇隊色": "Pick a colour",
  "更改隊色": "Change colour",
  "減少一隊": "Fewer teams",
  "增加一隊": "More teams",
  "減少回合": "Fewer rounds",
  "增加回合": "More rounds",
  "減少可跳次數": "Fewer skips",
  "增加可跳次數": "More skips",
  "跳過，不限次數": "Skip, unlimited",
  "跳過（↓）不限次數": "Skip (↓) · unlimited",
  "跳過 ∞": "Skip ∞",
  "沒有可撤回的判定": "Nothing to undo",
  "已撤回上一個判定": "Undone",
  "撤回上一個判定": "Undo last call",
  "撤回上一個判定（↑）": "Undo last call (↑)",
  "回報問題": "Report",
  "回報問題（空白題目等）": "Report a problem (blank question etc.)",
  "已回報，多謝": "Reported, thanks",
  "回報未送出，已存本機": "Report saved on this device",
  "退出遊戲": "Exit game",
  "暫停": "Pause",
  "暫停（Esc）": "Pause (Esc)",
  "重試載入": "Retry loading",
  "題目尚未載入": "Questions not loaded yet",
  "題目尚未載入，重新連線中…": "Questions not loaded — reconnecting…",
  "題目尚未連線，正在重試…": "Not connected — retrying…",
  "題目已用完，正在重新洗牌": "Out of questions — reshuffling",
  "一行一題，任何人皆可修改": "One question per line",
  "先設定題目": "Set up questions",
  "登出": "Log out",
  "登入 / 註冊": "Log in / Sign up",
  "已登入：": "Signed in: ",
  "烏龜隊": "Turtle",
  "狐狸隊": "Fox",
  "鯨魚隊": "Whale",
  "章魚隊": "Octopus",
  "蜜蜂隊": "Bee",
  "火烈鳥隊": "Flamingo",
  "海豚隊": "Dolphin",
  "棕熊隊": "Bear",
  "正確加一": "Correct +1",
  "正確減一": "Correct −1",
  "犯規加一": "Foul +1",
  "犯規減一": "Foul −1",
  "跳過加一": "Skip +1",
  "跳過減一": "Skip −1",
  "正確（→）": "Correct (→)",
  "犯規（←）": "Foul (←)",
  "跳過（↓）": "Skip (↓)",
  "更改第 ${i+1} 隊的隊色": "Change colour of team ${i+1}",
  "版權聲明": "Legal",
  "GitHub 原始碼": "Source on GitHub",
  "有多少隊參賽？": "How many teams?",
  "最少 2 隊，最多 8 隊": "2 to 8 teams",
  "每隊出場幾回合？": "Turns per team?",
  "1 至 5 回合": "1 to 5 turns",
  "為每一隊命名": "Name each team",
  "每回合時間": "Time per turn",
  "秒": "sec",
  "規則": "Rules",
  "主持可按「↓ 跳過」直接換下一題": "Press ↓ to skip a question",
  "每回合可跳": "Skips per turn",
  "用完之後不能再跳": "No skips left after these",
  "跳過扣 1 分": "Skipping costs 1 point",
  "每跳過一題，該隊扣一分": "Each skip: −1 point",
  "犯規扣 1 分": "A foul costs 1 point",
  "每犯規一次，該隊扣一分": "Each foul: −1 point",
  "最終排名": "Final standings",
  "返回主頁": "Back to home",
  "退出遊戲？": "Exit the game?",
  "本局成績將不會記錄。": "This game will not be recorded.",
  "取消": "Cancel",
  "退出": "Exit",
  "選擇動物與隊色": "Choose an animal and colour",
  "時間到！": "Time's up!",
  "切換語言": "Switch language",
  "撤回": "Undo",
  "撤回上一個判定": "Undo last call",
  "鍵盤快捷鍵": "Keyboard shortcuts",
  "更改": "Change",
  "按鍵…": "Press a key",
  "還原預設": "Reset to default",
  "完成": "Done",
  "按一下右邊的鍵，再按鍵盤上的新鍵。Esc 取消。": "Tap the key on the right, then press a new one. Esc cancels.",
  "繼續（Esc）": "Continue (Esc)",
  "題": "questions",
  "分": "pts",
  "中文": "中文",
  "隊名": "Team name",
  "用完之後不能再跳：「": "No more skips after these run out",
  "全場答對": "Correct"
};

/**
 * 翻譯單一字串。
 * @param {string} zh 中文原文
 * @returns {string} 英文模式下查字典，查不到或中文模式回原文
 */
export function T(zh) {
  return LANG === "en" ? EN[zh] || zh : zh;
}

/**
 * 走訪 DOM 樹，把文字節點與屬性換成對應語言。
 * 題目本身（#pText 內）不翻譯。
 */
export function translateTree(root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) {
    const p = n.parentElement;
    if (p && p.closest("#pText,script,style")) continue; // 題目本身唔翻譯
    /* 內容被程式重寫過（或第一次見）就重新記原文；否則用快取。
       之前只認 __zh === undefined，令「先寫英文再切中文」同「空節點後來填字」都會卡死。 */
    if (n.__zh === undefined || n.nodeValue !== n.__applied) n.__zh = n.nodeValue;
    const key = String(n.__zh).trim();
    if (!key) {
      n.__applied = n.nodeValue;
      continue;
    }
    const en = EN[key];
    n.nodeValue = LANG === "en" && en ? n.__zh.replace(key, en) : n.__zh;
    n.__applied = n.nodeValue;
  }
  if (!root.querySelectorAll) return;
  const attrMap = { title: "title", "aria-label": "aria-label", placeholder: "placeholder" };
  for (const sel of ["[title]", "[aria-label]", "[placeholder]"]) {
    for (const el of root.querySelectorAll(sel)) {
      for (const attr of Object.keys(attrMap)) {
        const v = el.getAttribute(attr);
        if (!v) continue;
        if (el.__zh_attr === undefined) el.__zh_attr = {};
        if (el.__zh_attr[attr] === undefined || v !== el.__applied_attr?.[attr]) {
          el.__zh_attr[attr] = v;
        }
        const key = String(el.__zh_attr[attr]).trim();
        const en = EN[key];
        if (en) {
          if (!el.__applied_attr) el.__applied_attr = {};
          el.setAttribute(attr, LANG === "en" ? en : el.__zh_attr[attr]);
          el.__applied_attr[attr] = el.getAttribute(attr);
        }
      }
    }
  }
}

export default { LANG_KEY, getLang, setLang, toggleLang, isEn, EN, T, translateTree };
