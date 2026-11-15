# beasttv 重寫進度（自動推進用）

> 這份文件是給定時任務用的交接文件。每次自動執行時先讀這份，做完更新這份。

## 目前狀態（2026-11-16 01:25）

- 工作目錄：`C:\Users\KingLEUNGTungLam\DS Bot\beasttv`
- 分支：`rewrite/modular`（**不要動 main**，main 與線上服務要保持可用）
- 最新 commit：`c53f501`（抽出 src/sfx.js）
- 測試：**137 個全過**
- `static_check.py`：PASS

### 已完成的模組

| 檔案 | 內容 | 測試數 |
|---|---|---|
| `src/state.js` | 遊戲狀態機 | 25 |
| `src/i18n.js` | 國際化，110 條字典 | 14 |
| `src/dom.js` | 103 個元素 id 常數 | 13 |
| `src/sfx.js` | 音效模組 | 19 |
| `tests/app-state.test.js` | app.js 內嵌狀態機與 src/state.js 一致性 | 9 |
| 原有行為測試 | logic / real-app / endgame / turn | 57 |

### 已接入 app.js

- 狀態機已內嵌（classic script 不能用 import）
- `G.phase` / `G.paused` 是唯讀鏡像，寫入會 console 警告
- 判定路徑全部收斂到 `G.canJudge()` / `G.canUndo()`
- F-01（暫停時仍可判定）、F-02（倒數偷跑）已從結構上修好

## 執行指令

```powershell
$d="C:\Users\KingLEUNGTungLam\DS Bot\beasttv"
$node="C:\Users\KingLEUNGTungLam\AppData\Local\Programs\DS Bot\resources\primary-runtime\dependencies\node\bin\node.exe"
$py="C:\Users\KingLEUNGTungLam\AppData\Local\Programs\DS Bot\resources\primary-runtime\dependencies\python\python.exe"
Set-Location $d
& $node --test tests/logic.test.js tests/real-app.test.js tests/endgame.test.js tests/turn.test.js tests/state.test.js tests/i18n.test.js tests/dom.test.js tests/app-state.test.js tests/sfx.test.js
& $py tests/ci/static_check.py
```

## 重要背景（不要重複踩坑）

1. **`game.js` / `setup.js` 不能直接拆**。104 個函式的呼叫圖顯示它們依賴核心函式：
   `sfx` 被 11 個呼叫、`renderHome` 8 個、`showView` 8 個、`esc` 7 個、`toast` 7 個。
   硬拆只是把耦合搬家。

2. **唯一真正獨立的子圖是音效模組**，已抽出。

3. **`app.js` 是 classic script**，`<script src="/app.js" defer>` 沒有 `type="module"`。
   要改成 module 需同時處理 Vite build，那是另一件事，不要混在一起做。

4. **既存死路徑**：`app.js` 查 `#qCount` / `#qHint`，但 HTML 沒有這兩個元素。
   因有 `if()` 判空故不報錯、只是靜默失效。已標記 `DEAD_IDS`。
   **不要自作主張修**，屬行為變更，要用戶同意。

5. **測試不依賴 node_modules**，只用 `node:test` / `node:assert` / `node:vm` / `node:fs` / `node:path`。

6. **沙箱載入 app.js 需補齊 stub**：`location.pathname`、`addEventListener`、`NodeFilter`、
   `createTreeWalker`、`URLSearchParams`、`localStorage`、`matchMedia`。
   漏一項會令頂層副作用中途失敗、後半段宣告不執行。參考 `tests/sfx.test.js`。

7. **`Object.assign` 會覆寫 setter 而不觸發**。`G.phase` / `G.paused` 是 getter，
   測試替身要用 `mkG()`，不可直接 `Object.assign` 帶 `phase`。

## 紅線

- 不改玩法規則
- 不改三檔分離架構（app.js / styles.css / HTML）
- 不新增 build step
- 不改授權版權文案
- 不動 main 分支
- 不自行 git push（除非測試全過且已明確記錄）

## 待辦（按優先序）

### 1. 等子 Bot 回報並驗證
群組「beasttv 模組拆分」有 3 個 Bot 在跑：
- **施工B**：styles.css 拆檔方案（只回報，不動手）
- **施工C**：HTML 與 dom.js 的 103 個 id 對帳（只回報）
- **施工D**：新增 tests/utils.test.js（6 個純函式）

**必須用 `read_group_chat` 讀群組確認實際結果**，不要只看 `list_bots` 的 idle 狀態
（限流時 Bot 會顯示 idle 但實際沒完成）。

**必須用 git status 驗證檔案是否真的落檔**，不要只信 Bot 說「已完成」。

### 2. 抽出格式化工具模組（低風險）
`esc`、`fmtScore`、`statLine` 這類純函式可抽成 `src/format.js`。
純函式、無副作用、不依賴 DOM 或 G，適合獨立抽出。

### 3. 若施工D 完成，把它併入 CI
更新 `.github/workflows/ci.yml` 的 `logic` job，加入新測試檔。

### 4. 其餘可考慮的獨立模組
- `src/storage.js`：localStorage 存取（`beasttv.lang` / `beasttv.token` / `beasttv.keys` / `beasttv.reports` / `beastbrand.v1`）
- `src/keys.js`：按鍵設定（`loadKeys` / `saveKeys` / `keyLabel` / `codeOf`）

## 每次自動執行的流程

1. 讀這份文件
2. 跑一次全部測試，確認基準（應為 137 全過）
3. 讀群組「beasttv 模組拆分」看子 Bot 進度
4. 用 `git status` 驗證是否有真實落檔
5. 做一個待辦項目（一次只做一件，做完跑測試）
6. 測試全過才 commit
7. 更新這份文件
8. 若全部完成或有阻礙，在群組或用戶對話留言說明

## 遇到問題時

- 測試失敗 → 先查是自己改壞還是原本就有問題，不要硬改測試來通過
- 子 Bot 沒落檔 → 自己接手做
- 不確定要不要改 → 不要改，記錄下來等用戶決定
