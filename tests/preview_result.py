#!/usr/bin/env python3
"""Static preview of the result screen, built from styles.css.

Usage:
    python3 tests/preview_result.py                   # 跑 8 尺寸 scrollHeight/clientWidth 斷言
    python3 tests/preview_result.py <W> <H> <out.png>  # 單一尺寸量測＋截圖

讀 styles.css（不再從 index.html 抽 <style>；index.html 只載外部樣式），
自帶 icon 表（對齊 app.js 的 ICONS），避免 re.search 取不到而 AttributeError。
8 個尺寸斷言：每個尺寸 scrollHeight == clientHeight（無垂直捲動）、
clientWidth == 視窗寬（無水平捲動），與 README 聲稱一致。
"""
import json
import os
import re
import subprocess
import sys
import tempfile

CHROME = "/opt/data/tools/chrome-headless-shell/chrome-headless-shell-linux64/chrome-headless-shell"

# 對齊 app.js：8 個動物 id 與其 webp 圖示（預覽用，/art/team 路徑不一定要存在）
TEAM_IDS = ["turtle", "fox", "whale", "octopus", "bee", "flamingo", "dolphin", "bear"]
ICONS = {tid: f'<img class="mark-img" src="/art/team/{tid}.webp" alt="" decoding="async">'
         for tid in TEAM_IDS}

# README 聲稱「全部 scrollHeight == clientHeight」的 8 個尺寸
SIZES = [
    (320, 568), (360, 640), (390, 844), (412, 915),
    (430, 932), (740, 360), (844, 390), (768, 1024),  # iPad 直（橫向 1024×768 同邏輯）
]

STYLE_PATH = os.path.join(os.path.dirname(__file__), "..", "styles.css")


def load_style():
    with open(STYLE_PATH, encoding="utf-8") as f:
        return f.read()


def build_page(style, W, H):
    TEAMS = [
        ("turtle", "烏龜隊", "#34C759", 8, 0, 16),
        ("fox", "狐狸隊", "#FF9500", 7, 1, 13),
        ("whale", "鯨魚隊", "#0071E3", 6, 2, 10),
        ("octopus", "章魚隊", "#AF52DE", 5, 3, 7),
        ("bee", "蜜蜂隊", "#F5A300", 4, 4, 4),
    ]
    rows = []
    for i, (tid, name, color, ok, skip, score) in enumerate(TEAMS):
        champ = i == 0
        rows.append(f'''
        <div class="rk in {'is-champ flipped' if champ else ''}" data-champ="{1 if champ else 0}" style="--tc:{color}">
          <div class="flip">
            <div class="face front"><div class="front-card"></div></div>
            <div class="face back">
              <div class="no">{i + 1}</div>
              <div class="rk-tile"><span class="rk-mark">{ICONS.get(tid, "")}</span></div>
              <div class="nm">{name}
                <div class="st">對 {ok} · 跳過 {skip} · 犯規 0</div>
              </div>
              <div class="pt" data-score="{score}">{score}</div>
            </div>
          </div>
        </div>''')

    measure = """
    <script>
    window.addEventListener("load", () => {
      const r = el => { const b = el.getBoundingClientRect();
        return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
      const card = document.querySelector(".rk.is-champ");
      const back = card.querySelector(".face.back");
      const row2 = document.querySelectorAll(".rk")[1];
      const out = {
        card: r(card), back: r(back),
        tile: r(card.querySelector(".rk-tile")),
        nm: r(card.querySelector(".nm")),
        pt: r(card.querySelector(".pt")),
        row2: r(row2), row2pt: r(row2.querySelector(".pt")),
        display: getComputedStyle(back).display,
        justify: getComputedStyle(back).justifyContent,
        docH: document.documentElement.scrollHeight,
        docW: document.documentElement.clientWidth,
        winH: window.innerHeight, winW: window.innerWidth
      };
      document.title = JSON.stringify(out);
      document.getElementById("m").textContent = JSON.stringify(out);
    });
    </script>
    """

    page = (
        '<!doctype html><html class="js"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        f"<style>{style}</style></head><body data-view=\"result\"><div class=\"wrap\">"
        '<section class="view active" id="v-result">'
        '<div class="res-head"><h1>最終排名</h1>'
        '<p class="kv" id="rSub" style="margin:8px 0 0">全場答對 30 題 · 總分 50</p></div>'
        f'<div class="rank" id="rankList">{"".join(rows)}</div>'
        '<div class="result-actions on"><button class="btn-primary btn-big" id="btnBackHome">返回主頁</button></div>'
        "</section></div>"
        '<pre id="m" style="font:11px monospace;color:#444;padding:6px"></pre>'
        + measure
        + "</body></html>"
    )
    tmp = tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8", dir="/tmp")
    tmp.write(page)
    tmp.close()
    return tmp.name


def measure(html_path):
    res = subprocess.run(
        [CHROME, "--headless", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
         "--virtual-time-budget=1200", "--dump-dom", f"file://{html_path}"],
        capture_output=True, text=True, timeout=90,
    )
    dom = res.stdout
    mm = re.search(r'<pre id="m"[^>]*>(.*?)</pre>', dom, re.S)
    if mm and mm.group(1).strip():
        return json.loads(mm.group(1))
    return None


def run_sizes(style):
    print("=== 8 尺寸 scrollHeight/clientWidth 斷言 ===")
    all_ok = True
    for W, H in SIZES:
        p = build_page(style, W, H)
        try:
            m = measure(p)
        finally:
            os.unlink(p)
        if not m:
            print(f"  ✗ {W}×{H}: 取不到量測值")
            all_ok = False
            continue
        no_vscroll = m["docH"] == m["winH"]
        no_hscroll = m["docW"] == m["winW"]
        ok = no_vscroll and no_hscroll
        all_ok = all_ok and ok
        flag = "✓" if ok else "✗"
        detail = (f"docH={m['docH']} winH={m['winH']} (vscroll={not no_vscroll}); "
                  f"docW={m['docW']} winW={m['winW']} (hscroll={not no_hscroll})")
        print(f"  {flag} {W}×{H}: {detail}")
    return all_ok


def run_single(style, W, H, OUT):
    p = build_page(style, W, H)
    try:
        m = measure(p)
        if m:
            print(json.dumps(m, indent=None))
        subprocess.run(
            [CHROME, "--headless", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
             f"--window-size={W},{H}", "--force-device-scale-factor=1",
             f"--screenshot={OUT}", f"file://{p}"],
            capture_output=True, text=True, timeout=90,
        )
    finally:
        os.unlink(p)
    print(OUT, os.path.getsize(OUT) if os.path.exists(OUT) else "FAIL")


def main():
    style = load_style()
    if len(sys.argv) == 4:
        W, H, OUT = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
        run_single(style, W, H, OUT)
    else:
        ok = run_sizes(style)
        print("\n" + ("PASS — 8 尺寸零捲動" if ok else "FAIL — 有尺寸溢出"))


if __name__ == "__main__":
    main()
