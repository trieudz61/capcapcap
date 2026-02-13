"""
Turnstile Persistent Worker for Recap1s SaaS
Runs as a long-lived HTTP server. Keeps Chrome open between solves.
Node.js calls this via HTTP to solve Turnstile captchas.

Usage: python3 turnstile_worker.py [port]
API: POST /solve  body: {"siteKey": "...", "domain": "..."}
"""

from DrissionPage import ChromiumPage, ChromiumOptions
from http.server import HTTPServer, BaseHTTPRequestHandler
import http.server
import socketserver
import threading
import sys
import time
import json
import os

# ============================================
# Config
# ============================================
WORKER_PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 9090
CAPTCHA_SERVER_PORT = 80
SOLVE_TIMEOUT = 45

# ============================================
# Global state
# ============================================
browser_page = None
captcha_server = None
current_html = ""

def log(msg):
    sys.stderr.write(f"[Turnstile Worker] {msg}\n")
    sys.stderr.flush()

# ============================================
# Captcha HTTP server (port 80, serves Turnstile HTML)
# ============================================
def start_captcha_server():
    global captcha_server
    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(current_html.encode('utf-8'))
        def log_message(self, format, *args):
            pass

    captcha_server = socketserver.TCPServer(("", CAPTCHA_SERVER_PORT), Handler)
    captcha_server.serve_forever()

# ============================================
# HTML template
# ============================================
def get_html(site_key):
    return f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Verification</title>
<style>body{{margin:0;padding:40px;background:#f5f5f5;font-family:sans-serif;display:flex;justify-content:center;}}</style>
</head><body>
<div id="tw"></div>
<script>
window.__TOKEN__=null;
window.onloadTurnstileCallback=function(){{
    turnstile.render('#tw',{{
        sitekey:'{site_key}',
        callback:function(t){{window.__TOKEN__=t;document.title='TOKEN:'+t;}},
        'error-callback':function(e){{document.title='ERROR:'+(e||'unknown');}}
    }});
}};
</script>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit" async defer></script>
</body></html>"""

# ============================================
# Browser management
# ============================================
def init_browser():
    global browser_page
    log("Starting Chrome...")
    co = ChromiumOptions()
    co.set_argument('--window-position=0,0')
    co.set_argument('--window-size=1000,800')
    co.set_argument('--no-first-run')
    co.set_argument('--no-default-browser-check')
    browser_page = ChromiumPage(co)
    log("Chrome ready!")

def click_turnstile(page):
    """Click the Turnstile checkbox — fast version with short timeouts"""
    try:
        # Method 1: Click iframe element from parent (fastest)
        iframe_el = page.ele('css:iframe', timeout=0.3)
        if iframe_el:
            iframe_el.click()
            log("Clicked iframe")
            return True
    except:
        pass
    return False

def check_token(page):
    """Check for token using a single fast JS call"""
    try:
        token = page.run_js(
            'var t=document.title;'
            'if(t&&t.startsWith("TOKEN:"))return t.substring(6);'
            'var el=document.getElementsByName("cf-turnstile-response")[0];'
            'if(el&&el.value)return el.value;'
            'return "";'
        )
        if token and len(token) > 5:
            return token
    except:
        pass
    return None

def solve(site_key, domain):
    global browser_page, current_html
    start = time.time()

    # Update HTML for captcha server
    current_html = get_html(site_key)

    # Navigate (reuse existing browser — FAST!)
    browser_page.get(f"http://{domain}/")
    log(f"Page loaded in {round(time.time()-start,1)}s")

    clicked = False
    last_click = 0

    while time.time() - start < SOLVE_TIMEOUT:
        # 1) Check token FIRST (fastest path)
        token = check_token(browser_page)
        if token:
            elapsed = round(time.time() - start, 1)
            log(f"✅ Solved in {elapsed}s")
            return {"status": "ok", "token": token, "time": elapsed}

        # 2) If already clicked, just poll fast — don't waste time clicking again
        if clicked:
            time.sleep(0.05)
            continue

        # 3) Try to click (only if not clicked yet, or retry after 5s)
        if time.time() - last_click > 2:
            if click_turnstile(browser_page):
                clicked = True
                log(f"Clicked at {round(time.time()-start,1)}s")
            last_click = time.time()

        time.sleep(0.1)

    return {"status": "error", "message": "Timeout"}

# ============================================
# Worker HTTP API
# ============================================
class WorkerHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/solve':
            length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(length))
            site_key = body.get('siteKey', '')
            domain = body.get('domain', '')

            if not site_key or not domain:
                self.respond(400, {"status": "error", "message": "Missing siteKey or domain"})
                return

            try:
                result = solve(site_key, domain)
                self.respond(200, result)
            except Exception as e:
                log(f"Error: {e}")
                # Try to restart browser
                try:
                    init_browser()
                except:
                    pass
                self.respond(500, {"status": "error", "message": str(e)})
        else:
            self.respond(404, {"status": "error", "message": "Not found"})

    def do_GET(self):
        if self.path == '/health':
            self.respond(200, {"status": "ok", "browser": browser_page is not None})
        else:
            self.respond(404, {})

    def respond(self, code, data):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        pass  # Suppress access logs

# ============================================
# Main
# ============================================
if __name__ == "__main__":
    log(f"Starting worker on port {WORKER_PORT}...")

    # Start captcha page server (port 80)
    threading.Thread(target=start_captcha_server, daemon=True).start()
    time.sleep(0.5)
    log(f"Captcha server running on port {CAPTCHA_SERVER_PORT}")

    # Start browser (ONCE — reused for all solves)
    init_browser()

    # Start worker API server
    server = HTTPServer(('127.0.0.1', WORKER_PORT), WorkerHandler)
    log(f"Worker API ready at http://127.0.0.1:{WORKER_PORT}")
    log("Endpoints: POST /solve, GET /health")
    
    # Signal ready to parent process
    print(json.dumps({"status": "ready", "port": WORKER_PORT}), flush=True)
    
    server.serve_forever()
