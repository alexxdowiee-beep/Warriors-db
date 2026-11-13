"""Render the app icons (app/icons/*.png) with headless Chrome from an HTML design that uses the
self-hosted Cinzel font. Run from the repository root; needs Google Chrome installed.

    python scripts/make_icons.py <temporary folder for a Chrome profile> app/icons

The maskable icon keeps its content inside the central 62% (Android's safe zone is the central 80%
circle). No image library is needed: Chrome renders each size directly."""
import functools, http.server, threading, subprocess, sys, struct, zlib
S, OUT = sys.argv[1], sys.argv[2]
def design(maskable):
    scale = 0.62 if maskable else 0.8
    radius = "0" if maskable else "18%"
    return f"""<!doctype html><html><head><link rel="stylesheet" href="/css/fonts.css"><style>
html,body{{margin:0;background:transparent}}
.i{{width:512px;height:512px;border-radius:{radius};background:#0B0D10;display:flex;align-items:center;justify-content:center;
box-sizing:border-box;{'' if maskable else 'border:10px solid #2A2F38;'}}}
.m{{width:{512*scale}px;height:{512*scale}px;border:{int(10*scale/0.8)}px solid #E2B25C;border-radius:50%;box-sizing:border-box;
display:flex;align-items:center;justify-content:center;font-family:Cinzel,serif;font-weight:700;color:#E7E4DC;
font-size:{int(150*scale/0.8)}px;letter-spacing:-0.02em}}
.a{{color:#E2B25C;font-size:0.8em;margin:0 0.02em}}
</style></head><body><div class="i"><div class="m">W<span class="a">&amp;</span>L</div></div></body></html>"""
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        if self.path.startswith("/__icon"):
            body = design("maskable" in self.path).encode()
            self.send_response(200); self.send_header("Content-Type", "text/html"); self.end_headers(); self.wfile.write(body)
        else: super().do_GET()
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(H, directory="app"))
threading.Thread(target=srv.serve_forever, daemon=True).start()
def shot(path, px, out):
    subprocess.run([r"C:\Program Files\Google\Chrome\Application\chrome.exe", "--headless=new", "--disable-gpu", "--hide-scrollbars",
                    f"--user-data-dir={S}/chrome-profile", "--virtual-time-budget=4000", "--default-background-color=00000000",
                    "--window-size=512,512", f"--force-device-scale-factor={px/512}", f"--screenshot={out}",
                    f"http://127.0.0.1:{srv.server_port}{path}"], capture_output=True, timeout=60)
    w, h = struct.unpack(">II", open(out, "rb").read()[16:24])
    print(out.split("/")[-1], w, h)
for name, path, px in [("icon-512.png", "/__icon", 512), ("icon-192.png", "/__icon", 192),
                       ("icon-maskable-512.png", "/__icon-maskable", 512), ("apple-touch-icon.png", "/__icon-maskable", 180),
                       ("favicon-32.png", "/__icon", 32)]:
    shot(path, px, f"{OUT}/{name}")
srv.shutdown()
