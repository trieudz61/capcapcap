from flask import Flask, render_template_string, request, jsonify
import requests
import re
import base64
import time
import json
import os
import threading

app = Flask(__name__)

# --- LOGIC LẤY RECAPTCHA TOKEN ---
def fetch_recaptcha_internal(site_key, domain):
    try:
        # Tự động lấy v mới nhất
        api_js = requests.get("https://www.google.com/recaptcha/api.js").text
        v = re.search(r'releases/(.*?)/', api_js).group(1)
        
        # Format domain
        clean_domain = domain.replace("https://", "").replace("http://", "").split('/')[0]
        co_b64 = base64.b64encode(f"https://{clean_domain}:443".encode()).decode().strip('=') + '.'
        
        url = f"https://www.google.com/recaptcha/api2/anchor?k={site_key}&co={co_b64}&hl=vi&v={v}&size=normal&cb=tc"
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
        
        res = requests.get(url, headers=headers)
        match = re.search(r'id="recaptcha-token" value="(.*?)"', res.text)
        return match.group(1) if match else None
    except Exception as e:
        print(f"Error: {e}")
        return None

# --- HTML TEMPLATE (PREMIUM UI) ---
HTML_UI = """
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Antigravity Captcha WebApp</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #4f46e5;
            --bg: #0f172a;
            --card: #1e293b;
            --text: #f8fafc;
            --accent: #38bdf8;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Outfit', sans-serif; }
        body { background: var(--bg); color: var(--text); display: flex; align-items: center; justify-content: center; min-height: 100vh; overflow-x: hidden; }
        .container { background: var(--card); border: 1px solid rgba(255,255,255,0.1); width: 100%; max-width: 600px; padding: 2.5rem; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); backdrop-filter: blur(10px); }
        h1 { font-size: 2rem; margin-bottom: 0.5rem; font-weight: 600; background: linear-gradient(to right, #818cf8, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        p.subtitle { color: #94a3b8; font-size: 0.9rem; margin-bottom: 2rem; }
        .input-group { margin-bottom: 1.5rem; }
        label { display: block; margin-bottom: 0.5rem; font-size: 0.9rem; color: #cbd5e1; }
        input { width: 100%; padding: 0.8rem 1rem; border-radius: 10px; border: 1px solid #334155; background: #0f172a; color: white; outline: none; transition: 0.3s; }
        input:focus { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2); }
        button { width: 100%; padding: 1rem; background: var(--primary); color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; transition: 0.3s; margin-top: 1rem; }
        button:hover { background: #4338ca; transform: translateY(-2px); }
        button:disabled { opacity: 0.6; cursor: not-allowed; }
        .result-box { margin-top: 2rem; background: #0f172a; border-radius: 12px; padding: 1rem; border: 1px solid #334155; display: none; }
        .result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
        .result-header span { font-size: 0.8rem; color: #94a3b8; font-weight: 600; }
        .copy-btn { width: auto; font-size: 0.7rem; padding: 0.4rem 0.8rem; margin: 0; background: #334155; }
        textarea { width: 100%; background: transparent; border: none; color: var(--accent); font-family: 'Consolas', monospace; font-size: 0.85rem; height: 150px; resize: none; outline: none; }
        .loader { width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid var(--primary); border-radius: 50%; animation: spin 1s linear infinite; display: inline-block; vertical-align: middle; margin-right: 10px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .loading-overlay { display: none; align-items: center; justify-content: center; margin-top: 1rem; font-size: 0.9rem; color: #94a3b8; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Captcha Token Fetcher</h1>
        <p class="subtitle">Lấy Internal Token reCAPTCHA v2 chỉ bằng 1 Click</p>
        
        <div class="input-group">
            <label>Site Key</label>
            <input type="text" id="siteKey" value="6LceNg8jAAAAABkt_mPrc03HfJJNUSy3LvRO6r-P" placeholder="Nhập Site Key">
        </div>
        
        <div class="input-group">
            <label>Domain</label>
            <input type="text" id="domain" value="https://nopecha.com" placeholder="Nhập Domain (ví dụ: https://wechoice.vn)">
        </div>
        
        <button id="getBtn" onclick="getToken()">LẤY TOKEN NGAY</button>
        
        <div class="loading-overlay" id="loader">
            <div class="loader"></div> Đang yêu cầu dữ liệu từ Google...
        </div>

        <div class="result-box" id="resultBox">
            <div class="result-header">
                <span>RECAPTCHA INTERNAL TOKEN</span>
                <button class="copy-btn" onclick="copyResult()">COPY</button>
            </div>
            <textarea id="resultText" readonly></textarea>
        </div>
    </div>

    <script>
        async function getToken() {
            const getBtn = document.getElementById('getBtn');
            const resultBox = document.getElementById('resultBox');
            const resultText = document.getElementById('resultText');
            const loader = document.getElementById('loader');
            
            const siteKey = document.getElementById('siteKey').value.trim();
            const domain = document.getElementById('domain').value.trim();
            
            if(!siteKey || !domain) {
                alert("Vui lòng điền đủ thông tin!");
                return;
            }

            getBtn.disabled = true;
            loader.style.display = 'flex';
            resultBox.style.display = 'none';

            try {
                const response = await fetch('/get_token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ site_key: siteKey, domain: domain })
                });
                
                const data = await response.json();
                
                if(data.success) {
                    resultText.value = data.token;
                    resultBox.style.display = 'block';
                } else {
                    alert("Lỗi: " + data.message);
                }
            } catch (e) {
                alert("Lỗi kết nối Server!");
            } finally {
                getBtn.disabled = false;
                loader.style.display = 'none';
            }
        }

        function copyResult() {
            const copyText = document.getElementById("resultText");
            copyText.select();
            document.execCommand("copy");
            const btn = document.querySelector('.copy-btn');
            btn.innerText = "COPIED!";
            setTimeout(() => { btn.innerText = "COPY"; }, 2000);
        }
    </script>
</body>
</html>
"""

@app.route('/')
def index():
    return render_template_string(HTML_UI)

@app.route('/get_token', methods=['POST'])
def get_token():
    data = request.json
    sk = data.get('site_key')
    dom = data.get('domain')
    
    token = fetch_recaptcha_internal(sk, dom)
    
    if token:
        return jsonify({"success": True, "token": token})
    else:
        return jsonify({"success": False, "message": "Không lấy được token. Kiểm tra lại tham số."})

if __name__ == '__main__':
    print("--- APP WEB CAPTCHA ĐANG CHẠY ---")
    print("Hãy truy cập: http://127.0.0.1:5000")
    app.run(port=5000)
