import requests

try:
    url = "http://127.0.0.1:5050/admin/users"
    headers = {
        "adminKey": "super-admin-secret-key",
        "adminkey": "super-admin-secret-key" # Send both just in case
    }
    
    print(f"Testing {url}...")
    response = requests.get(url, headers=headers, timeout=5)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
    
except Exception as e:
    print(f"Error: {e}")
