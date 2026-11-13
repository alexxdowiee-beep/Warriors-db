"""The service worker (app/sw.js) must cache every file of the app shell, so the app works offline."""
import re
import unittest
from pathlib import Path

APP = Path(__file__).resolve().parent.parent / "app"
NOT_CACHED = {"sw.js"}  # the worker itself is managed by the browser


class AppShell(unittest.TestCase):
    def setUp(self):
        text = (APP / "sw.js").read_text(encoding="utf-8")
        block = re.search(r"const SHELL = \[(.*?)\];", text, re.S).group(1)
        self.shell = set(re.findall(r"'([^']+)'", block))

    def test_every_shell_file_exists(self):
        for f in self.shell - {"./"}:
            self.assertTrue((APP / f).is_file(), f)

    def test_every_app_file_is_cached(self):
        files = {p.relative_to(APP).as_posix() for p in APP.rglob("*") if p.is_file()}
        needed = {f for f in files if not f.startswith("data/") and not f.endswith((".txt", ".gitkeep"))} - NOT_CACHED
        self.assertEqual(needed - self.shell, set())

    def test_no_external_urls_in_app_code(self):
        for p in list(APP.glob("*.html")) + list(APP.glob("*.js")) + list(APP.rglob("js/**/*.js")) + list(APP.glob("css/*.css")):
            text = p.read_text(encoding="utf-8")
            self.assertIsNone(re.search(r"(?:src|href)=[\"']https?://|url\(['\"]?https?://|fetch\(['\"`]https?://|importScripts\(['\"]https?://", text),
                              p.name)


if __name__ == "__main__":
    unittest.main()
