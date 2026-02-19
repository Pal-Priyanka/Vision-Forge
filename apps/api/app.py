import os
import time
import base64
from io import BytesIO
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS
import torch

from models.yolov5_detector import YOLOv5Detector
from models.detr_detector import DETRDetector

app = Flask(__name__)
CORS(app)

# ── MODEL LOADING ──
PROJECT_ROOT = r"C:\Users\palan\OneDrive\Desktop\DL_Transformer_project"
YOLO_PATH = os.path.join(PROJECT_ROOT, "yolov5su.pt")
# If a custom DETR was saved, use it, otherwise use pretrained
DETR_PATH = "facebook/detr-resnet-50" 

print("📦 Initializing Detectors...")
yolo_detector = None
detr_detector = None

try:
    yolo_detector = YOLOv5Detector(YOLO_PATH)
except Exception as e:
    print(f"⚠️ Failed to load YOLOv5: {e}")

try:
    detr_detector = DETRDetector(DETR_PATH)
except Exception as e:
    print(f"⚠️ Failed to load DETR: {e}")

# ── ENDPOINTS ──

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy",
        "yolov5_loaded": yolo_detector is not None,
        "detr_loaded": detr_detector is not None,
        "gpu_available": torch.cuda.is_available(),
        "device": str(torch.device("cuda" if torch.cuda.is_available() else "cpu"))
    })

@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    # Hardcoded metrics from our evaluation in the notebook
    return jsonify({
        "yolov5": {
            "map_50": 0.82,
            "map_75": 0.55,
            "avg_inference_ms": 8.5,
            "precision": 0.85,
            "recall": 0.78,
            "params_millions": 7.2,
            "fps": 117.6
        },
        "detr": {
            "map_50": 0.79,
            "map_75": 0.52,
            "avg_inference_ms": 25.4,
            "precision": 0.82,
            "recall": 0.75,
            "params_millions": 41.5,
            "fps": 39.4
        }
    })

@app.route('/api/detect', methods=['POST'])
def detect():
    data = request.json
    if not data or 'image' not in data:
        return jsonify({"error": "No image data provided"}), 400

    model_type = data.get('model', 'both') # 'yolov5', 'detr', or 'both'
    conf_threshold = float(data.get('conf_threshold', 0.5))
    iou_threshold = float(data.get('iou_threshold', 0.45))

    # Decode base64 image
    try:
        header, encoded = data['image'].split(",", 1) if "," in data['image'] else (None, data['image'])
        image_data = base64.b64decode(encoded)
        image = Image.open(BytesIO(image_data)).convert("RGB")
    except Exception as e:
        return jsonify({"error": f"Invalid image data: {e}"}), 400

    response = {}

    # Run YOLOv5
    if model_type in ['yolov5', 'both'] and yolo_detector:
        start_time = time.time()
        # Create a copy for drawing
        img_yolo = image.copy()
        detections = yolo_detector.detect(image, conf_threshold, iou_threshold)
        image_with_boxes = yolo_detector.draw_boxes(img_yolo, detections)
        inf_time = (time.time() - start_time) * 1000
        
        response['yolov5'] = {
            "detections": detections,
            "inference_time_ms": float(round(float(inf_time), 2)),
            "num_objects": len(detections),
            "avg_confidence": sum(d['confidence'] for d in detections)/len(detections) if detections else 0,
            "image_with_boxes": image_with_boxes
        }

    # Run DETR
    if model_type in ['detr', 'both'] and detr_detector:
        start_time = time.time()
        img_detr = image.copy()
        detections = detr_detector.detect(image, conf_threshold)
        image_with_boxes = detr_detector.draw_boxes(img_detr, detections)
        inf_time = (time.time() - start_time) * 1000
        
        response['detr'] = {
            "detections": detections,
            "inference_time_ms": float(round(float(inf_time), 2)),
            "num_objects": len(detections),
            "avg_confidence": sum(d['confidence'] for d in detections)/len(detections) if detections else 0,
            "image_with_boxes": image_with_boxes
        }

    return jsonify(response)

if __name__ == '__main__':
    # Run on 5000
    app.run(host='0.0.0.0', port=5000, debug=False)
