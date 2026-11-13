"""Offline check for the app (docs/APP_BRIEF.md, step 6). Needs Google Chrome.

    python scripts/check_offline.py <empty temporary folder>

1. Serves app/ on a free local port and opens it once in headless Chrome, until the service worker
   has fetched every file of the data bundle.
2. Stops the server, so nothing answers on that port.
3. Loads several pages again in the same browser profile and checks they still render.
The temporary folder holds the throwaway Chrome profile."""
import functools, http.server, threading, subprocess, sys, re, html, socket, urllib.request
S = sys.argv[1]
PROFILE = f"{S}/offline-profile"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
sock = socket.socket(); sock.bind(("127.0.0.1", 0)); PORT = sock.getsockname()[1]; sock.close()
base = f"http://127.0.0.1:{PORT}/"
requests = []
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): requests.append(self.path)
def chrome(args, budget=15000):
    return subprocess.run([CHROME, "--headless=new", "--disable-gpu", f"--user-data-dir={PROFILE}", "--no-first-run",
                           f"--virtual-time-budget={budget}"] + args, capture_output=True, text=True, timeout=120).stdout
def text(dom):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", dom)))
# 1. online visit: the service worker installs and caches the shell and the data bundle
srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), functools.partial(H, directory="app"))
threading.Thread(target=srv.serve_forever, daemon=True).start()
import json, time
files = json.loads(open("app/data/sw-version.js", encoding="utf-8").read().split("self.BUNDLE_FILES = ")[1].rstrip().rstrip(";"))
proc = subprocess.Popen([CHROME, "--headless=new", "--disable-gpu", f"--user-data-dir={PROFILE}", "--no-first-run",
                         "--remote-debugging-port=0", base + "#/"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
deadline = time.time() + 90
while time.time() < deadline:
    if all(f"/data/{f}" in requests for f in files):
        break
    time.sleep(0.5)
time.sleep(3)  # let the install step finish writing the cache
proc.terminate(); proc.wait(timeout=30)
srv.shutdown(); srv.server_close()
print("all bundle files fetched while online:", all(f"/data/{f}" in requests for f in files), f"({len(files)} files)")

# 2. offline: nothing is listening on the port any more
try:
    urllib.request.urlopen(base, timeout=2); print("server still up!")
except Exception as e:
    print("server stopped:", type(e).__name__)
failures = 0
for route, expect in [("#/", "Explore"), ("#/person/PER-000003", "Sundiata Keita"), ("#/battle/BAT-000014", "Cannae"),
                      ("#/source/SRC-000054", "Mongol Empire in World History"), ("#/search?q=tamerlane", "Timur")]:
    t = text(chrome(["--dump-dom", base + route]))
    ok = expect in t and "could not be loaded" not in t
    print("offline", route, "->", "works" if ok else "FAILED")
    failures += 0 if ok else 1
sys.exit(1 if failures else 0)
