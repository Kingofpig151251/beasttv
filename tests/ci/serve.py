#!/usr/bin/env python3
"""本機靜態伺服器（CI 冒煙測試用，只用 Python 標準庫）。

- 由 repo root 供應靜態檔（index.html、styles.css、app.js、art/、sfx/…）
- 模擬 Vercel cleanUrls：/edit → edit.html、/credits → credits.html
- 模擬 /api/text，回一份固定題目，令首頁永遠有題可玩（唔會碰正式題庫）
- 其他 /api/* 回 200 空 JSON，避免測試被 404／console error 干擾

手動用：
    python tests/ci/serve.py --port 8000
"""
from __future__ import annotations

import argparse
import json
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[2]

SAMPLE_TEXT = "熱帶雨林\n雪櫃\n太空站\n珍珠奶茶\n"

API_TEXT = json.dumps(
    {"text": SAMPLE_TEXT, "title": "", "subtitle": ""}, ensure_ascii=False
).encode("utf-8")

API_OK = b'{"ok":true}'


class CIHandler(SimpleHTTPRequestHandler):
    """SimpleHTTPRequestHandler ＋ 兩個小約定：cleanUrls 與 /api 打樁。"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    # 測試 log 唔想被每個請求洗版
    def log_message(self, fmt, *args):
        pass

    def _json(self, body: bytes, status: int = 200) -> None:
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _map_clean_url(self) -> None:
        """/edit、/credits 之類（無副檔名）對應到同名 .html。"""
        path = urlsplit(self.path).path
        if path == "/" or Path(path).suffix:
            return
        candidate = ROOT / (path.lstrip("/") + ".html")
        if candidate.is_file():
            self.path = path + ".html"

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/api/text":
            return self._json(API_TEXT)
        if path.startswith("/api/"):
            return self._json(API_OK)
        self._map_clean_url()
        return super().do_GET()

    def do_POST(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length:
            self.rfile.read(length)  # 丟棄 body
        return self._json(API_OK)


def start_server(port: int = 0) -> ThreadingHTTPServer:
    """在背景執行緒起 server；傳回已綁定 port 的 httpd。"""
    httpd = ThreadingHTTPServer(("127.0.0.1", port), CIHandler)
    httpd.daemon_threads = True
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def main() -> int:
    ap = argparse.ArgumentParser(description="百獸台本機靜態伺服器")
    ap.add_argument("--port", type=int, default=8000)
    args = ap.parse_args()
    httpd = start_server(args.port)
    print(f"serving {ROOT} at http://127.0.0.1:{httpd.server_address[1]}/", flush=True)
    try:
        while True:
            threading.Event().wait(3600)
    except KeyboardInterrupt:
        pass
    finally:
        httpd.shutdown()
    return 0


if __name__ == "__main__":
    sys.exit(main())
