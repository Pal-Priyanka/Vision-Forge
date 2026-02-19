import requests
import json

url = "http://localhost:8000/api/ai/chat"
data = {"message": "Tell me about YOLOv5 vs DETR comparison on this platform."}

try:
    response = requests.post(url, json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")
