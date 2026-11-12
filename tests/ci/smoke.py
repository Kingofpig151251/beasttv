#!/usr/bin/env python3
"""百獸台冒煙測試（CI 用，Python + Playwright Chromium）。

流程：
  1. 首頁：標題、`開始` 按鈕存在、無 console error、無失敗請求
  2. 六步設定：逐歩按「繼續」，最後一步顯示「開始遊戲」
  3. 開始遊戲 → 準備好 → 倒數完 → 出題畫面（題目非空）

本機先跑 `pip install playwright && python -m playwright install chromium`。
伺服器由 tests/ci/serve.py 即場起（cleanUrls ＋ /api/text 打樁），唔會連正式題庫。

用法：
    python tests/ci/smoke.py
    python tests/ci/smoke.py --headed --slow-mo 100
"""
from __future__ import annotations

import argparse
import os
import sys
import tempfile
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

from serve import start_server

HERE = Path(__file__).resolve().parent
RESULTS: list[tuple[str, bool, str]] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    RESULTS.append((name, bool(cond), detail))
    mark = "OK  " if cond else "FAIL"
    print(f"  {mark} {name}" + (f"   [{detail}]" if detail and not cond else ""), flush=True)


def wait_step(page: Page, idx: int, timeout: float = 10_000) -> None:
    page.wait_for_function(
        "i => { const s = document.querySelector('.sstep.on');"
        " return !!s && Number(s.dataset.step) === i; }",
        arg=idx,
        timeout=timeout,
    )


def tap(page: Page, selector: str) -> None:
    """app.js 有 260ms 同一個掣的輸入防抖，按完要等過防抖窗口再按同一個掣。"""
    page.locator(selector).click()
    page.wait_for_timeout(350)


def main() -> int:
    ap = argparse.ArgumentParser(description="百獸台冒煙測試")
    ap.add_argument("--headed", action="store_true")
    ap.add_argument("--slow-mo", type=int, default=0)
    args = ap.parse_args()

    httpd = start_server(0)
    base = f"http://127.0.0.1:{httpd.server_address[1]}"
    console_errors: list[str] = []
    page_errors: list[str] = []
    request_failures: list[str] = []
    bad_responses: list[str] = []
    shot = ""

    print(f"伺服器：{base}", flush=True)
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=not args.headed, slow_mo=args.slow_mo)
            ctx = browser.new_context(
                viewport={"width": 1024, "height": 768},
                locale="zh-HK",
                reduced_motion="reduce",  # 倒數每拍 0.7s，加快但不改行為
            )
            page = ctx.new_page()
            page.set_default_timeout(12_000)

            page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
            page.on("pageerror", lambda e: page_errors.append(str(e)))
            page.on("requestfailed", lambda r: request_failures.append(f"{r.method} {r.url} · {r.failure or ''}"))
            page.on(
                "response",
                lambda r: bad_responses.append(f"{r.status} {r.url}") if r.status >= 400 else None,
            )

            print("\n[1/3] 首頁", flush=True)
            page.goto(base + "/", wait_until="load")
            page.wait_for_selector("#btnEnter", state="visible")
            check("document.title 有「百獸台」", "百獸台" in page.title(), page.title())
            check("主標題是「百獸台」", page.locator("h1.landing-title").inner_text().strip() == "百獸台",
                  page.locator("h1.landing-title").inner_text())
            check("「開始」按鈕存在且可見", page.locator("#btnEnter").is_visible())
            check("「開始」按鈕文字是「開始」", page.locator("#btnEnter").inner_text().strip() == "開始",
                  page.locator("#btnEnter").inner_text())
            page.wait_for_timeout(300)  # 讓首頁的 /api/text、圖檔請求跑完
            # 題庫未載入時「繼續」會變「重試載入」；等它變「繼續」再開始，避免假失敗
            page.wait_for_function(
                "() => document.getElementById('btnNext')?.textContent.trim() === '繼續'",
                timeout=10_000,
            )
            first_label = page.locator("#btnNext").inner_text().strip()
            check("題庫已載入（#btnNext 顯示「繼續」）", first_label == "繼續", first_label)

            print("\n[2/3] 六步設定", flush=True)
            page.locator("#btnEnter").click()
            wait_step(page, 0)
            titles = []
            for i in range(6):
                wait_step(page, i)
                titles.append(page.locator(".sstep.on .sstep-title").inner_text().strip())
                label = page.locator("#btnNext").inner_text().strip()
                expect = "繼續" if i < 5 else "開始遊戲"
                check(f"第 {i + 1} 步（{titles[-1]}）按鈕是「{expect}」", label == expect, label)
                tap(page, "#btnNext")
                if i < 5:
                    wait_step(page, i + 1)

            print("\n[3/3] 開始遊戲 → 準備好 → 出題", flush=True)
            page.wait_for_selector("#readyOverlay", state="visible", timeout=15_000)
            check("準備畫面出現", page.locator("#readyOverlay").is_visible())
            check("準備畫面顯示第 1 回合", "第 1 回合" in page.locator("#rdRound").inner_text(),
                  page.locator("#rdRound").inner_text())
            check("「準備好」按鈕可見", page.locator("#btnReady").is_visible())

            page.locator("#btnReady").click()
            page.wait_for_function(
                "() => document.body.dataset.view === 'play' &&"
                " (document.getElementById('pText')?.textContent || '').trim().length > 0",
                timeout=15_000,
            )
            check("已進入遊戲畫面", page.evaluate("document.body.dataset.view") == "play")
            check("出題畫面有題目（#pText 非空）",
                  bool(page.locator("#pText").inner_text().strip()))
            check("判定鍵（犯規／跳過／正確）可見",
                  page.locator("[data-judge]").count() == 3 and page.locator("#hud").is_visible())

            if console_errors or page_errors or request_failures or bad_responses:
                shot = os.path.join(tempfile.gettempdir(), "beasttv-smoke-failure.png")
                page.screenshot(path=shot, full_page=True)

            browser.close()
    finally:
        httpd.shutdown()

    print("\n請求與錯誤", flush=True)
    check("無 console error", not console_errors, " | ".join(console_errors[:5]))
    check("無 page error（未捕捉例外）", not page_errors, " | ".join(page_errors[:5]))
    check("無失敗請求", not request_failures, " | ".join(request_failures[:5]))
    check("無 4xx／5xx 回應", not bad_responses, " | ".join(bad_responses[:5]))

    failed = [r for r in RESULTS if not r[1]]
    print()
    if failed:
        print(f"SMOKE: FAIL（{len(RESULTS) - len(failed)}/{len(RESULTS)} 通過）")
        if shot:
            print(f"失敗截圖：{shot}")
        return 1
    print(f"SMOKE: PASS（{len(RESULTS)}/{len(RESULTS)} 通過）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
