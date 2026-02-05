from DrissionPage import ChromiumPage, ChromiumOptions
import http.server
import socketserver
import threading
import os
import time
import json

# --- CẤU HÌNH CHO TURNSTILE ---
SITE_KEY = "0x4AAAAAACMZS_6vw7sJctTQ" # Mã của WeChoice
DOMAIN = "wechoice.vn"
PORT = 80 

def save_to_json(data):
    file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "captcha_data.json")
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
    print(f"[v] Đã lưu dữ liệu vào: {file_path}")

def start_server():
    # Chuyển vào thư mục chứa file index.html
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    Handler = http.server.SimpleHTTPRequestHandler
    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            print(f"Server local đang chạy tại http://{DOMAIN}:{PORT}")
            httpd.serve_forever()
    except Exception as e:
        print(f"Lỗi khởi động Server: {e}")

def main():
    threading.Thread(target=start_server, daemon=True).start()
    time.sleep(2)

    co = ChromiumOptions()
    # Mẹo: Đẩy cửa sổ ra khỏi màn hình để ẩn mà không bị Cloudflare phát hiện là Bot (Headless)
    co.set_argument('--window-position=0,0')
    co.set_argument('--window-size=1000,1000')
    
    # Turnstile rất nhạy cảm với việc bị điều khiển, DrissionPage giúp ẩn điều này tốt
    page = ChromiumPage(co)
    page.get(f"http://{DOMAIN}:{PORT}/index_turnstile.html?k={SITE_KEY}")
    while True:
        # Turnstile lưu token vào phần tử có tên 'cf-turnstile-response'
        token = page.run_js('return document.getElementsByName("cf-turnstile-response")[0] ? document.getElementsByName("cf-turnstile-response")[0].value : "";')
        
        if token and token != "":
            print(f"\n[!] ĐÃ LẤY ĐƯỢC TURNSTILE TOKEN: \n{token}")
            
            # Lưu vào JSON
            save_to_json({
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "captcha_type": "turnstile",
                "domain": DOMAIN,
                "token": token
            })
            break
        time.sleep(1)
    page.quit()

if __name__ == "__main__":
    main()