import requests
import time
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

# --- CONFIGURATION ---
API_BASE_URL = "http://localhost:5050"  # Thay đổi nếu server chạy ở port khác
API_KEY = "cap_live_00d18e6177b8439abd5d" # Thay API Key của bạn vào đây
SITE_KEY = "6Lcy6lQsAAAAAOaJyWL_M4hptj4sqWyVzvBmSUio"
PAGE_URL = "https://wechoice.vn/"
TASK_TYPE = "ReCaptchaV2TaskProxyless"

THREADS = 50  # Số luồng chạy song song
TOTAL_TASKS = 10000000 # Tổng số task muốn test
LOG_FILE = "captcha_test_results.txt"

# Lock để ghi file an toàn giữa các luồng
file_lock = threading.Lock()

def log_result(message):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    formatted_msg = f"[{timestamp}] {message}"
    print(formatted_msg)
    with file_lock:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(formatted_msg + "\n")

def solve_one_captcha(index):
    try:
        log_result(f"Task {index}: Đang khởi tạo...")
        
        # 1. Create Task
        payload = {
            "clientKey": API_KEY,
            "task": {
                "type": TASK_TYPE,
                "websiteURL": PAGE_URL,
                "websiteKey": SITE_KEY
            }
        }
        
        response = requests.post(f"{API_BASE_URL}/captcha/createTask", json=payload, timeout=10)
        data = response.json()
        
        if data.get("errorId") != 0:
            log_result(f"Task {index}: Lỗi tạo task - {data.get('errorCode')} - {data.get('errorDescription', '')}")
            return False
        
        task_id = data.get("taskId")
        log_result(f"Task {index}: Đã tạo Task ID: {task_id}. Đang chờ giải...")
        
        # 2. Poll for Result
        start_time = time.time()
        while True:
            if time.time() - start_time > 120: # Timeout 120s
                log_result(f"Task {index}: Timeout sau 120 giây.")
                return False
                
            res_response = requests.post(f"{API_BASE_URL}/captcha/getTaskResult", json={"taskId": task_id}, timeout=10)
            res_data = res_response.json()
            
            status = res_data.get("status")
            
            if status == "ready":
                token = res_data.get("solution", {}).get("gRecaptchaResponse")
                elapsed = round(time.time() - start_time, 2)
                log_result(f"Task {index}: THÀNH CÔNG sau {elapsed}s! Token: {token[:50]}...")
                return True
            elif status == "failed":
                log_result(f"Task {index}: THẤT BẠI - {res_data.get('errorCode')}")
                return False
            
            # Đợi 2-3s rồi check lại
            time.sleep(3)
            
    except Exception as e:
        log_result(f"Task {index}: Lỗi hệ thống: {str(e)}")
        return False

def main():
    log_result("=== BẮT ĐẦU TEST SERVER CAPTCHA ===")
    log_result(f"Số luồng: {THREADS} | Tổng task: {TOTAL_TASKS}")
    
    with ThreadPoolExecutor(max_workers=THREADS) as executor:
        # Chạy các task
        results = list(executor.map(solve_one_captcha, range(1, TOTAL_TASKS + 1)))
        
    success_count = sum(1 for r in results if r)
    log_result(f"=== KẾT THÚC TEST ===")
    log_result(f"Tổng kết: Thành công {success_count}/{TOTAL_TASKS}")

if __name__ == "__main__":
    # Đảm bảo file log trống trước khi chạy mới (optional)
    # with open(LOG_FILE, "w") as f: f.write("") 
    main()
