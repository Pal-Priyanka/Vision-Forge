import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_endpoint(endpoint):
    url = f"{BASE_URL}{endpoint}"
    print(f"Testing {url}...")
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        print(f"✅ Success - Keys: {list(data.keys()) if isinstance(data, dict) else len(data) if isinstance(data, list) else 'Value'}")
        return data
    except Exception as e:
        print(f"❌ Failed: {e}")
        return None

def run_tests():
    # 1. Health check
    test_endpoint("/health")
    
    # 2. Main metrics
    test_endpoint("/evaluation/latest/metrics")
    
    # 3. PR Curve
    test_endpoint("/evaluation/latest/pr-curve?model=yolov5")
    
    # 4. Per-class metrics
    test_endpoint("/evaluation/latest/per-class?model=yolov5")
    
    # 5. Stability metrics
    test_endpoint("/evaluation/latest/stability?model=yolov5")

if __name__ == "__main__":
    run_tests()
