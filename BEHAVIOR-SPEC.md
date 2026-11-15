# beasttv 行為規格 v1

> 從 `app.js` @ `19b5279`（1748 行）逐行抽取，作為重寫後的行為基準。
> 每一條都可以寫成可執行測試，不得憑空增刪。

---

## 1. 狀態模型（現況，重寫時要改成狀態機）

### 1.1 現有狀態值

`G.phase` 只有 5 個值：

| 值 | 意義 |
|---|---|
| `ready` | 回合準備畫面（顯示隊名、分數、剩餘跳過） |
| `countdown` | 倒數中 |
| `running` | 出題中，可判定 |
| `interstitial` | 回合結束落閘／結算卡 |
| `done` | 全部回合完，結果頁 |

`G.paused` 是**獨立布林**，可與任一 phase 同時存在。

**正交組合 = 10 種狀態**，但程式按兩個獨立變數處理 → F-01／F-02 bug 的根源。

### 1.2 各狀態允許的操作（現況實際行為）

| 操作 | 允許條件 |
|---|---|
| `act('ok'/'skip'/'foul')` | `phase==="running"` **且** `!paused` **且** `cur` 存在 **且** `!locked` |
| `undoJudge()` | `phase==="running"` **且** `!paused` **且** `lastUndo` 存在 |
| `paintUndo()` 亮燈 | `phase==="running"` **且** `lastUndo` 存在（**未查 paused**，重寫時要決定） |
| 暫停切換 | 僅 `running` |

⚠️ **已知缺陷**：`act()` 與 `undoJudge()` 已查 `paused`（F-01 已修），但 `paintUndo()` 沒查 → 暫停時撤回鍵仍亮着。重寫時狀態機應統一。

---

## 2. 判定規則（不可變）

### 2.1 三種判定

| 判定 | 鍵 | 隊伍計數 | 分數變化 | 跳過次數 |
|---|---|---|---|---|
| 正確 `ok` | ArrowRight | `t.ok++` | **+1** | — |
| 跳過 `skip` | ArrowDown | `t.skip++` | `skipPenalty ? -1 : 0` | `skipCap !== 0` 時 `skipLeft--` |
| 犯規 `foul` | ArrowLeft | `t.foul++` | `foulPenalty ? -1 : 0` | — |

### 2.2 跳過閘門

```
skip 被拒絕的條件：
  !G.allowSkip                                 → 拒絕
  或 (G.skipCap !== 0 && G.skipLeft <= 0)      → 拒絕
```
- `skipCap === 0` 代表**無限跳過**，不遞減
- `skipCap === 1` 時，第一次跳過後 `skipLeft=0`，之後拒絕

### 2.3 防連按

`G.locked` 在判定後設 `true`，**190ms 後**解鎖。期間 `act()` 一律拒絕。

### 2.4 換題延遲

判定後 **190ms** 才換下一題（等文字滑走動畫）。換題前檢查：
```
G.qToken === snap.token   // 若已被撤回則不換題
```

---

## 3. 撤回規則（不可變）

### 3.1 快照內容

每次判定前儲存：
```js
{ ti: G.order[G.turn], ok, skip, foul, score, skipLeft, judged, item: G.cur, token }
```

### 3.2 撤回還原

- 還原該隊 `ok`／`skip`／`foul`／`score`
- 還原 `G.skipLeft`、`G.judged`
- `G.qToken++`（取消尚未畫出的下一題）
- `G.cur = snap.item`（還原題目）
- `G.lastUndo = null`（**只能撤回一次**）

### 3.3 失效條件

- 新判定會覆蓋快照
- 回合結束後 `G.phase !== "running"` → 不可撤回

---

## 4. 配置項（cfg）

| 欄位 | 意義 | 影響 |
|---|---|---|
| `teams` | 隊數 2–8 | 隊伍陣列長度 |
| `sec` | 每回合秒數 | 倒數長度 |
| `roundsPer` | 每隊回合數 | 總回合 = teams × roundsPer |
| `skipCap` | 每回合可跳次數（0=∞） | 見 2.2 |
| `allowSkip` | 是否允許跳過 | 見 2.2 |
| `skipPenalty` | 跳過扣分 | 見 2.1 |
| `foulPenalty` | 犯規扣分 | 見 2.1 |

---

## 5. 回合結構（不可變）

### 5.1 配置範圍

| 欄位 | 範圍 | 預設 |
|---|---|---|
| `teams` | 2–8 | — |
| `roundsPer` | **1–5**：`Math.max(1, Math.min(5, Math.round(+n \|\| 2)))` | 2 |
| `sec` | 見設定流程 | — |

### 5.2 出場順序

```js
order = []
for (r = 0; r < cfg.roundsPer; r++)
  for (i = 0; i < teams.length; i++)
    order.push(i)
```
**逐輪輪轉**：每輪所有隊各出場一次。總回合 `G.rounds = teams × roundsPer`。

例：4 隊 × 2 輪 → `[0,1,2,3, 0,1,2,3]`，共 8 回合。

### 5.3 結束條件

```js
G.turn++;
if (G.turn >= G.rounds) { endGame(); return; }
enterReady();
```
最後一回合結束後直接進 `endGame()`，不進準備畫面。

### 5.4 回合統計（`G.base` 差值法）

每回合開始記錄 `G.base`（該隊累計值），回合結束算**差值**：

```js
stats = {
  ok:    team.ok    - base.ok,
  skip:  team.skip  - base.skip,
  foul:  (team.foul||0) - (base.foul||0),
  score: team.score - base.score
}
```

⚠️ 這是「本回合成績」，不是累計。重寫時不可弄錯基準。

---

## 6. 結算覆核（主持手誤補救）

### 6.1 加減規則

```
settleAdjust(kind, d):
  G 或 G.settle 不存在       → 直接返回
  d < 0 且 S[kind] <= 0      → 拒絕（不可減至負）
  S[kind] += d
  S.score = S.ok - (skipPenalty ? S.skip : 0) - (foulPenalty ? S.foul : 0)
  team.ok/skip/foul = base.* + S.*
  team.score = base.score + S.score
  skipCap !== 0 → G.skipLeft = max(0, skipCap - S.skip)
```

### 6.2 關鍵語意：分數是「重算」不是「累加」

`S.score` 由 `ok / skip / foul` **重新計算**得出，不是 `+=`。

意義：主持在結算卡按加減時，分數完全依當前 `ok/foul/skip` 重算，
之前判定時的 `delta` 不再有作用，最終分數只看結算卡數字。

⚠️ 重寫時若寫成累加，主持按兩次「正確 +1」會得到不同結果。

### 6.3 剩餘跳過同步

結算加減跳過次數時，`skipLeft` 重算為 `skipCap - S.skip`（下限 0）。
即主持把跳過次數減回去，下一回合的可用跳過也會恢復。

---

## 7. 排名與勝負（不可變）

### 5.1 排序規則

```js
sorted = teams.sort((a,b) => b.score - a.score || b.ok - a.ok)
```
1. **主鍵**：分數高者前
2. **次鍵**：分數相同時，**答對題數多者前**（`b.ok - a.ok`）
3. 若兩者都同 → 保持原陣列順序（JS stable sort）

### 5.2 排名算法（competition ranking，同分同名次）

```js
let rank = 0, prev = null;
ranked = sorted.map((t, i) => {
  if (t.score !== prev) { rank = i + 1; prev = t.score; }
  return { ...t, rank };
});
```

**只比較 `score`，不比較 `ok`**。意即：
- 分數相同 → **同名次**（即使答對題數不同，因為排序已用 ok 決定先後，但名次仍相同）
- 名次會跳號：如 10, 10, 8 → rank = 1, 1, 3（**不是 1, 1, 2**）

### 5.3 並列冠軍

```js
champs = ranked.filter(t => t.rank === 1).length
```
- 所有 `rank === 1` 的隊都是冠軍
- `champs >= 4` 時，`#rankList` 加 `.compact` class（版面壓縮）
- 無「唯一冠軍」概念，同分即並列

### 5.4 全場統計

```
總分 = Σ(team.score)
答對總數 = Σ(team.ok)
副標題：`全場答對 ${okTotal} 題 · 總分 ${total}`
英文：`${okTotal} correct · ${total} points in total`
```

---

## 8. 揭榜與落閘時序（不可變）

### 6.1 節奏常量

| 常量 | 值 | 意義 |
|---|---|---|
| `STEP` | 700ms | 每行揭曉間隔 |
| 起始延遲 | 420ms | 等幕布拉開 |
| `BUILD_MS` | 2200ms | 冠軍卡震動蓄力 |
| `FLIP_MS` | 620ms | 翻牌動畫 |
| 冠軍錯開 | 130ms × i | 多個冠軍依次翻 |
| 收尾 | +900ms | 翻完後停頓 |
| `HIT`（落閘） | 560ms（REDUCE: 80） | 幕合攏後見字 |
| `CARD`（落閘） | 1250ms（REDUCE: 300） | 停一停轉結算卡 |

### 6.2 揭榜流程

1. `REDUCE`（prefers-reduced-motion）→ **直接** `finishReveal()`，無動畫
2. 冠軍卡分數先歸零顯示 `0`
3. 非冠軍行由**最後一名往上**逐行 `in`，每行 700ms，配 `tick` 音效
4. 留一拍（260ms）後 `chargeBuild()`：冠軍震動 + 鼓聲 2200ms
5. `flipChamps()`：逐個翻牌，每個錯開 130ms，配 `whoosh` 音效
6. 翻牌完成（FLIP_MS - 60）後分數 countUp，配 `tick` 音效
7. 彩帶 + 冠軍 BGM（音量 0.42）
8. `finishReveal()` 收尾

### 6.3 落閘流程

1. 幕布顯示 → 強制 reflow → 加 `closed` class
2. 吹哨（`whistle` 0.85，**單響**，三吹版已否決）
3. `HIT` 後見字
4. `CARD` 後轉結算卡
5. 整個過程的 timer 都推入 `GATE_TIMERS`，退出時要能全部取消

---

## 9. 不可破壞的外部契約

### 6.1 後端 API（13 個端點，路徑不可改）

```
POST /api/signup      POST /api/login       POST /api/logout
GET  /api/config      GET  /api/me
GET  /api/banks       POST /api/banks
POST /api/newbank     POST /api/findbank
GET  /api/text        PUT  /api/text
POST /api/report      GET  /api/report
```

### 7.2 localStorage 鍵（跨版本相容，**絕對不可改**）

| 鍵 | 內容 | 用途 |
|---|---|---|
| `beasttv.lang` | `"zh"` / `"en"` | 介面語言偏好 |
| `beasttv.token` | session token | 登入狀態 |
| `beasttv.keys` | JSON，自訂鍵位 | 鍵盤快捷鍵 |
| `beasttv.reports` | JSON 陣列（最多 10 筆） | 問題回報的本機備份 |
| `beastbrand.v1` | JSON `{t, s}` | 自訂品牌標題／副標 |

⚠️ 重寫時**必須沿用完全相同的鍵名與資料格式**，否則使用者會：
- 遺失登入狀態（`token`）
- 遺失自訂鍵位（`keys`）
- 遺失自訂品牌（`brand`）
- 語言設定重設

### 7.3 PWA

- `sw.js` CACHE 版本號每次改前端要 bump
- SHELL 清單由 vite 插件動態改寫（見 spike）
- 離線可玩（題庫已載入時）

---

## 10. 待補齊（下一步）

- [ ] `renderResult` 的排名與並列冠軍規則
- [ ] `showTurnEnd` 的回合結算統計
- [ ] 最短局結束條件
- [ ] 全員同分處理
- [ ] 落閘時序（HIT 560ms／CARD 1250ms，REDUCE 下 80/300）
- [ ] 倒數拍數與音效對應
