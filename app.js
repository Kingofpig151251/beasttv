"use strict";

/* ================= 語言 ================= */
const LANG_KEY = "beasttv.lang";
let LANG = (()=>{ try{ return localStorage.getItem(LANG_KEY) === "en" ? "en" : "zh"; }catch(_){ return "zh"; } })();
const EN = {
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
const T = (zh)=> LANG === "en" ? (EN[zh] || zh) : zh;

const ATTR_I18N = ["title","aria-label","placeholder"];
function translateTree(root){
  if(!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while(walker.nextNode()) nodes.push(walker.currentNode);
  for(const n of nodes){
    const p = n.parentElement;
    if(p && (p.closest("#pText,script,style") )) continue;   // 題目本身唔翻譯
    /* 內容被程式重寫過（或第一次見）就重新記原文；否則用快取。
       之前只認 __zh === undefined，令「先寫英文再切中文」同「空節點後來填字」都會卡死。 */
    if(n.__zh === undefined || n.nodeValue !== n.__applied) n.__zh = n.nodeValue;
    const key = String(n.__zh).trim();
    if(!key){ n.__applied = n.nodeValue; continue; }
    const en = EN[key];
    n.nodeValue = (LANG === "en" && en) ? n.__zh.replace(key, en) : n.__zh;
    n.__applied = n.nodeValue;
  }
  if(!root.querySelectorAll) return;
  root.querySelectorAll("[title],[aria-label],[placeholder]").forEach(el=>{
    for(const a of ATTR_I18N){
      if(!el.hasAttribute(a)) continue;
      const store = "__zh_" + a.replace("-","_"), applied = store + "_ap";
      const cur = el.getAttribute(a);
      if(el[store] === undefined || cur !== el[applied]) el[store] = cur;
      const src = el[store];
      const en = EN[String(src).trim()];
      const out = (LANG === "en" && en) ? en : src;
      el.setAttribute(a, out);
      el[applied] = out;
    }
  });
}

function setLang(next){
  LANG = next === "en" ? "en" : "zh";
  try{ localStorage.setItem(LANG_KEY, LANG); }catch(_){}
  document.documentElement.lang = LANG === "en" ? "en" : "zh-Hant-HK";
  const lb = document.getElementById("btnLang");
  if(lb) lb.textContent = LANG === "en" ? "中文" : "English";
  applyBrand(BRAND_RAW.t, BRAND_RAW.s, false);   // 品牌名按語言重譯
  translateTree(document.body);
  if(G){ syncSkipBtn(); }                     // 跳過鍵嘅 aria/title 係即時組字，要跟語言重算
  applyKeys();                                // 鍵位提示同樣係即時組字
  if(G && G.phase === "running") renderPlay();
  else if(document.body.dataset.view === "home") renderHome();
  else renderSetup();
}
const btnLang = document.getElementById("btnLang");
if(btnLang) btnLang.addEventListener("click", ()=>{
  const b = document.getElementById("btnLang");
  b.__tapAt = 0;                                  // 語言鍵唔受 260ms 防連按影響
  setLang(LANG === "en" ? "zh" : "en");
});


/* ================= 狀態 ================= */
const K_CFG="beaststage.cfg.v3", K_CFG_OLD=["baishoutai.cfg.v3","bigtv.cfg.v3"];   // 題目不存本機，只存雲端
const store = {
  get(k,d){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } },
  set(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }
};

let lines = [];                                  // 題目：一行一題
/* 8 個動物 SVG（單色，跟 currentColor；唔靠 emoji 字型） */
/* 8 個動物圖示：Twemoji（CC-BY 4.0, github.com/jdecked/twemoji）— 內嵌 SVG，唔靠字型 */
const TEAM_IDS = ["turtle","fox","whale","octopus","bee","flamingo","dolphin","bear"];
const ICONS = Object.fromEntries(TEAM_IDS.map(id =>
  [id, `<img class="mark-img" src="/art/team/${id}.webp" alt="" decoding="async">`]));

/* 隊伍動物：名稱、圖示、顏色三者綁定；改動物＝改色，但唔會覆蓋自己改過嘅隊名 */
const ANIMALS = [
  { id:"turtle", name:"烏龜隊", color:"#34C759" },
  { id:"fox", name:"狐狸隊", color:"#FF9500" },
  { id:"whale", name:"鯨魚隊", color:"#0071E3" },
  { id:"octopus", name:"章魚隊", color:"#AF52DE" },
  { id:"bee", name:"蜜蜂隊", color:"#F5A300" },
  { id:"flamingo", name:"火烈鳥隊", color:"#FF2D55" },
  { id:"dolphin", name:"海豚隊", color:"#30B0C7" },
  { id:"bear", name:"棕熊隊", color:"#A2845E" }
];
const animalById = id => ANIMALS.find(a=>a.id===id) || ANIMALS[0];
const animalLabel = a => T(a.name);              // 顯示時才翻譯，切語言即刻跟
const animalAt = i => animalById((cfg.animals && cfg.animals[i]) || ANIMALS[i % ANIMALS.length].id);
const teamName = i => (cfg.custom && cfg.custom[i] && cfg.names[i])
  ? cfg.names[i] : animalLabel(animalAt(i));

let cfg  = Object.assign({
  teams:4,
  names:ANIMALS.slice(0,8).map(a=>a.name),
  animals:ANIMALS.map(a=>a.id),
  sec:90,
  allowSkip:true,      // 可否跳過
  skipPenalty:false,   // 跳過扣 1 分
  foulPenalty:true,    // 犯規扣 1 分（預設開，符合賽例）
  roundsPer:2,         // 每隊出場回合數
  skipCap:3            // 每回合最多跳幾條
}, store.get(K_CFG, K_CFG_OLD.reduce((acc,k)=>acc || store.get(k, null), null) || {}));
cfg.allowSkip = cfg.allowSkip !== false;
cfg.skipPenalty = !!cfg.skipPenalty;
cfg.foulPenalty = !!cfg.foulPenalty;
cfg.roundsPer = Math.max(1, Math.min(5, Math.round(+cfg.roundsPer || 2)));
cfg.skipCap = (cfg.skipCap === 0 || cfg.skipCap === "0") ? 0
  : Math.max(1, Math.min(10, Math.round(+cfg.skipCap || 3)));   // 0 = 無限

cfg.teams = Math.max(2, Math.min(8, Math.round(+cfg.teams || 2)));
if(!Array.isArray(cfg.names)) cfg.names = ANIMALS.slice(0,8).map(a=>a.name);
if(!Array.isArray(cfg.animals)) cfg.animals = [];
if(!Array.isArray(cfg.custom)) cfg.custom = [];
ANIMALS.forEach((a,i)=>{ if(!cfg.animals[i]) cfg.animals[i] = a.id; });

/* 動物不可重複：只計現役隊伍；未上場嘅槽位自動補位 */
function ensureUniqueAnimals(){
  const used = new Set();
  for(let i=0;i<cfg.teams;i++){
    let id = cfg.animals[i];
    if(!id || used.has(id)) id = ANIMALS.find(a=>!used.has(a.id)).id;
    cfg.animals[i] = id; used.add(id);
  }
  for(let i=cfg.teams;i<ANIMALS.length;i++){
    if(!cfg.animals[i] || used.has(cfg.animals[i])) cfg.animals[i] = ANIMALS.find(a=>!used.has(a.id)).id;
    used.add(cfg.animals[i]);
  }
}
ensureUniqueAnimals();

let G = null;
let REMOTE = { ok:false };

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

function esc(s){ return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

/* 題目一律以 {t:"..."} 存；舊格式（字串 / {t,ban}）都食得住 */
/* 題庫 slug：/b/<slug> 或 ?b=<slug>，默認 default */
/* 帳號：登入後每個人都係自己一份題庫；/b/<slug> 只係「玩某人嘅題庫」嘅公開連結 */
const TOKEN = ()=> localStorage.getItem("beasttv.token") || "";
const URL_BANK = (()=>{
  const m = location.pathname.match(/^\/b\/([a-z0-9][a-z0-9-]{1,31})\/?$/i);
  const q = new URLSearchParams(location.search).get("b");
  const v = (m ? m[1] : q || "").toLowerCase();
  return /^[a-z0-9][a-z0-9-]{1,31}$/.test(v) ? v : "";
})();
let BANK = URL_BANK || "default";
let ME = null;                                  // {username, bank:{slug,name}}
const apiUrl = (p)=> p + (p.includes("?") ? "&" : "?") + "b=" + encodeURIComponent(BANK);

function parseText(raw){
  const seen = new Set();
  return String(raw || "").split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith("#"))
    .filter(l => {
      const k = l.replace(/\s+/g,"").toLowerCase();
      if(seen.has(k)) return false;
      seen.add(k); return true;
    })
    .map(l => l.slice(0,60));
}
function saveCfg(){ store.set(K_CFG, cfg); }

function showView(id){
  $$(".view").forEach(v=>v.classList.toggle("active", v.id===id));
  document.body.dataset.view = id.replace(/^v-/, "");
  window.scrollTo(0,0);
}
let toastT=null;
function toast(msg, ms=1800){
  const el=$("#toast");
  el.textContent=msg;
  el.classList.toggle("multi", String(msg).includes("\n"));
  el.classList.add("on");
  clearTimeout(toastT); toastT=setTimeout(()=>el.classList.remove("on"), ms);
}
/* 吐司唔攔截觸控：以前 pointer-events:auto 會蓋住正中嘅「跳過」鍵 */
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

/* ================= 品牌（可由 /edit 自訂） ================= */
const BRAND_DEF = { title: "百獸台", sub: "派對猜詞主持台" };   // 預設品牌（按語言翻譯）
let BRAND_RAW = { t: "", s: "" };                                // 伺服器／自訂品牌，空＝用預設
const BRAND_KEY = "beastbrand.v1";

/* 開頁即用上次的品牌（冇快取就暫時收埋標題，避免先閃「百獸台」再變） */
(function(){
  let c = null;
  try{ c = JSON.parse(localStorage.getItem(BRAND_KEY) || "null"); }catch(e){}
  if(c && c.t){ applyBrand(c.t, c.s, false); }
  else{ document.documentElement.classList.add("brand-pending"); }
  setTimeout(()=>document.documentElement.classList.remove("brand-pending"), 1400);
  applyBrand("", "", false);                       // 先用預設品牌寫好分頁標題，唔好等題庫
})();

function applyBrand(title, sub, save){
  const h = document.querySelector(".landing-title");
  const p = document.querySelector(".landing-sub");
  if(!h || !p) return;
  const rawT = String(title ?? BRAND_RAW.t ?? "").trim();
  const rawS = String(sub ?? BRAND_RAW.s ?? "").trim();
  BRAND_RAW = { t: rawT, s: rawS };
  const t = rawT || T(BRAND_DEF.title);
  const s = rawS || T(BRAND_DEF.sub);
  h.textContent = t;
  p.textContent = s;
  /* 拉丁字比中文窄：英文用較寬的長度門檻，避免「Beast TV」被降兩級字階 */
  const n = t.length;
  h.dataset.len = LANG === "en" ? (n > 16 ? "long" : n > 10 ? "mid" : "")
                                : (n > 8 ? "long" : n > 5 ? "mid" : "");
  document.title = s ? `${t} · ${s}` : t;
  document.documentElement.classList.remove("brand-pending");
  if(save){ try{ localStorage.setItem(BRAND_KEY, JSON.stringify(BRAND_RAW)); }catch(e){} }
}

/* ================= 後端 ================= */
async function pullText(){
  try{
    const r = await fetch(apiUrl("/api/text"), {cache:"no-store"});
    if(!r.ok) throw new Error("bad status");
    const d = await r.json();
    lines = parseText(d.text);
    applyBrand(d.title, d.subtitle, true);
    REMOTE.ok = true;
    renderHome();
  }catch(e){
    REMOTE.ok = false;
    document.documentElement.classList.remove("brand-pending");   // 離線都用預設，唔好一路收埋
    renderHome();
  }
}

/* ================= VFX ================= */
function fxOk(){
  const q = document.querySelector(".question");
  q.classList.remove("fx-ok","fx-skip","fx-bad","fx-down","fx-left","fx-right"); void q.offsetWidth;
  q.classList.add("fx-right");                 // 放大淡出（CSS: wordOutZoom）
}

/* +1 / −1 分數浮字 */
function fxScore(delta){
  const q = document.querySelector(".question"); if(!q) return;
  const el = document.createElement("span");
  el.className = "fx-score " + (delta < 0 ? "minus" : "plus");
  el.textContent = (delta < 0 ? "−" : "+") + Math.abs(delta);
  q.appendChild(el);
  setTimeout(()=>el.remove(), 900);
}
function fxFoul(bad){
  const q = document.querySelector(".question");
  q.classList.remove("fx-ok","fx-skip","fx-bad","fx-down","fx-left","fx-right"); void q.offsetWidth;
  q.classList.add("fx-left");                  // 震動（CSS: fxShake）
  if(bad) q.classList.add("fx-bad");
}
function fxSkipDown(){
  const q = document.querySelector(".question");
  q.classList.remove("fx-ok","fx-skip","fx-bad","fx-down","fx-left","fx-right"); void q.offsetWidth;
  q.classList.add("fx-down");
}

/* ================= 主頁 / 設定流程 ================= */
const SETUP = { i:0 };
const LAST_STEP = 5;

function renderHome(){
  // 入口頁：一行現況
  renderSetup();
  paintEnter();
}

/* 空白題庫（例如啱啱開嘅新題庫）：主鍵改帶去設定，唔好撳落去得一句錯誤 */
function paintEnter(){
  const b = $("#btnEnter"); if(!b) return;
  const empty = REMOTE.ok && lines.length === 0 && !!ME;   // 只有自己帳號嘅空白題庫才帶去設定
  b.textContent = empty ? T("先設定題目") : T("開始");
  b.dataset.mode = empty ? "setup-bank" : "";
  const set = $("#btnEditHome"); if(set) set.hidden = empty;   // 空白題庫時，主鍵已經帶去設定，唔好兩個鍵指同一件事
}
$("#btnEnter").addEventListener("click", (e)=>{
  if($("#btnEnter").dataset.mode === "setup-bank"){
    e.preventDefault(); e.stopPropagation();
    location.href = "/edit?b=" + encodeURIComponent(BANK);
  }
}, true);

function renderSetup(){
  translateTree(document.body);
  const qc = $("#qCount");
  if(qc) qc.innerHTML = lines.length ? `${lines.length}<span class="unit">${LANG==="en"?"questions":"題"}</span>` : "";
  const qh = $("#qHint");
  if(qh) qh.textContent = lines.length ? T("一行一題，任何人皆可修改") : T("題目尚未連線，正在重試…");
  $("#teamInput").value = cfg.teams;
  $("#teamMinus").disabled = cfg.teams <= 2;
  $("#teamPlus").disabled  = cfg.teams >= 8;
  const rp = $("#rpInput");
  if(rp){
    rp.value = cfg.roundsPer;
    $("#rpMinus").disabled = cfg.roundsPer <= 1;
    $("#rpPlus").disabled  = cfg.roundsPer >= 5;
  }
  const sum = $("#roundSum");
  if(sum) sum.textContent = LANG === "en" ? `${cfg.teams} teams × ${cfg.roundsPer} rounds = ${cfg.teams * cfg.roundsPer} turns` : `${cfg.teams} 隊 × ${cfg.roundsPer} 回合 = 共 ${cfg.teams * cfg.roundsPer} 回合`;

  $("#nameList").innerHTML = Array.from({length:cfg.teams},(_,i)=>{
    const a = animalAt(i);
    return `<div class="name-row" style="--tc:${a.color}">
      <button class="animal-btn" data-animal="${i}" aria-label="${esc(T("更改隊色"))} ${i+1}" title="${esc(T("更改隊色"))}">
        <span class="animal-mark">${ICONS[a.id]}</span>
        <svg class="animal-edit" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16v4z"/></svg>
      </button>
      <input data-name="${i}" value="${esc(teamName(i))}" maxlength="12" autocomplete="off">
    </div>`;
  }).join("");
  $$("#nameList input").forEach(inp=>inp.onchange=()=>{
    const i = +inp.dataset.name;
    const v = inp.value.trim();
    const zhName = animalAt(i).name;
    cfg.names[i] = v || zhName;
    cfg.custom[i] = !!v && v !== zhName && v !== T(zhName);   // 手動改過就鎖住，換動物時唔覆蓋
    inp.value = LANG === "en" && !cfg.custom[i] ? T(zhName) : cfg.names[i];
    saveCfg(); syncNext();
  });
  $$("#nameList .animal-btn").forEach(btn=>btn.onclick=()=>openAnimals(+btn.dataset.animal));

  $("#secInput").value = cfg.sec;
  $$("#secChips button").forEach(b=>b.setAttribute("aria-pressed", String(+b.dataset.sec === +cfg.sec)));
  syncNext();
}

function renderVsBoard(){
  const n = cfg.teams;
  const mark  = n <= 3 ? 96 : n <= 5 ? 68 : n <= 6 ? 58 : 48;
  const label = n <= 3 ? 44 : n <= 5 ? 30 : n <= 6 ? 26 : 21;
  const board = $("#vsBoard");
  if(!board) return;
  board.style.setProperty("--mark", mark + "px");
  board.style.setProperty("--label", label + "px");
  board.innerHTML = Array.from({length:n},(_,i)=>{
    const a = animalAt(i);
    return `<div class="vs-team" style="--tc:${a.color}">
      <span class="vs-mark">${ICONS[a.id]}</span>
      <span class="vs-label">${esc(teamName(i))}</span>
    </div>`;
  }).join("");
  board.dataset.count = n;
}

let animalTarget = 0;
function renderAnimalGrid(){
  const cur = animalAt(animalTarget).id;
  $("#animalGrid").innerHTML = ANIMALS.map(a=>{
    const owner = animalOwner(a.id, animalTarget);
    const taken = owner >= 0;
    return `<button class="animal-opt${a.id===cur?" on":""}${taken?" taken":""}" data-id="${a.id}"
      style="--tc:${a.color}" aria-pressed="${a.id===cur}" ${taken?"aria-disabled=\"true\" tabindex=\"-1\"":""}>
      <span class="opt-mark">${ICONS[a.id]}</span>
      <span class="opt-name">${esc(animalLabel(a))}</span>
    </button>`;
  }).join("");
  $$("#animalGrid .animal-opt").forEach(b=>{
    if(b.getAttribute("aria-disabled") === "true") return;
    b.onclick = ()=>selectAnimal(b.dataset.id);
  });
}
function openAnimals(i){
  animalTarget = i;
  renderAnimalGrid();
  $("#animalSheet").classList.add("on");
}
function closeAnimals(){ $("#animalSheet").classList.remove("on"); }
function animalOwner(id, except){
  for(let i=0;i<cfg.teams;i++) if(i !== except && cfg.animals[i] === id) return i;
  return -1;
}
function selectAnimal(id){
  const i = animalTarget;
  if(animalOwner(id, i) >= 0) return;            // 已被其他隊用，唔准重複
  const next = animalById(id);
  if(!cfg.custom[i]) cfg.names[i] = next.name;   // 只有未手動改過先跟住改名
  cfg.animals[i] = id;
  ensureUniqueAnimals();
  saveCfg(); renderSetup(); closeAnimals();
}

function syncNext(){
  const ok = lines.length > 0;
  const next = $("#btnNext");
  next.disabled = false;                       // 題目未載入時唔可以靜靜封死（派對現場會卡住、又冇提示）
  next.textContent = ok ? (SETUP.i < LAST_STEP ? T("繼續") : T("開始遊戲")) : T("重試載入");
}

function goStep(i, dir){
  SETUP.i = Math.max(0, Math.min(LAST_STEP, i));
  $$(".sstep").forEach(el=>{
    const k = +el.dataset.step;
    el.classList.toggle("on", k === SETUP.i);
    el.classList.toggle("back", k < SETUP.i || (dir < 0 && k > SETUP.i));
  });
  $$("#stepDots i").forEach((d,n)=>{
    d.classList.toggle("on", n <= SETUP.i);
    d.classList.toggle("cur", n === SETUP.i);
  });
  $("#btnNext").textContent = SETUP.i < LAST_STEP ? T("繼續") : T("開始遊戲");
  syncNext();
  if(SETUP.i === 2){
    const first = $("#nameList input");
    if(first) setTimeout(()=>first.focus({preventScroll:true}), 260);
  }
}

function startSetup(){
  renderSetup();
  if(SETUP.busy) return;
  SETUP.busy = true;
  document.body.classList.add("is-entering");   // 入口放大淡出
  setTimeout(()=>{
    document.body.classList.remove("is-entering");
    goStep(0, 1);
    showView("v-setup");
    SETUP.busy = false;
  }, 300);
}

const LAUNCH_TIMERS = [];
function clearLaunch(){
  LAUNCH_TIMERS.forEach(clearTimeout);
  LAUNCH_TIMERS.length = 0;
}
function skipLaunch(){
  clearLaunch();
  const veil = $("#launch");
  veil.classList.add("done");
  veil.classList.remove("closed","show","hide");
  requestAnimationFrame(()=>veil.classList.remove("done"));
  document.body.classList.remove("is-launch");
  if(!G) startGame();
  SETUP.busy = false;
}

function launchGame(){
  if(!lines.length){ toast(T("題目尚未載入")); return; }
  if(SETUP.busy) return;
  SETUP.busy = true;
  clearLaunch();
  const veil = $("#launch");
  renderVsBoard();

  document.body.classList.add("is-launch");                       // 1. 內容收走
  LAUNCH_TIMERS.push(setTimeout(()=>veil.classList.add("closed"), 160));  // 2. 上下兩幕夾合
  LAUNCH_TIMERS.push(setTimeout(()=>veil.classList.add("show"), 620));    // 3. 幕上出 VS
  LAUNCH_TIMERS.push(setTimeout(()=>veil.classList.add("hide"), 1900));   // 4. VS 淡出
  LAUNCH_TIMERS.push(setTimeout(()=>{                              // 5. 幕後換場景
    document.body.classList.remove("is-launch");
    startGame();
  }, 1980));
  LAUNCH_TIMERS.push(setTimeout(()=>veil.classList.remove("closed"), 2120)); // 6. 上下分開
  LAUNCH_TIMERS.push(setTimeout(()=>{                              // 7. 復位
    veil.classList.add("done");
    veil.classList.remove("show","hide");
    requestAnimationFrame(()=>veil.classList.remove("done"));
    SETUP.busy = false;
  }, 2660));
}

/* ================= 題庫管理（離線用） ================= */
/* ================= 遊戲流程 ================= */
let WAKE = null;
async function wakeOn(){
  if(!("wakeLock" in navigator)) return;
  try{
    WAKE = await navigator.wakeLock.request("screen");
    WAKE.addEventListener("release", ()=>{ WAKE = null; });
  }catch(e){ /* 省電模式／低電量會拒絕，靜默降級 */ }
}
function wakeOff(){
  if(!WAKE) return;
  try{ WAKE.release(); }catch(e){}
  WAKE = null;
}
document.addEventListener("visibilitychange", ()=>{
  if(document.visibilityState === "visible" && G && (G.phase === "running" || G.phase === "ready" || G.phase === "countdown")) wakeOn();
});

function startGame(){
  wakeOn();
  stopBgm();
  if(G){ clearInterval(G.timerId); G.timerToken++; }   // 清除上一局殘留的計時器
  const names = Array.from({length:cfg.teams},(_,i)=> teamName(i));
  const looks = Array.from({length:cfg.teams},(_,i)=>{ const a = animalAt(i); return { id:a.id, color:a.color }; });
  const pool = lines.map(t=>({ t }));
  if(!pool.length){ toast(T("題目尚未載入")); return; }

  const order = [];                                  // 每隊出場 2 次：A B C D → A B C D
  for(let r = 0; r < cfg.roundsPer; r++) for(let i = 0; i < names.length; i++) order.push(i);
  G = {
    sec: Math.max(5, Number(cfg.sec)||90),
    teams: names.map((n,i)=>({name:n, id:looks[i].id, color:looks[i].color, score:0, ok:0, skip:0, foul:0})),
    allowSkip: cfg.allowSkip, skipPenalty: cfg.skipPenalty, foulPenalty: cfg.foulPenalty,
    order, rounds: order.length,                 // turn = 第幾回合，隊伍 = order[turn]
    turn:0, skipCap: cfg.skipCap, skipLeft: cfg.skipCap,
    pool: shuffle(pool.slice()), used: [], cur:null,
    judged:0, paused:false, remaining:0, timerId:null, timerToken:0,
    phase:"ready"
  };
  const hud = $("#hud");
  if(hud){
    hud.classList.toggle("no-skip", !cfg.allowSkip);
    hud.classList.toggle("bad-pass", cfg.allowSkip && cfg.skipPenalty);
    hud.classList.toggle("bad-foul", cfg.foulPenalty);
  }
  showView("v-play");
  syncSkipBtn();
  enterReady();
}

const SKIP_CAP = 3;                                  // 每回合最多跳 3 條
const curTeam = ()=> G.teams[G.order[G.turn]];

/* 跳過掣顯示剩餘次數；用完即變灰 */
function syncSkipBtn(){
  const b = document.querySelector('[data-judge="skip"]');
  if(!b) return;
  const cap = G ? G.skipCap : SKIP_CAP;
  const left = G ? Math.max(0, G.skipLeft) : cap;
  const inf = cap === 0;
  b.textContent = inf ? T("跳過 ∞") : LANG === "en" ? `Skip ${left}/${cap}` : `跳過 ${left}/${cap}`;
  b.disabled = !G || !G.allowSkip || (!inf && left <= 0);
  b.setAttribute("aria-label", inf ? T("跳過，不限次數") : LANG === "en" ? `Skip · ${left} left` : `跳過，剩 ${left} 次`);
  b.setAttribute("title", inf ? T("跳過（↓）不限次數") : LANG === "en" ? `Skip (↓) · ${left} left` : `跳過（↓）剩 ${left} 次`);
}

/* 準備／倒數時浮動退出鍵；跑緊時收起（頂欄已有同一粒） */
const gateOn = () => $("#gate").classList.contains("on");

function syncQuitFloat(){
  const b = $("#btnQuitFloat"); if(!b) return;
  const on = !!G && G.phase === "ready"
             && !gateOn() && !$("#exitSheet").classList.contains("on");
  b.hidden = !on;
  if(on){
    b.dataset.mode = "exit";
    b.setAttribute("aria-label", T("退出遊戲"));
    b.setAttribute("title", T("退出遊戲"));
  }
}

/* 每隊出場前先停頓：不計時、不出題，待隊伍準備完成 */
function syncExitLabel(){
  const b = $("#btnExit"); if(!b) return;
  const back = isPristine();
  b.dataset.mode = back ? "back" : "exit";
  b.setAttribute("aria-label", back ? T("上一步") : T("退出遊戲"));
  b.setAttribute("title", back ? T("上一步（Esc）") : T("退出遊戲"));
}

function enterReady(){
  clearInterval(G.timerId);
  G.timerToken++;
  G.phase = "ready";
  G.cur = null;
  G.remaining = G.sec;
  G.paused = false;
  setPauseIcon(false);
  $("#rdRound").textContent = LANG === "en" ? `Round ${G.turn+1} of ${G.rounds}` : `第 ${G.turn+1} 回合，共 ${G.rounds} 回合`;
  const cur = curTeam();
  $("#rdMark").innerHTML = ICONS[cur.id] || "";
  $("#rdTeam").textContent = cur.name;
  $("#rdTeam").style.setProperty("--tc", cur.color);
  $("#readyOverlay").style.setProperty("--tc", cur.color);
  $("#rdScores").style.setProperty("--cols", String(Math.min(4, G.teams.length)));
  $("#rdScores").classList.toggle("many", G.teams.length > 4);
  $("#rdScores").innerHTML = G.teams.map((t,i)=>
    `<div class="score-tile${i===G.order[G.turn]?" cur":""}" style="--tc:${t.color}">
       <em class="pill-mark">${ICONS[t.id] || ""}</em>
       <span class="score-name">${esc(t.name)}</span>
       <b>${t.score}</b></div>`).join("");
  $("#btnReady").style.display = "";
  $("#readyOverlay").style.display = "flex";
  document.body.classList.add("is-ready");
  renderPlay();
  syncExitLabel();
  syncQuitFloat();
}

function hideReady(){
  $("#readyOverlay").style.display = "none";
  document.body.classList.remove("is-ready");
}

/* 音效：WebAudio 直接合成，唔使音檔 */
let AC = null;
function audioCtx(){
  const C = window.AudioContext || window.webkitAudioContext;
  if(!C) return null;
  if(!AC) AC = new C();
  if(AC.state === "suspended") AC.resume();
  return AC;
}
/* 音檔：判定用真音源（門鐘／子彈），其餘場合仍用合成音 */
const SFX_SRC = { ding: "/sfx/dingdong.mp3", whoosh: "/sfx/whoosh.mp3", heart: "/sfx/hb3.mp3",
                   countdown: "/sfx/countdown.mp3", whistle: "/sfx/whistle.mp3",
                   settle: "/sfx/settle.mp3", champion: "/sfx/champion.mp3",
                   tick: "/sfx/tick.mp3", drums: "/sfx/drums.mp3", snare: "/sfx/snare.mp3",
                   foul: "/sfx/foul.mp3", tap: "/sfx/tap.mp3" };
const SFX = {};
let SFX_LOADING = false;
/* 分層載入：頁面一開就備好判定用的四聲（26KB），其餘等第一次觸碰才拉。
   全部一次過拉會令第一下按掣冇聲——loadSfx 同 pointerdown 同時開始，buffer 未 decode 完。 */
const SFX_CORE = ["tap","ding","whoosh","tick"];
const SFX_REST = ["countdown","whistle","settle","champion","drums","snare","foul","heart"];
async function loadSfx(keys){
  const c = audioCtx(); if(!c || !keys) return;
  const todo = keys.filter(k => !SFX[k]);
  if(!todo.length) return;
  SFX_LOADING = true;
  await Promise.all(todo.map(async (k)=>{
    try{
      const r = await fetch(SFX_SRC[k], {cache:"force-cache"});
      SFX[k] = await c.decodeAudioData(await r.arrayBuffer());
    }catch(e){ /* 音檔拿不到就靜靜留空，唔影響流程 */ }
  }));
  SFX_LOADING = false;
}
function sfx(name, vol=0.85, rate=1, delay=0){
  const c = audioCtx(), buf = SFX[name];
  if(!c || !buf) return false;
  const src = c.createBufferSource(), g = c.createGain();
  src.buffer = buf; src.playbackRate.value = rate; g.gain.value = vol;
  src.connect(g).connect(c.destination);
  src.start(c.currentTime + Math.max(0, delay)/1000);
  return true;
}

/* 冠軍頁背景音樂：無縫 loop，離開結果頁／重開一局即停
   loop = true 之外再加一層保險：ended 即重新接上，
   並喺頁面返前景／context 被暫停時自動 resume，避免個別瀏覽器中斷 */
let BGM = null, BGM_WANT = null;
function bgm(name, vol=0.42){
  stopBgm();
  if(!SFX[name]) return;
  BGM_WANT = { name, vol };
  startBgm();
}
function startBgm(){
  if(!BGM_WANT) return;
  const c = audioCtx(), buf = SFX[BGM_WANT.name];
  if(!c || !buf) return;
  const src = c.createBufferSource(), g = c.createGain();
  src.buffer = buf; src.loop = true;
  src.loopStart = 0; src.loopEnd = buf.duration;
  g.gain.value = BGM_WANT.vol;
  src.connect(g).connect(c.destination);
  src.onended = ()=>{ if(BGM_WANT){ BGM = null; setTimeout(startBgm, 0); } };
  src.start();
  BGM = src;
}
function stopBgm(){
  BGM_WANT = null;
  if(BGM){ try{ BGM.onended = null; BGM.stop(); }catch(e){} BGM = null; }
}
document.addEventListener("visibilitychange", ()=>{
  if(document.hidden || !BGM_WANT) return;
  const c = audioCtx();
  if(c && c.state === "suspended") c.resume();
  if(!BGM) startBgm();
});
loadSfx(SFX_CORE);                                    // 判定四聲即刻備好（唔需要手勢都 decode 得）
document.addEventListener("pointerdown", ()=>loadSfx(SFX_REST), {once:true});
document.addEventListener("keydown", ()=>loadSfx(SFX_REST), {once:true});

/* 按「準備好」→ 獨立倒數過場（3、2、1、開始）→ 出題兼起錶 */
const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let CD_TIMER = 0;                       // 倒數 interval：退出／上一步要清走
const CD_CIRC = 339.3;                 // 2πr，r = 54

function startRound(){
  if(!G || G.phase !== "ready") return;
  clearInterval(CD_TIMER);
  G.phase = "countdown";
  $("#btnReady").style.display = "none";
  syncQuitFloat();
  const t = curTeam();
  const box = $("#countdown"), num = $("#cdNum"), prog = $("#cdProg"), team = $("#cdTeam");
  box.style.setProperty("--tc", t.color);
  team.innerHTML = `<span class="cd-mark">${ICONS[t.id] || ""}</span><span>${esc(t.name)}</span>`;
  box.classList.add("on");
  const BEAT = REDUCE ? 700 : 1000;
  const paint = v => {
    num.textContent = v;
    num.classList.toggle("word", typeof v === "string");   // 文字（開始）用細字級，避免撐出圓圈
    num.classList.remove("beat"); void num.offsetWidth; num.classList.add("beat");
    prog.style.transition = "none";
    prog.style.strokeDashoffset = "0";
    void prog.getBoundingClientRect();          // 強制 reflow，令下面嘅 transition 真正生效
    prog.style.transition = `stroke-dashoffset ${BEAT}ms linear`;
    prog.style.strokeDashoffset = String(CD_CIRC);
  };
  let n = 3;
  paint(n);
  sfx("countdown", 0.9);        // 真實錄音：0／1／2 秒三響，3 秒 GO，同畫面每拍 1 秒對齊
  CD_TIMER = setInterval(()=>{
    n--;
    if(n > 0){ paint(n); }
    else if(n === 0){ paint(T("開始")); }
    else {
      clearInterval(CD_TIMER); CD_TIMER = 0;
      box.classList.remove("on");
      hideReady();
      beginRunning();
    }
  }, BEAT);
}

function beginRunning(){
  if(!G) return;                       // 倒數期間被退出
  G.phase = "running";
  syncQuitFloat();                     // 倒數完 → 收起浮動鍵，交返頂欄
  const t0 = curTeam();
  G.skipLeft = G.skipCap; syncSkipBtn();
  G.base = { ok: t0.ok, skip: t0.skip, foul: t0.foul||0, score: t0.score };   // 回合起點，用嚟算本回合成績
  G.cur = drawItem();
  G.remaining = G.sec;
  G.endsAt = Date.now() + G.sec * 1000;
  G.tickAt = 0;
  startTimer();
  renderPlay();
}

function drawItem(){
  if(!G.pool.length){
    G.pool = shuffle(G.used.filter(x => x !== G.cur));     // 唔好即刻再出同一題
    G.used = G.cur ? [G.cur] : [];
    toast(T("題目已用完，正在重新洗牌"));
  }
  let it = G.pool.pop();
  while(it && !String(it.t || "").trim() && G.pool.length) it = G.pool.pop();   // 跳過空白題，唔好交出嚟
  if(!it || !String(it.t || "").trim()) it = { t: (lines.find(x=>x && x.trim()) || "（題庫為空）") };
  G.used.push(it);
  return it;
}

function startTimer(){
  clearInterval(G.timerId);
  if(!G.sec){ renderTimer(); return; }
  const token = ++G.timerToken;
  const id = setInterval(()=>{
    if(token !== G.timerToken){ clearInterval(id); return; }   // 舊局的計時器不得影響新局
    if(G.paused) return;
    G.remaining = Math.max(0, (G.endsAt - Date.now()) / 1000);  // 用時鐘差值，唔累積漂移
    renderTimer();
    const secLeft = Math.ceil(G.remaining);
    if(secLeft !== G.tickAt && secLeft <= 10 && secLeft > 0){
      G.tickAt = secLeft;
      const v = 0.42 + (10 - secLeft) * 0.0533;                   // 10 秒 0.42 → 1 秒 0.90
      sfx("tick", v * 0.85);                                      // 第 0 秒：滴答（tick-tock 的「tick」）
      sfx("heart", v, 1, 500);                                    // 半秒後：心跳（用 AudioContext 排程，唔用 setTimeout）
    }
    if(G.remaining <= 0){ clearInterval(id); endTurn(); }
  },100);
  G.timerId = id;
}

const RING_LEN = 2 * Math.PI * 16;   // r=16（與邊框之間留出空隙）
function renderTimer(){
  const el=$("#pClock"), ring=$("#btnPause"), prog=$("#ringProg");
  if(!ring) return;
  el.textContent = G.paused ? "▶" : Math.ceil(G.remaining);
  const pct = Math.max(0, Math.min(1, G.remaining / G.sec));
  prog.style.strokeDashoffset = (RING_LEN * (1 - pct)).toFixed(1);
  ring.classList.toggle("warn", G.remaining <= 10 && G.remaining > 3);
  ring.classList.toggle("dead", G.remaining <= 3);
  ring.classList.toggle("paused", !!G.paused);
}

// 題目字自動撐滿字卡：優先單行（避免詞語被切開），字體過小時才容許斷行
function fitWord(text){
  const el=$("#pText"), card=el.parentElement;
  const cs=getComputedStyle(card);
  const padW=(parseFloat(cs.paddingLeft)||0)+(parseFloat(cs.paddingRight)||0);
  const padH=(parseFloat(cs.paddingTop)||0)+(parseFloat(cs.paddingBottom)||0);
  // 用真正可用寬度（扣 padding），否則手機直向會算出過大、文字被切
  // ⚠️ 唔可以用 el.clientWidth：#pText 係 flex 子項（shrink-to-fit），clientWidth 等於內容寬，
  // 自己比自己永遠通過 → 字級只受高度限制，長題目會超出卡片被裁走（睇落似「冇題目」）。
  const boxW = (card.clientWidth - padW) - 4;
  const boxH=card.clientHeight-padH-40;
  if(boxW<=40 || boxH<=40){ el.style.fontSize=""; return; }   // 版面未就緒：清走舊字級，唔留殘影
  el.style.maxWidth = boxW+"px";
  const fit = (oneLine)=>{
    el.style.whiteSpace = oneLine ? "nowrap" : "normal";
    el.style.wordBreak  = oneLine ? "keep-all" : "break-word";
    let lo=24, hi=Math.min(360, boxH);
    for(let i=0;i<9;i++){
      const mid=(lo+hi)/2;
      el.style.fontSize=mid+"px";
      const okW = el.scrollWidth<=boxW+1;
      if(okW && el.scrollHeight<=boxH+1) lo=mid; else hi=mid;
    }
    el.style.fontSize=Math.floor(lo)+"px";
    return lo;
  };
  const one = fit(true);
  if(one < 64) fit(false);          // 一行太細 → 寧願斷行做大
}
addEventListener("resize", ()=>{ if(G && G.phase==="running") fitWord($("#pText").textContent); });

/* 卡片本身尺寸變咗（HUD 出現、轉向、Safari 工具列收合）而視窗冇 resize 事件時，
   字級會停留在上一個版面算出的值而超出卡片 → 題目被裁走。用 ResizeObserver 補一次。 */
let FITTING = false;
if("ResizeObserver" in window){
  const card = $("#pText").parentElement;
  let lw = card.clientWidth, lh = card.clientHeight;
  new ResizeObserver(()=>{
    if(FITTING || !G || G.phase !== "running") return;
    const w = card.clientWidth, h = card.clientHeight;
    if(Math.abs(w-lw) < 3 && Math.abs(h-lh) < 3) return;    // 只理真正變形，避免字級變化自己觸發自己
    lw = w; lh = h;
    FITTING = true;
    fitWord($("#pText").textContent);
    FITTING = false;
  }).observe(card);
}

function renderPlay(){
  syncExitLabel();
  translateTree(document.body);
  paintUndo();
  const chip = $("#turnChip");
  if(chip && G){
    const t = curTeam();
    chip.style.setProperty("--tc", t.color);
    $("#turnMark").innerHTML = ICONS[t.id] || "";
    $("#turnName").textContent = t.name;
  }
  const it = G.cur || {t:"", deck:""};   // ready 階段未有題目
  const el = $("#pText");
  el.textContent = it.t;
  /* iOS Safari 偶爾唔會重播 CSS 動畫，字留住 opacity:0 → 睇落就係「空白題」。
     清一次 animation 再讓 CSS 重新套用（強制 reflow），保證每題都淡入得返。 */
  el.style.animation = "none";
  void el.offsetWidth;
  el.style.animation = "";
  fitWord(it.t);
  diagPush(it.t, el);

  renderTimer();
}

function fmtScore(v){ return (v < 0 ? "−" : "+") + Math.abs(v); }

/* 統計文字：對 N · 跳過 M · 犯規 K（跳過關閉時不顯示） */
function statLine(t, bold){
  const b = v => bold ? `<b>${v}</b>` : `${v}`;
  const parts = [LANG === "en" ? `${b(t.ok || 0)} correct` : `答中 ${b(t.ok || 0)}`];
  if(t.foul) parts.push(LANG === "en" ? `${b(t.foul)} foul` : `犯規 ${b(t.foul)}`);                       // 有犯規才提，解釋扣分
  if(G && G.skipPenalty && t.skip) parts.push(LANG === "en" ? `${b(t.skip)} skipped` : `跳過 ${b(t.skip)}`);  // 跳過扣分時才提
  return parts.join(" · ");
}

/* 動作層：所有輸入來源（鍵盤／觸控／將來陀螺儀）都經 act() 入 judge() */
const ACTIONS = {
  foul: { key: "ArrowLeft",  dir: "left"  },   // 犯規
  skip: { key: "ArrowDown",  dir: "down"  },   // 跳過
  ok:   { key: "ArrowRight", dir: "right" }    // 正確
};
function act(name){
  if(!ACTIONS[name]) return false;
  if(!G || G.phase !== "running" || !G.cur || G.locked) return false;
  G.locked = true;                        // 190ms 內只認一次，防連按食題
  setTimeout(()=>{ if(G) G.locked = false; }, 190);
  judge(name);
  return true;
}

/* 診斷環形緩衝：每次出題記一筆，回報時一齊送出（連前幾題，唔怕漏咗先撳） */
const DIAG = [];
function diagPush(text, el){
  try{
    const card = el.parentElement, cs = getComputedStyle(el);
    DIAG.push({
      t: String(text).slice(0, 40), len: String(text).length,
      at: new Date().toISOString(),
      fs: cs.fontSize, op: cs.opacity, vis: cs.visibility,
      sw: el.scrollWidth, sh: el.scrollHeight,
      cw: card.clientWidth, ch: card.clientHeight,
      mw: el.style.maxWidth || "", team: G ? (curTeam() || {}).name : "",
      turn: G ? G.turn : -1, phase: G ? G.phase : ""
    });
    if(DIAG.length > 24) DIAG.shift();
  }catch(e){}
}

function saveReportLocal(p){
  try{
    const k = "beasttv.reports", arr = JSON.parse(localStorage.getItem(k) || "[]");
    arr.push(p); localStorage.setItem(k, JSON.stringify(arr.slice(-10)));
  }catch(e){}
}

async function reportProblem(kind){
  const p = {
    kind: kind || "blank-question",
    ts: new Date().toISOString(),
    ua: navigator.userAgent,
    vw: innerWidth, vh: innerHeight, dpr: devicePixelRatio || 1,
    standalone: !!(navigator.standalone || matchMedia("(display-mode:standalone)").matches),
    cfg: { teams: cfg.teams, sec: cfg.sec, roundsPer: cfg.roundsPer, skipCap: cfg.skipCap,
           allowSkip: cfg.allowSkip, skipPenalty: cfg.skipPenalty, foulPenalty: cfg.foulPenalty },
    state: G ? { phase: G.phase, turn: G.turn, cur: G.cur && G.cur.t, judged: G.judged,
                 left: G.sec, paused: G.paused } : null,
    log: DIAG.slice(-24)
  };
  saveReportLocal(p);
  try{
    const r = await fetch("/api/report", { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify(p) });
    toast(r && r.ok ? T("已回報，多謝") : T("回報未送出，已存本機"), 1900);
  }catch(e){
    toast(T("回報未送出，已存本機"), 1900);
  }
}

/* 撤回鍵：有嘢可撤先著燈；判定後亮藍一下，提示「仲救得返」 */
let UNDO_HL_T = 0;
function paintUndo(){
  const b = $("#btnUndo"); if(!b) return;
  const ok = !!(G && G.phase === "running" && G.lastUndo);
  b.classList.toggle("off", !ok);
  b.setAttribute("aria-disabled", String(!ok));
  if(!ok){ b.classList.remove("fresh"); clearTimeout(UNDO_HL_T); }
}
function hintUndo(){
  const b = $("#btnUndo"); if(!b) return;
  b.classList.add("fresh");
  clearTimeout(UNDO_HL_T);
  UNDO_HL_T = setTimeout(()=> b.classList.remove("fresh"), 2600);
}

/* ↑ 撤回：只可撤回本回合最後一次判定（新判定或回合結束即失效） */
function undoJudge(){
  const snap = G && G.lastUndo;
  if(!G || G.phase !== "running" || !snap) return false;
  const t = G.teams[snap.ti];
  t.ok = snap.ok; t.skip = snap.skip; t.foul = snap.foul; t.score = snap.score;
  G.skipLeft = snap.skipLeft;
  G.judged = snap.judged;
  G.lastUndo = null;
  G.qToken = (G.qToken||0) + 1;            // 取消仲未畫出嚟嘅下一題
  G.cur = snap.item;
  const q = document.querySelector(".question");
  if(q) q.classList.remove("fx-down","fx-left","fx-right","fx-ok","fx-bad");
  syncSkipBtn();
  renderPlay();
  paintUndo();
  toast(T("已撤回上一個判定"), 1200);
  sfx("tap", 0.7);
  return true;
}

function judge(kind){
  if(kind === "skip" && (!G.allowSkip || (G.skipCap !== 0 && G.skipLeft <= 0))) return;
  const t = curTeam();
  /* 快照：俾「↑ 撤回」原樣還原（隊分、次數、剩餘跳過、該題） */
  const snap = { ti: G.order[G.turn], ok: t.ok, skip: t.skip, foul: (t.foul||0),
                 score: t.score, skipLeft: G.skipLeft, judged: G.judged || 0,
                 item: G.cur, token: (G.qToken = (G.qToken||0) + 1) };
  let delta = 0;
  if(kind === "ok"){ t.ok++; delta = 1; fxOk(); sfx("ding"); }
  else if(kind === "skip"){ t.skip++; if(G.skipCap !== 0) G.skipLeft--; syncSkipBtn(); if(G.skipPenalty) delta = -1; fxSkipDown(); sfx("whoosh", 0.75); }
  else { t.foul++; if(G.foulPenalty) delta = -1; fxFoul(G.foulPenalty); sfx("foul", 0.55); }
  if(delta) fxScore(delta);
  t.score += delta;
  G.judged = (G.judged || 0) + 1;
  G.lastUndo = snap;
  paintUndo();
  hintUndo();

  setTimeout(()=>{                          // 三個判定都等文字滑走，再換下一題
    if(!G || G.phase !== "running" || G.qToken !== snap.token) return;   // 已被 ↑ 撤回

    const q = document.querySelector(".question");
    if(q) q.classList.remove("fx-down","fx-left","fx-right","fx-ok","fx-bad");
    G.cur = drawItem();
    renderPlay();
  }, 190);
}

let TE_FINISH = null, TE_TIMER = 0, TE_IV = 0;
const GATE_TIMERS = [];                        // 落閘過場的 timeout，退出時要取消

function resetTurnTimers(){
  clearTimeout(TE_TIMER); clearInterval(TE_IV);
  TE_FINISH = null;
}

/* 硬重置：退出遊戲／返回設定時用，連幕都收走 */
function clearTurnEnd(){
  resetTurnTimers();
  GATE_TIMERS.splice(0).forEach(clearTimeout);
  clearInterval(CD_TIMER); CD_TIMER = 0;
  const cd = $("#countdown"); if(cd) cd.classList.remove("on");
  const gate = $("#gate"); if(gate) gate.classList.remove("on","closed","text","settle","opening");
}

/* 落閘：重用開場幕布夾埋 → 「時間到！」 → 幕內結算 → 撳繼續才開幕 */
function slamGate(then){
  const gate = $("#gate");
  gate.classList.remove("closed","text","settle");
  gate.classList.add("on");
  void gate.offsetWidth;                        // 先讓 display 生效，過場才播得出
  gate.classList.add("closed");
  sfx("whistle", 0.85);                         // 球證哨：落閘即吹（單響，三吹版已否決）
  const HIT  = REDUCE ? 80  : 560;              // 幕合埋（0.46s）之後見字
  const CARD = REDUCE ? 300 : 1250;             // 停一停，轉結算卡
  TE_TIMER = setTimeout(()=>{ gate.classList.add("text"); }, HIT);
  GATE_TIMERS.push(TE_TIMER);
  GATE_TIMERS.push(setTimeout(()=>{
    if(!document.getElementById("gate").classList.contains("on")) return;   // 已被清走
    then(); gate.classList.add("settle");
  }, CARD));
}

function showTurnEnd(team, stats, done){
  if(!G) return;                               // 遊戲已結束／已退出，唔好再畫
  clearTimeout(TE_TIMER); clearInterval(TE_IV);
  TE_FINISH = done;
  const mark = $("#teMark"), name = $("#teName"), sc = $("#teScore");
  mark.innerHTML = ICONS[team.id] || "";
  name.textContent = team.name;
  sc.classList.toggle("zero", stats.score === 0);
  const target = stats.score;
  if(target > 0 && !REDUCE){
    let v = 0;
    sc.innerHTML = `+0<em>${LANG==="en"?"pts":"分"}</em>`;
    const step = Math.max(1, Math.round(target / 5));
    TE_IV = setInterval(()=>{
      v = Math.min(target, v + step);
      sc.innerHTML = `+${v}<em>${LANG==="en"?"pts":"分"}</em>`;
      if(v >= target){ clearInterval(TE_IV); TE_IV = 0; }
    }, 95);
  } else {
    sc.innerHTML = `${fmtScore(target)}<em>${LANG==="en"?"pts":"分"}</em>`;
  }
  const box = $("#teStats");
  if(box){
    box.hidden = false;
    const sw = box.querySelector('[data-k="skip"]');
    if(sw) sw.hidden = !G.allowSkip;
    paintStats();
  }
  sfx("settle", 0.8);
}

/* 結算覆核：主持手誤可以在結算卡直接加減（改動即時寫返隊分） */
function paintStats(){
  if(!G || !G.settle) return;
  const S = G.settle;
  $("#stOk").textContent = S.ok;
  $("#stFoul").textContent = S.foul;
  $("#stSkip").textContent = S.skip;
  clearInterval(TE_IV); TE_IV = 0;         // 停分數滾動動畫，直接顯示新值
  const sc = $("#teScore");
  sc.classList.toggle("zero", S.score === 0);
  sc.innerHTML = `${fmtScore(S.score)}<em>${LANG==="en"?"pts":"分"}</em>`;
}

function settleAdjust(kind, d){
  if(!G || !G.settle) return;
  const S = G.settle, base = G.base || {ok:0, skip:0, foul:0, score:0};
  const t = G.teams.find(x=> x.id === S.id);
  if(!t || (d < 0 && (S[kind] || 0) <= 0)) return;
  S[kind] = (S[kind] || 0) + d;
  S.score = S.ok - (G.skipPenalty ? S.skip : 0) - (G.foulPenalty ? S.foul : 0);
  t.ok = base.ok + S.ok;
  t.skip = base.skip + S.skip;
  t.foul = (base.foul || 0) + S.foul;
  t.score = base.score + S.score;
  if(G.skipCap !== 0) G.skipLeft = Math.max(0, G.skipCap - S.skip);   // 剩餘跳過跟本回合用量走
  paintStats();
  sfx("tap", 0.5);
}

$("#btnUndo").onclick = ()=>{ if(!undoJudge()) toast(T("沒有可撤回的判定"), 1200); };
$("#btnReport").onclick = ()=> reportProblem("blank-question");

$("#teStats").addEventListener("click", e=>{
  const b = e.target.closest("button[data-d]");
  if(b) settleAdjust(b.parentElement.dataset.k, +b.dataset.d);
});

function closeTurnEnd(){
  if(!TE_FINISH) return;
  const done = TE_FINISH;
  TE_FINISH = null;
  clearTimeout(TE_TIMER); clearInterval(TE_IV);
  const gate = $("#gate");
  gate.classList.add("opening");            // 結算內容即時收走，唔會留住半空
  gate.classList.remove("settle","text");
  void gate.offsetWidth;
  done();                                   // 喺後面砌好下一隊／結果頁
  gate.classList.remove("closed");           // 同一 frame 開幕，卡同時滑走
  setTimeout(()=>{ gate.classList.remove("on","opening"); }, REDUCE ? 40 : 500);
}

$("#teNext").onclick = ()=> closeTurnEnd();

function endTurn(){
  if(!G) return;
  if(G.phase === "ready"){ enterReady(); return; }   // 尚未開始即按下，視為重新整理
  if(G.phase === "interstitial") return;
  clearInterval(G.timerId);
  G.timerToken++;
  const team = curTeam();
  const base = G.base || { ok:0, skip:0, foul:0, score:0 };
  const stats = { ok: team.ok - base.ok, skip: team.skip - base.skip,
                  foul: (team.foul||0) - (base.foul||0), score: team.score - base.score };
  G.phase = "interstitial";
  G.lastUndo = null;                       // 跨回合唔可以撤回
  paintUndo();
  G.settle = { id: team.id, name: team.name, color: team.color,
               ok: stats.ok, skip: stats.skip, foul: stats.foul, score: stats.score };
  slamGate(()=>{
    showTurnEnd(team, stats, ()=>{
      G.turn++;
      if(G.turn >= G.rounds){ endGame(); return; }
      enterReady();
    });
  });
}

function endGame(){
  if(!G) return;
  resetTurnTimers();
  clearInterval(G.timerId);
  G.timerToken++;
  G.phase = "done";
  wakeOff();
  hideReady();
  const sorted = G.teams.map((t,i)=>({...t,i})).sort((a,b)=> b.score-a.score || b.ok-a.ok);
  const total = G.teams.reduce((s,t)=>s+t.score,0);
  const okTotal = G.teams.reduce((s,t)=>s+t.ok,0);
  $("#rSub").textContent = LANG === "en" ? `${okTotal} correct · ${total} points in total` : `全場答對 ${okTotal} 題 · 總分 ${total}`;

  const topScore = sorted[0].score;
  const tied = sorted.filter(t=>t.score === topScore).length > 1;
  let rank = 0, prev = null;
  const ranked = sorted.map((t,i)=>{
    if(t.score !== prev){ rank = i + 1; prev = t.score; }
    return { ...t, rank };
  });

  const champs = ranked.filter(t=>t.rank === 1).length;
  $("#rankList").classList.toggle("compact", champs >= 4);
  $("#rankList").innerHTML = ranked.map(t=>`
    <div class="rk" data-champ="${t.rank === 1 ? 1 : 0}" style="--tc:${t.color}">
      <div class="flip">
        <div class="face front"><div class="front-card"></div></div>
        <div class="face back">
          <div class="no">${t.rank}</div>
          <div class="rk-tile"><span class="rk-mark">${ICONS[t.id] || ""}</span></div>
          <div class="nm">${esc(t.name)}
            <div class="st">${statLine(t, false)}</div>
          </div>
          <div class="pt" data-score="${t.score}">${t.score}</div>
        </div>
      </div>
    </div>`).join("");

  $("#confetti").innerHTML = "";
  $("#confetti").classList.remove("on");
  const acts = $("#v-result .result-actions");
  if(acts) acts.classList.remove("on");
  showView("v-result");
  startReveal(ranked);
}

/* ---------- 逐格揭榜 + 舞台聚光燈 ---------- */
let RES = null, DRUM = null;

function startReveal(ranked){
  const rows = [...document.querySelectorAll("#rankList .rk")];
  if(!rows.length) return;
  const champs = rows.filter(r=>r.dataset.champ === "1");
  RES = { rows, ranked, champs, timers: [], done: false };
  if(REDUCE){ finishReveal(); return; }
  champs.forEach(r=>{ r.querySelector(".pt").textContent = "0"; });

  const rest = rows.filter(r=>r.dataset.champ !== "1");
  const STEP = 700;
  let t = 420;                                   // 等幕布拉開
  for(let i = rest.length - 1; i >= 0; i--){     // 由最後一名開始，由下而上
    const row = rest[i];
    RES.timers.push(setTimeout(()=>{ row.classList.add("in"); sfx("tick", 0.5); }, t));
    t += STEP;
  }
  RES.timers.push(setTimeout(chargeBuild, t + 260));   // 留一拍，然後燈光亂掃
}

/* 冠軍：白卡「?」震動蓄力（鼓聲 build-up）→ 反轉成冠軍卡 */
const BUILD_MS = 2200, FLIP_MS = 620;

function chargeBuild(){
  if(!RES || RES.done) return;
  RES.champs.forEach(r=>r.classList.add("is-champ", "charging"));
  drumRoll(BUILD_MS / 1000);
  const cards = RES.champs.map(r=>r.querySelector(".front-card")).filter(Boolean);
  const ramps = [[0, 1, ".12s"], [700, 1.7, ".09s"], [1400, 2.4, ".07s"]];
  ramps.forEach(([ms, amp, dur])=>{
    RES.timers.push(setTimeout(()=>{
      cards.forEach(c=>{
        c.style.setProperty("--amp", amp);
        c.style.animationDuration = dur;
      });
    }, ms));
  });
  RES.timers.push(setTimeout(()=>{
    stopDrum();
    sfx("snare", 0.9);
    flipChamps();
  }, BUILD_MS));
}

/* 反轉揭曉 */
function flipChamps(){
  if(!RES || RES.done) return;
  RES.champs.forEach((row,i)=>{
    RES.timers.push(setTimeout(()=>{
      row.classList.add("flipped");
      sfx("whoosh", 0.45);
      RES.timers.push(setTimeout(()=>{
        row.classList.remove("charging");
        row.classList.add("in");
        const p = row.querySelector(".pt");
        if(p) countUp(p, +p.dataset.score);
        sfx("tick", 0.62);
      }, FLIP_MS - 60));
    }, i * 130));
  });
  burstConfetti();
  bgm("champion", 0.42);
  RES.timers.push(setTimeout(finishReveal, RES.champs.length * 130 + FLIP_MS + 900));
}

function finishReveal(){
  if(!RES || RES.done) return;
  RES.done = true;
  RES.timers.forEach(clearTimeout); RES.timers = [];
  stopDrum();
  RES.champs.forEach(row=>{
    row.classList.add("is-champ", "flipped", "in");
    row.classList.remove("charging");
    const p = row.querySelector(".pt");
    if(p) p.textContent = p.dataset.score;
  });
  RES.rows.forEach(r=>r.classList.add("in"));
  burstConfetti();
  if(!BGM_WANT) bgm("champion", 0.42);   // 已經喺 flip 時起咗就唔重播
  const acts = $("#v-result .result-actions");
  if(acts) acts.classList.add("on");
}

function clearReveal(){
  stopDrum();
  if(!RES) return;
  RES.timers.forEach(clearTimeout);
  RES = null;
  const acts = $("#v-result .result-actions");
  if(acts) acts.classList.remove("on");
  const box = $("#confetti");
  if(box){ box.classList.remove("on"); box.innerHTML = ""; }
}

/* 密集鼓聲：越掃越急 */
function drumRoll(dur, from=0.86, to=1.30, vol=0.5){
  const c = audioCtx(), buf = SFX.drums;
  if(!c || !buf) return;
  stopDrum();
  const src = c.createBufferSource(), g = c.createGain();
  src.buffer = buf; src.loop = true;
  src.playbackRate.setValueAtTime(from, c.currentTime);
  src.playbackRate.linearRampToValueAtTime(to, c.currentTime + dur);
  g.gain.value = vol;
  src.connect(g).connect(c.destination);
  src.start();
  DRUM = src;
}
function stopDrum(){
  if(!DRUM) return;
  try{ DRUM.stop(); }catch(e){}
  DRUM = null;
}

function countUp(el, to, ms=800){
  if(REDUCE || !to){ el.textContent = to; return; }
  const t0 = performance.now();
  const step = now=>{
    const k = Math.min((now - t0) / ms, 1);
    el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
    if(k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function burstConfetti(){
  if(REDUCE || !RES) return;
  const box = $("#confetti"); if(!box) return;
  const colors = [...new Set(RES.ranked.map(t=>t.color))];
  box.innerHTML = Array.from({length:54}, (_,i)=>{
    const c = colors[i % colors.length];
    const left = Math.round(Math.random() * 94) + 2;
    const dx = Math.round((Math.random() - .5) * 120);
    const dur = (3 + Math.random() * 3).toFixed(2);
    const delay = (Math.random() * 3).toFixed(2);
    const rot = Math.round(360 + Math.random() * 720);
    const w = 6 + Math.round(Math.random() * 5);
    const hh = 10 + Math.round(Math.random() * 8);
    return `<i style="left:${left}%;width:${w}px;height:${hh}px;background:${c};--dx:${dx}px;--rot:${rot}deg;`
         + `animation-duration:${dur}s;animation-delay:-${delay}s"></i>`;
  }).join("");
  box.classList.add("on");
}

/* ================= 事件 ================= */
function setTeams(n){
  cfg.teams = Math.max(2, Math.min(8, Math.round(+n || 2)));
  ensureUniqueAnimals();
  saveCfg(); renderHome();
  const el = $("#teamInput");
  el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop");
}
$("#teamInput").onchange = e=> setTeams(e.target.value);
$("#teamMinus").onclick = ()=> setTeams(cfg.teams - 1);
$("#teamPlus").onclick  = ()=> setTeams(cfg.teams + 1);
function setRounds(n){
  cfg.roundsPer = Math.max(1, Math.min(5, Math.round(+n || 2)));
  saveCfg(); renderSetup();
}
$("#rpInput").onchange = e=> setRounds(e.target.value);
$("#rpMinus").onclick  = ()=> setRounds(cfg.roundsPer - 1);
$("#rpPlus").onclick   = ()=> setRounds(cfg.roundsPer + 1);

function setSkipCap(n){
  cfg.skipCap = (Number(n) === 0) ? 0 : Math.max(1, Math.min(10, Math.round(+n || 3)));
  saveCfg(); syncRules();
}
$("#scMinus").onclick = ()=> setSkipCap(cfg.skipCap === 0 ? 10 : cfg.skipCap - 1);
$("#scPlus").onclick  = ()=> setSkipCap(cfg.skipCap >= 10 ? 0 : cfg.skipCap + 1);   // 10 之後 = 無限

$("#secInput").onchange  = e=>{ cfg.sec=Math.max(5,Math.min(600,+e.target.value||60)); saveCfg(); renderSetup(); };
$$("#secChips button").forEach(b=>b.onclick = ()=>{
  cfg.sec = +b.dataset.sec; saveCfg(); renderSetup();
  const el = $("#secInput"); el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop");
});

$("#animalCancel").onclick = closeAnimals;
$("#animalSheet").onclick = e=>{ if(e.target.id === "animalSheet") closeAnimals(); };
$("#launch").onclick = ()=>{ if(SETUP.busy) skipLaunch(); };
$("#btnEnter").onclick = startSetup;
$("#btnStepBack").onclick = ()=>{
  if(SETUP.i === 0){ showView("v-home"); renderHome(); }
  else goStep(SETUP.i - 1, -1);
};
$("#btnNext").onclick = ()=>{
  if(!lines.length){ toast(T("題目尚未載入，重新連線中…")); pullText(); return; }
  if(SETUP.i < LAST_STEP) goStep(SETUP.i + 1, 1); else launchGame();
};

$$("[data-judge]").forEach(b=>b.onclick=()=> act(b.dataset.judge));
$("#btnReady").onclick = startRound;

/* 規則開關 */
function syncRules(){
  $("#swSkip").setAttribute("aria-checked", String(cfg.allowSkip));
  $("#swSkipPen").setAttribute("aria-checked", String(cfg.skipPenalty));
  $("#swFoulPen").setAttribute("aria-checked", String(cfg.foulPenalty));
  const row = $("#ruleSkipPen");
  row.classList.toggle("off", !cfg.allowSkip);
  $("#swSkipPen").disabled = !cfg.allowSkip;
  const cap = $("#scVal");
  if(cap){
    cap.textContent = cfg.skipCap === 0 ? "∞" : String(cfg.skipCap);
    $("#scMinus").disabled = cfg.skipCap <= 1;
    $("#scPlus").disabled  = cfg.skipCap >= 10;
    $("#ruleSkipCap").classList.toggle("off", !cfg.allowSkip);
    $("#scMinus").disabled = !cfg.allowSkip;
    $("#scPlus").disabled  = !cfg.allowSkip || cfg.skipCap === 0;
  }
}
$("#swSkip").onclick = ()=>{
  cfg.allowSkip = !cfg.allowSkip;
  if(!cfg.allowSkip) cfg.skipPenalty = false;
  saveCfg(); syncRules();
};
$("#swSkipPen").onclick = ()=>{ if(!cfg.allowSkip) return; cfg.skipPenalty = !cfg.skipPenalty; saveCfg(); syncRules(); };
$("#swFoulPen").onclick = ()=>{ cfg.foulPenalty = !cfg.foulPenalty; saveCfg(); syncRules(); };

syncRules();
function isPristine(){
  return !!G && (G.phase === "ready" || G.phase === "countdown") && G.turn === 0 && !G.judged
    && G.teams.every(t=>t.score === 0 && !t.ok && !t.skip && !t.foul);
}
function backToSetup(){clearTurnEnd();
  clearInterval(G.timerId);
  G.timerToken++;
  G = null;
  $("#readyOverlay").style.display = "none";
  document.body.classList.remove("is-ready");
  syncQuitFloat();
  showView("v-setup");
  goStep(3, -1);
}

function doExit(){
  stopBgm();clearTurnEnd();wakeOff();
  clearInterval(G.timerId);
  G.timerToken++;
  G = null;
  document.querySelector("#readyOverlay").style.display = "none";
  document.body.classList.remove("is-ready");
  syncQuitFloat();
  showView("v-home");
  renderHome();
}

let EXIT_PAUSED = false;
function askExit(){
  const sheet = $("#exitSheet");
  sheet.classList.add("on");
  if(G && G.phase === "running" && !G.paused){    // 開面板即停錶，唔會喺對話框後面繼續倒數
    G.paused = true; EXIT_PAUSED = true;
    setPauseIcon(true); renderTimer();
  }
  setTimeout(()=>$("#exitCancel").focus({preventScroll:true}), 40);
}
function closeExit(){
  $("#exitSheet").classList.remove("on");
  if(EXIT_PAUSED){
    EXIT_PAUSED = false;
    if(G && G.phase === "running"){ G.paused = false; G.endsAt = Date.now() + G.remaining*1000; setPauseIcon(false); renderTimer(); }
  }
}

$("#exitCancel").onclick = closeExit;
$("#exitConfirm").onclick = ()=>{ closeExit(); doExit(); };
$("#exitSheet").addEventListener("click", e=>{ if(e.target.id === "exitSheet") closeExit(); });

function exitTap(){
  if(gateOn()) return;                         // 落閘／結算過場期間唔接受退出，避免半途拆畫面
  if(!G){ stopBgm(); showView("v-home"); renderHome(); return; }
  if(isPristine()){ backToSetup(); return; }   // 未開始過 → 上一步回設定
  askExit();                                   // 遊戲中 → 自訂確認面板
}
$("#btnExit").onclick = exitTap;
$("#btnQuitFloat").onclick = ()=>{ if(gateOn()) return; askExit(); };

function setPauseIcon(p){
  const b = $("#btnPause"); if(!b) return;
  b.setAttribute("aria-label", p ? T("繼續") : T("暫停"));
  b.setAttribute("title", p ? T("繼續（Esc）") : T("暫停（Esc）"));
  b.classList.toggle("paused", !!p);
  const el = $("#pClock");
  if(p){ el.textContent = "▶"; }
  else if(G) renderTimer();
}
$("#btnPause").onclick = ()=>{
  if(!G || G.phase!=="running") return;
  G.paused = !G.paused;
  if(!G.paused) G.endsAt = Date.now() + G.remaining * 1000;
  setPauseIcon(G.paused);
  renderTimer();
};

$("#btnBackHome").onclick = ()=>{
  stopBgm(); clearReveal(); wakeOff();
  if(G){ clearInterval(G.timerId); G.timerToken++; G = null; }   // 清乾淨舊局，唔留 phase:'done' 殘留
  showView("v-home"); renderHome();
};

/* 結果頁：右方向鍵＝跳到冠軍／返回主頁；點畫面亦可快轉 */
document.addEventListener("keydown", e=>{
  if(e.repeat) return;
  if(!$("#v-result").classList.contains("active")) return;
  if(e.key !== "ArrowRight") return;
  e.preventDefault();
  if(RES && !RES.done) finishReveal();
  else $("#btnBackHome").click();
});
$("#v-result").addEventListener("click", e=>{
  if(e.target.closest("button")) return;
  if(RES && !RES.done) finishReveal();
});

/* 鍵盤：設定流程 */
document.addEventListener("keydown", e=>{
  if(e.repeat) return;
  if(!$("#v-setup").classList.contains("active")) return;
  if(e.target.tagName === "INPUT" && e.key !== "Enter") return;
  if(e.key === "Enter"){
    e.preventDefault();
    if(SETUP.i < LAST_STEP) goStep(SETUP.i + 1, 1); else launchGame();
  }else if(e.key === "Escape"){
    e.preventDefault(); $("#btnStepBack").click();
  }
});


/* ================= 鍵盤快捷鍵（每部機自己記，唔跟帳號） ================= */
const KEY_DEF  = { foul:"ArrowLeft", skip:"ArrowDown", ok:"ArrowRight", undo:"ArrowUp" };
const KEY_WHAT = { foul:"犯規", skip:"跳過", ok:"正確", undo:"撤回" };
const KEY_ORDER = ["foul","skip","ok","undo"];

function loadKeys(){
  const out = { ...KEY_DEF };
  try{
    const j = JSON.parse(localStorage.getItem("beasttv.keys") || "{}");
    for(const k of KEY_ORDER) if(j && typeof j[k] === "string" && j[k]) out[k] = j[k];
  }catch(e){}
  return out;
}
const KKEYS = loadKeys();
let ACT_BY_CODE = {};
function saveKeys(){
  try{ localStorage.setItem("beasttv.keys", JSON.stringify(KKEYS)); }catch(e){}
}
function keyLabel(code){
  const m = { ArrowLeft:"←", ArrowRight:"→", ArrowUp:"↑", ArrowDown:"↓", Space:"空格",
              Enter:"Enter", Backspace:"⌫", Delete:"Del", Home:"Home", End:"End",
              PageUp:"PgUp", PageDown:"PgDn", Insert:"Ins", Escape:"Esc" };
  if(m[code]) return m[code];
  if(/^Key[A-Z]$/.test(code)) return code.slice(3);
  if(/^Digit\d$/.test(code)) return code.slice(5);
  if(/^Numpad\d$/.test(code)) return "Num" + code.slice(6);
  return code.replace(/^Numpad/, "Num");
}
function codeOf(e){
  if(e.code) return e.code;
  const k = e.key || "";                       // 冇 code（合成事件）就用 key 反推
  if(/^Arrow(Left|Right|Up|Down)$/.test(k)) return k;
  if(k === " " || k === "Spacebar") return "Space";
  if(/^[a-zA-Z]$/.test(k)) return "Key" + k.toUpperCase();
  if(/^\d$/.test(k)) return "Digit" + k;
  return k;
}
function applyKeys(){
  ACT_BY_CODE = {};
  for(const k of KEY_ORDER) ACT_BY_CODE[KKEYS[k]] = k;

  const t = (sel, txt) => { const el = $(sel); if(el) el.setAttribute("title", txt); };
  t(".key-foul", `${T("犯規")} (${keyLabel(KKEYS.foul)})`);
  t(".key-pass", `${T("跳過")} (${keyLabel(KKEYS.skip)})`);
  t(".key-ok",   `${T("正確")} (${keyLabel(KKEYS.ok)})`);
  const u = $("#btnUndo");
  if(u) u.setAttribute("title", `${T("撤回上一個判定")} (${keyLabel(KKEYS.undo)})`);

  if(KEY_LISTEN === null) renderKeyRows();       // 第 6 步的鍵位列表同步（改鍵中唔重畫）
}

/* 第 6 步：鍵盤快捷鍵（直接列在步驟內，唔用面板） */
let KEY_LISTEN = null;
function renderKeyRows(){
  const box = $("#keyRows"); if(!box) return;
  box.innerHTML = KEY_ORDER.map(k => `
    <div class="key-row">
      <b>${esc(T(KEY_WHAT[k]))}</b>
      <button class="key-chip${KEY_LISTEN === k ? " listening" : ""}" type="button" data-k="${k}"
        aria-label="${esc(T(KEY_WHAT[k]))}：${KEY_LISTEN === k ? esc(T("按鍵…")) : esc(keyLabel(KKEYS[k]))}"
      >${KEY_LISTEN === k ? esc(T("按鍵…")) : esc(keyLabel(KKEYS[k]))}</button>
    </div>`).join("");
}
if($("#keysReset")) $("#keysReset").onclick = ()=>{
  for(const k of KEY_ORDER) KKEYS[k] = KEY_DEF[k];
  KEY_LISTEN = null; saveKeys(); renderKeyRows(); applyKeys();
};
if($("#keyRows")) $("#keyRows").addEventListener("click", e=>{
  const b = e.target.closest(".key-chip"); if(!b) return;
  KEY_LISTEN = b.dataset.k; renderKeyRows();
});
/* 監聽新鍵：capture 階段，唔會被遊戲嘅判定 handler 搶走 */
document.addEventListener("keydown", e=>{
  if(!KEY_LISTEN) return;
  e.preventDefault(); e.stopPropagation();
  if(e.key === "Escape"){ KEY_LISTEN = null; renderKeyRows(); return; }
  if(["Shift","Control","Alt","Meta","CapsLock","Tab"].includes(e.key)) return;
  const code = codeOf(e);
  if(!code || code === "Unidentified") return;
  const me = KEY_LISTEN;
  for(const other of KEY_ORDER){
    if(other !== me && KKEYS[other] === code) KKEYS[other] = KKEYS[me];   // 撞鍵 → 兩者交換
  }
  KKEYS[me] = code;
  KEY_LISTEN = null; saveKeys(); renderKeyRows(); applyKeys();
}, true);

/* 鍵盤控場 */
document.addEventListener("keydown", e=>{
  if(e.repeat) return;                       // 長按唔連發
  if(!$("#v-play").classList.contains("active")) return;
  if(["INPUT","TEXTAREA"].includes(document.activeElement.tagName)) return;
  if(!G) return;
  const a = ACT_BY_CODE[codeOf(e)];
  if(a === "ok"){
    e.preventDefault();
    if(G.phase === "ready") startRound();
    else if(G.phase === "running") act("ok");
    else if(G.phase === "interstitial") closeTurnEnd();     // 結算卡：繼續
  }else if(a === "foul"){
    e.preventDefault();
    if(G.phase === "running") act("foul");
  }else if(a === "skip"){
    e.preventDefault();
    if(G.phase === "running") act("skip");
  }else if(a === "undo"){
    e.preventDefault();
    undoJudge();
  }else if(e.key === "Escape"){
    e.preventDefault();
    if($("#exitSheet").classList.contains("on")){ closeExit(); return; }
    if(gateOn()) return;                                     // 落閘／結算過場：唔接受暫停或退出
    if(G.phase === "ready" || G.phase === "countdown"){ askExit(); return; }
    $("#btnPause").click();
  }
});


/* ================= 輸入防抖 ================= */
/* 同一個掣 260ms 內只認一次：擋連按、擋 iPad 雙擊縮放；判定掣有自己嘅聲，唔加 click */
const TAP_GAP = 260;
document.addEventListener("click", e=>{
  const b = e.target.closest("button, a");
  if(!b) return;
  const now = performance.now();
  if(b.__tapAt && now - b.__tapAt < TAP_GAP){
    e.preventDefault(); e.stopPropagation();
    return;
  }
  b.__tapAt = now;
}, true);
document.addEventListener("pointerdown", e=>{
  const b = e.target.closest("button, a");
  if(!b || b.disabled || b.matches("[data-judge]")) return;
  sfx("tap", 0.5);
}, true);

/* ================= 啟動 ================= */
/* 無法連接時每 15 秒自動重試，無需手動操作 */
setInterval(()=>{ if(!REMOTE.ok && !G) pullText(); }, 15000);

/* 返回 App 或切換回前景時自動重新載入題目，無需重新開啟 */
document.addEventListener("visibilitychange", ()=>{
  if(!document.hidden && !G && document.body.dataset.view === "home") pullText();
});
window.addEventListener("focus", ()=>{
  if(!G && document.body.dataset.view === "home") pullText();
});

applyKeys();          // 鍵位提示：開機就按已存設定寫入
renderKeyRows();      // 第 6 步的鍵位列表

/* 身份：登入後自動用自己題庫 */
function renderIdentity(){
  const link = $("#btnEditHome");
  if(link) link.setAttribute("href", "/edit");
  const el = $("#myBank");
  if(!el) return;
  el.hidden = false;
  el.innerHTML = "";
  const span = document.createElement("span");
  if(ME){
    span.append("已登入：");   // 原文交 translateTree 翻譯
    const b = document.createElement("b"); b.textContent = ME.user.username; span.append(b);
    el.append(span);
    const btn = document.createElement("button");
    btn.type = "button"; btn.textContent = T("登出");
    btn.onclick = async ()=>{
      try{ await fetch("/api/logout", { method:"POST", headers:{ authorization:"Bearer " + TOKEN() } }); }catch(_){}
      localStorage.removeItem("beasttv.token");
      location.href = "/";
    };
    el.append(btn);
  }else{
    el.hidden = true;                            // 未登入：唔重複，設定鍵本身就係入口
  }
  translateTree(el);
}

async function boot(){
  if(URL_BANK){                                  // 公開連結：直接玩嗰份，唔理登入
    renderIdentity(); pullText(); return;
  }
  const tok = TOKEN();
  if(tok){
    try{
      const r = await fetch("/api/me", { cache:"no-store", headers:{ authorization:"Bearer " + tok } });
      if(r.ok){
        const d = await r.json();
        ME = d;
        if(d.bank && d.bank.slug) BANK = d.bank.slug;
      }else{
        localStorage.removeItem("beasttv.token");   // 過期／失效
      }
    }catch(_){}
  }
  renderIdentity();
  pullText();
}

document.body.dataset.view = "home";
document.documentElement.lang = LANG === "en" ? "en" : "zh-Hant-HK";
if(btnLang) btnLang.textContent = LANG === "en" ? "中文" : "English";
renderHome();
boot();
window.__bigtv = { get G(){return G}, get lines(){return lines}, get cfg(){return cfg},
  startGame, startRound, enterReady, judge, undoJudge, settleAdjust, endTurn, endGame,
  reportProblem, get diag(){return DIAG},
  renderHome, renderPlay, showView };
