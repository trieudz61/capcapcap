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
import uuid
import subprocess
import atexit

# ============================================
# Config
# ============================================
WORKER_PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 9090
CAPTCHA_SERVER_PORT = 80
SOLVE_TIMEOUT = 45
HOSTS_FILE = "/etc/hosts"
HOSTS_MARKER = "# recap1s-turnstile"

# ============================================
# Global state
# ============================================
browser_page = None
captcha_server = None
current_domain = None
domain_lock = threading.Lock()
html_pages = {}  # req_id -> html string
active_solves = 0
solve_counter_lock = threading.Lock()

def log(msg):
    sys.stderr.write(f"[Turnstile Worker] {msg}\n")
    sys.stderr.flush()

# ============================================
# /etc/hosts management
# ============================================
def add_host_entry(domain):
    """Add 127.0.0.1 mapping for domain to /etc/hosts"""
    global current_domain
    if current_domain == domain:
        return  # Already mapped
    
    # Remove old entry first
    remove_host_entry()
    
    entry = f"127.0.0.1 {domain} {HOSTS_MARKER}\n"
    try:
        # Use tee to write with sudo (worker runs as root or has permissions)
        with open(HOSTS_FILE, 'r') as f:
            content = f.read()
        if f"{HOSTS_MARKER}" not in content:
            with open(HOSTS_FILE, 'a') as f:
                f.write(entry)
        else:
            # Replace existing marker line
            lines = content.split('\n')
            lines = [l for l in lines if HOSTS_MARKER not in l]
            lines.append(entry.strip())
            with open(HOSTS_FILE, 'w') as f:
                f.write('\n'.join(lines) + '\n')
        
        # Flush DNS cache (macOS)
        try:
            subprocess.run(['dscacheutil', '-flushcache'], capture_output=True, timeout=3)
        except:
            pass
        
        current_domain = domain
        log(f"Added hosts entry: 127.0.0.1 → {domain}")
    except Exception as e:
        log(f"⚠️  Failed to update hosts file: {e}")
        log(f"   Run worker with sudo or manually add: 127.0.0.1 {domain}")

def remove_host_entry():
    """Remove our marker entry from /etc/hosts"""
    global current_domain
    try:
        with open(HOSTS_FILE, 'r') as f:
            lines = f.readlines()
        cleaned = [l for l in lines if HOSTS_MARKER not in l]
        if len(cleaned) != len(lines):
            with open(HOSTS_FILE, 'w') as f:
                f.writelines(cleaned)
            log(f"Removed hosts entry for {current_domain}")
    except Exception as e:
        log(f"⚠️  Failed to cleanup hosts: {e}")
    current_domain = None

# Cleanup on exit
atexit.register(remove_host_entry)

# ============================================
# Captcha HTTP server (port 80, serves Turnstile HTML)
# Path-based routing: each request gets /{req_id}
# ============================================
def start_captcha_server():
    global captcha_server
    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            req_id = self.path.strip('/')
            html = html_pages.get(req_id, '<h1>Waiting...</h1>')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(html.encode('utf-8'))
        def log_message(self, format, *args):
            pass

    captcha_server = socketserver.ThreadingTCPServer(("", CAPTCHA_SERVER_PORT), Handler)
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
    log("Starting Chrome (minimal window)...")
    co = ChromiumOptions()
    co.set_argument('--window-position=0,0')
    co.set_argument('--window-size=400,300')
    co.set_argument('--no-first-run')
    co.set_argument('--no-default-browser-check')
    browser_page = ChromiumPage(co)
    log("Chrome ready! (400x300)")

def click_turnstile(tab):
    """
    Click the Turnstile checkbox — handles all 3 widget modes:
    - Non-interactive: auto-passes, no click needed (we still try, harmless)
    - Managed: sometimes auto-passes, sometimes needs click
    - Interactive: always needs click on the checkbox
    
    Uses multiple strategies for reliability.
    """
    # Strategy 1: Click the iframe directly (works for most cases)
    try:
        iframe_el = tab.ele('css:iframe[src*="challenges.cloudflare.com"]', timeout=0.5)
        if not iframe_el:
            iframe_el = tab.ele('css:iframe', timeout=0.3)
        if iframe_el:
            iframe_el.click()
            log("Clicked iframe (strategy 1)")
            return True
    except:
        pass
    
    # Strategy 2: Click via coordinates
    try:
        result = tab.run_js("""
            var iframes = document.querySelectorAll('iframe');
            for (var i = 0; i < iframes.length; i++) {
                var rect = iframes[i].getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    var x = rect.left + 30;
                    var y = rect.top + rect.height / 2;
                    return JSON.stringify({x: x, y: y});
                }
            }
            return '';
        """)
        if result:
            coords = json.loads(result)
            tab.run_js(f"""
                var el = document.elementFromPoint({coords['x']}, {coords['y']});
                if (el) el.click();
            """)
            log(f"Clicked at ({coords['x']:.0f}, {coords['y']:.0f}) (strategy 2)")
            return True
    except:
        pass
    
    # Strategy 3: Click the wrapper div
    try:
        tw_div = tab.ele('css:#tw', timeout=0.2)
        if tw_div:
            tw_div.click()
            log("Clicked wrapper div (strategy 3)")
            return True
    except:
        pass
    
    return False

def check_token(tab):
    """Check for token using a single fast JS call"""
    try:
        token = tab.run_js(
            'var t=document.title;'
            'if(t&&t.startsWith("TOKEN:"))return t.substring(6);'
            'if(t&&t.startsWith("ERROR:"))return "ERR:"+t.substring(6);'
            'var el=document.getElementsByName("cf-turnstile-response")[0];'
            'if(el&&el.value)return el.value;'
            'return "";'
        )
        if token and token.startswith('ERR:'):
            return 'ERROR'  # Return special marker, don't log every poll
        if token and len(token) > 5:
            return token
    except:
        pass
    return None

def solve(site_key, domain):
    global browser_page, active_solves
    req_id = uuid.uuid4().hex[:8]
    start = time.time()

    # Track active solves
    with solve_counter_lock:
        active_solves += 1
    log(f"[{req_id}] Starting solve (active: {active_solves})")

    try:
        # 1) Map domain → 127.0.0.1 in /etc/hosts (thread-safe)
        with domain_lock:
            add_host_entry(domain)

        # 2) Register HTML for this request (unique path)
        html_pages[req_id] = get_html(site_key)

        # 3) Open a NEW TAB with unique path
        tab = browser_page.new_tab(f"http://{domain}/{req_id}")
        log(f"[{req_id}] Tab opened in {round(time.time()-start,1)}s")

        try:
            click_count = 0
            last_click_time = 0
            error_logged = False
            CLICK_RETRY_INTERVAL = 3

            while time.time() - start < SOLVE_TIMEOUT:
                # 1) Check token FIRST
                token = check_token(tab)
                if token == 'ERROR':
                    if not error_logged:
                        log(f"[{req_id}] ⚠️  Turnstile validation error (retrying...)")
                        error_logged = True
                    time.sleep(0.2)
                    continue
                if token:
                    mode = "auto-pass" if click_count == 0 else f"after {click_count} click(s)"
                    elapsed = round(time.time() - start, 1)
                    log(f"[{req_id}] ✅ Solved in {elapsed}s ({mode})")
                    return {"status": "ok", "token": token, "time": elapsed}

                # 2) Try clicking
                now = time.time()
                if now - last_click_time > CLICK_RETRY_INTERVAL:
                    if click_turnstile(tab):
                        click_count += 1
                        last_click_time = now
                    else:
                        last_click_time = now

                time.sleep(0.1)

            log(f"[{req_id}] ❌ Timeout after {SOLVE_TIMEOUT}s")
            return {"status": "error", "message": "Timeout"}
        finally:
            try:
                tab.close()
            except:
                pass
    finally:
        # Cleanup
        html_pages.pop(req_id, None)
        with solve_counter_lock:
            active_solves -= 1
        log(f"[{req_id}] Done (active: {active_solves})")

# ============================================
# Worker HTTP API (ThreadingHTTPServer for concurrency)
# ============================================
from http.server import ThreadingHTTPServer

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
                try:
                    log("Restarting browser and retrying...")
                    init_browser()
                    result = solve(site_key, domain)
                    self.respond(200, result)
                except Exception as e2:
                    log(f"Retry also failed: {e2}")
                    self.respond(500, {"status": "error", "message": str(e2)})
        else:
            self.respond(404, {"status": "error", "message": "Not found"})

    def do_GET(self):
        if self.path == '/health':
            self.respond(200, {
                "status": "ok",
                "browser": browser_page is not None,
                "active_solves": active_solves
            })
        else:
            self.respond(404, {})

    def respond(self, code, data):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        pass

# ============================================
# Main
# ============================================
if __name__ == "__main__":
    log(f"Starting worker on port {WORKER_PORT}...")

    # Start captcha page server (port 80, threaded for concurrent tabs)
    threading.Thread(target=start_captcha_server, daemon=True).start()
    time.sleep(0.5)
    log(f"Captcha server running on port {CAPTCHA_SERVER_PORT}")

    # Start browser (ONCE — reused for all solves via tabs)
    init_browser()

    # Start worker API server (THREADED — handles concurrent requests)
    server = ThreadingHTTPServer(('127.0.0.1', WORKER_PORT), WorkerHandler)
    log(f"Worker API ready at http://127.0.0.1:{WORKER_PORT}")
    log("Endpoints: POST /solve, GET /health")
    log("Mode: CONCURRENT (multi-tab)")
    
    # Signal ready to parent process
    print(json.dumps({"status": "ready", "port": WORKER_PORT}), flush=True)
    
    server.serve_forever()
