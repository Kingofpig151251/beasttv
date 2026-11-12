#!/usr/bin/env python3
"""百獸台靜態檢查（CI 用，只用 Python 標準庫）。

檢查三件事：
  1. HTML 可否解析、標籤有無正確開合（void 元素、可省略結尾的元素會正確處理）
  2. 同一份文件內有無重複 id
  3. 站內連結／資源（href/src 以 "/" 開頭）有無對應檔案
     （支援 Vercel cleanUrls：/edit → edit.html、/credits → credits.html、/ → index.html）

用法：
    python tests/ci/static_check.py                  # 檢查 repo root
    python tests/ci/static_check.py --root . --pages index.html edit.html credits.html

退出碼：0 = 全部通過；1 = 有 FAIL。
"""
from __future__ import annotations

import argparse
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

# HTML void elements：不會有結尾標籤
VOID = {
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
    "meta", "param", "source", "track", "wbr",
}

# 結尾標籤可以省略的元素（遇到下列開始標籤時隱式收合）
IMPLICIT = {
    "li": {"li"},
    "dt": {"dt", "dd"},
    "dd": {"dt", "dd"},
    "p": {
        "address", "article", "aside", "blockquote", "div", "dl", "fieldset",
        "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr",
        "main", "nav", "ol", "p", "pre", "section", "table", "ul",
    },
    "option": {"option", "optgroup"},
    "optgroup": {"optgroup"},
    "thead": {"tbody", "tfoot"},
    "tbody": {"tbody", "tfoot"},
    "tr": {"tr"},
    "td": {"td", "th"},
    "th": {"td", "th"},
}

DEFAULT_PAGES = ["index.html", "edit.html", "credits.html"]


class TagAudit(HTMLParser):
    """追蹤開合標籤，收集錯誤與 id。"""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack: list[tuple[str, int]] = []
        self.errors: list[str] = []
        self.ids: dict[str, list[int]] = {}

    # --- 輔助 ---
    def _line(self) -> int:
        return self.getpos()[0]

    def _close_implicit(self, new_tag: str) -> None:
        while self.stack:
            top, _ = self.stack[-1]
            if new_tag in IMPLICIT.get(top, ()):
                self.stack.pop()
            else:
                break

    def _record_id(self, attrs) -> None:
        for name, value in attrs:
            if name == "id" and value is not None:
                self.ids.setdefault(value, []).append(self._line())
            if name == "id" and value is not None and not value.strip():
                self.errors.append(f"第 {self._line()} 行：id 是空字串")

    # --- HTMLParser hooks ---
    def handle_starttag(self, tag, attrs):
        self._record_id(attrs)
        self._close_implicit(tag)
        if tag not in VOID:
            self.stack.append((tag, self._line()))

    def handle_startendtag(self, tag, attrs):
        # <img ... /> 之類：自成一體，不入 stack
        self._record_id(attrs)

    def handle_endtag(self, tag):
        if tag in VOID:
            self.errors.append(f"第 {self._line()} 行：void 元素 </{tag}> 不應有結尾標籤")
            return
        if not self.stack:
            self.errors.append(f"第 {self._line()} 行：多餘的 </{tag}>（沒有對應開始標籤）")
            return
        if self.stack[-1][0] == tag:
            self.stack.pop()
            return
        # 找不到目前最內層，往下找：表示中間有標籤未關
        for depth in range(len(self.stack) - 1, -1, -1):
            if self.stack[depth][0] == tag:
                for open_tag, open_line in self.stack[depth + 1:]:
                    self.errors.append(
                        f"第 {self._line()} 行：</{tag}> 之前 <{open_tag}>（第 {open_line} 行）未關閉"
                    )
                del self.stack[depth:]
                return
        self.errors.append(f"第 {self._line()} 行：多餘的 </{tag}>（沒有對應開始標籤）")

    def close(self):
        super().close()
        for tag, line in self.stack:
            self.errors.append(f"第 {line} 行：<{tag}> 直到文件結尾都沒有關閉")


def resolve_internal(root: Path, url: str) -> Path | None:
    """把站內 URL 對應到實體檔案；對不到就回 None。"""
    path = urlsplit(url).path
    if not path.startswith("/") or path.startswith("//"):
        return None
    path = unquote(path)
    rel = path.lstrip("/")
    candidates: list[Path] = []
    if rel == "":
        candidates = [root / "index.html"]
    else:
        candidates.append(root / rel)
        if not rel.endswith("/"):
            # Vercel cleanUrls：/edit → edit.html
            candidates.append(root / (rel + ".html"))
        candidates.append(root / rel / "index.html")
    for c in candidates:
        if c.is_file():
            return c
    return None


class LinkAudit(HTMLParser):
    def __init__(self, root: Path):
        super().__init__(convert_charrefs=True)
        self.root = root
        self.broken: list[tuple[int, str, str]] = []

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if name not in ("href", "src") or not value:
                continue
            v = value.strip()
            if not v.startswith("/") or v.startswith("//"):
                continue  # 外部連結、相對路徑（本 repo 一律用絕對路徑）不查
            if resolve_internal(self.root, v) is None:
                self.broken.append((self.getpos()[0], name, v))


def check_page(root: Path, page: Path) -> list[str]:
    rel = page.relative_to(root).as_posix()
    problems: list[str] = []

    try:
        text = page.read_text(encoding="utf-8")
    except UnicodeDecodeError as e:
        return [f"{rel}：不是合法的 UTF-8（{e}）"]

    audit = TagAudit()
    try:
        audit.feed(text)
        audit.close()
    except Exception as e:  # HTMLParser 理論上不會拋，但保險
        return [f"{rel}：HTML 解析失敗（{e}）"]

    problems += [f"{rel}：{msg}" for msg in audit.errors]

    for ident, lines in audit.ids.items():
        if len(lines) > 1:
            spots = "、".join(f"第 {n} 行" for n in lines)
            problems.append(f"{rel}：id「{ident}」重複（{spots}）")

    links = LinkAudit(root)
    try:
        links.feed(text)
        links.close()
    except Exception:
        pass
    for line, attr, url in links.broken:
        problems.append(f"{rel}：第 {line} 行 {attr}=\"{url}\" 對不到檔案")

    return problems


def main() -> int:
    ap = argparse.ArgumentParser(description="百獸台靜態檢查")
    ap.add_argument("--root", default=str(Path(__file__).resolve().parents[2]))
    ap.add_argument("--pages", nargs="*", default=None)
    args = ap.parse_args()

    root = Path(args.root).resolve()
    pages = [root / p for p in (args.pages or DEFAULT_PAGES)]
    missing = [p for p in pages if not p.is_file()]
    if missing:
        for p in missing:
            print(f"FAIL 找不到頁面：{p.relative_to(root).as_posix()}")
        print("\nSTATIC CHECK: FAIL（頁面不存在）")
        return 1

    total = 0
    for page in pages:
        problems = check_page(root, page)
        rel = page.relative_to(root).as_posix()
        if problems:
            total += len(problems)
            for msg in problems:
                print(f"FAIL {msg}")
        else:
            print(f"OK   {rel}：標籤平衡、id 唯一、站內連結都存在")

    print()
    if total:
        print(f"STATIC CHECK: FAIL（{total} 項）")
        return 1
    print(f"STATIC CHECK: PASS（{len(pages)} 頁）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
