import requests
import re
import base64
import json
import time
import os

# --- CẤU HÌNH ---
SITE_KEY = "6LceNg8jAAAAABkt_mPrc03HfJJNUSy3LvRO6r-P"
DOMAIN = "https://nopecha.com"

def get_latest_recaptcha_v():
    try:
        api_js_url = "https://www.google.com/recaptcha/api.js"
        res = requests.get(api_js_url)
        v_match = re.search(r'releases/(.*?)/', res.text)
        if v_match:
            return v_match.group(1)
    except:
        pass
    return "7lBY_Ws6HF63jGwdMt3ysk4c"

def get_internal_token_requests(site_key, domain):
    print(f"--- Đang lấy Internal Token cho {domain} ---")
    raw_co = f"{domain}:443"
    co_b64 = base64.b64encode(raw_co.encode()).decode().strip('=') + '.'
    v = get_latest_recaptcha_v()
    url = f"https://www.google.com/recaptcha/api2/anchor?k={site_key}&co={co_b64}&hl=vi&v={v}&size=normal&cb=tc"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    }

    try:
        response = requests.get(url, headers=headers)
        match = re.search(r'id="recaptcha-token" value="(.*?)"', response.text)
        
        if match:
            token = match.group(1)
            print("[v] Lấy token THÀNH CÔNG qua Requests.")
            
            # Lưu ra JSON
            data = {
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "method": "requests_pure",
                "site_key": site_key,
                "internal_token": token
            }
            
            file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "captcha_data_requests.json")
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=4)
            
            print(f"[v] Đã lưu vào: {file_path}")
            return token
        else:
            print("[x] Không tìm thấy token. Google có thể đã thay đổi cấu trúc.")
            return None
            
    except Exception as e:
        print(f"[x] Lỗi thực thi: {e}")
        return None

if __name__ == "__main__":
    token = get_internal_token_requests(SITE_KEY, DOMAIN)
    if token:
        print(f"\nTOKEN NHẬN ĐƯỢC:\n{token}")
