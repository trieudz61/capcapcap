from flask import Flask, request, jsonify, render_template_string
import requests
import re
import base64
import uuid
import threading
import time
import os

app = Flask(__name__)

# --- STORAGE ---
tasks = {}
tasks_lock = threading.Lock()

# --- CONFIG ---
PORT_WEB = 5000

# --- HELPERS ---
def fetch_recaptcha_internal(site_key, domain):
    try:
        # Tự động lấy v mới nhất từ Google
        api_js = requests.get("https://www.google.com/recaptcha/api.js", timeout=5).text
        v = re.search(r'releases/(.*?)/', api_js).group(1)
        
        # Chuẩn hóa domain để mã hóa base64
        clean_domain = domain.replace("https://", "").replace("http://", "").split('/')[0]
        co_b64 = base64.b64encode(f"https://{clean_domain}:443".encode()).decode().strip('=') + '.'
        
        url = f"https://www.google.com/recaptcha/api2/anchor?k={site_key}&co={co_b64}&hl=vi&v={v}&size=normal&cb=tc"
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
        
        res = requests.get(url, headers=headers, timeout=10)
        match = re.search(r'id="recaptcha-token" value="(.*?)"', res.text)
        return match.group(1) if match else None
    except Exception as e:
        print(f"ReCaptcha Internal Error: {e}")
        return None

# --- BACKGROUND WORKER ---
def solve_task_worker(task_id, task_type, site_key, website_url):
    domain = website_url.replace("https://", "").replace("http://", "").split('/')[0]
    
    print(f"[*] Đang xử lý ReCaptcha cho domain: {domain}")
    result = fetch_recaptcha_internal(site_key, domain)

    with tasks_lock:
        if result:
            tasks[task_id]["status"] = "ready"
            tasks[task_id]["solution"] = {
                "gRecaptchaResponse": result, # Trả về Internal Token (recaptcha-token)
                "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            print(f"[v] Task {task_id} HOÀN THÀNH.")
        else:
            tasks[task_id]["status"] = "failed"
            print(f"[x] Task {task_id} THẤT BẠI.")

# --- API ENDPOINTS ---

@app.route('/createTask', methods=['POST'])
def create_task():
    data = request.json
    if not data or "task" not in data:
        return jsonify({"errorId": 1, "errorCode": "ERROR_INVALID_TASK_DATA"}), 400
    
    task_data = data["task"]
    task_type = task_data.get("type")
    website_url = task_data.get("websiteURL")
    website_key = task_data.get("websiteKey")

    if not all([task_type, website_url, website_key]):
        return jsonify({"errorId": 1, "errorCode": "ERROR_MISSING_PARAMETERS"}), 400

    task_id = str(uuid.uuid4())
    with tasks_lock:
        tasks[task_id] = {
            "status": "processing",
            "type": task_type,
            "created_at": time.time()
        }

    # Chạy worker trong luồng riêng để không chặn API
    threading.Thread(target=solve_task_worker, args=(task_id, task_type, website_key, website_url)).start()

    return jsonify({
        "errorId": 0,
        "taskId": task_id
    })

@app.route('/getTaskResult', methods=['POST'])
def get_task_result():
    data = request.json
    task_id = data.get("taskId")
    
    if not task_id:
        return jsonify({"errorId": 1, "errorCode": "ERROR_EMPTY_TASK_ID"}), 400

    with tasks_lock:
        task = tasks.get(task_id)
        if not task:
            return jsonify({"errorId": 1, "errorCode": "ERROR_TASK_NOT_FOUND"}), 404
        
        response = {
            "errorId": 0,
            "status": task["status"]
        }
        if task["status"] == "ready":
            response["solution"] = task["solution"]
            
        return jsonify(response)

# --- WEB UI ---
@app.route('/')
def index():
    return render_template_string("""
<!DOCTYPE html>
<html>
<head>
    <title>ReCaptcha Solver API</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; display: flex; justify-content: center; }
        .card { background: #1e293b; padding: 30px; border-radius: 16px; border: 1px solid #334155; width: 500px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        h1 { color: #38bdf8; margin-bottom: 20px; text-align: center; }
        code { background: #000; padding: 3px 6px; color: #fbbf24; border-radius: 4px; font-size: 0.9rem; }
        .info { margin-top: 20px; line-height: 1.6; }
        .status-tag { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; background: #10b981; color: white; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="card">
        <h1>ReCaptcha Solver API</h1>
        <div class="info">
            <p>Server đang chạy tại: <code>http://127.0.0.1:5000</code></p>
            <p>Phương thức hỗ trợ: <code>ReCaptchaV2TaskProxyless</code></p>
            <div class="status-tag">Hệ thống đang hoạt động</div>
        </div>
    </div>
</body>
</html>
""")

if __name__ == '__main__':
    print(f"--- RECAPTCHA SOLVER SERVER ĐANG CHẠY ---")
    print(f"API URL: http://127.0.0.1:{PORT_WEB}")
    app.run(port=PORT_WEB)
