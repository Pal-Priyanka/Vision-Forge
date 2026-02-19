import torch
import numpy as np
import cv2
import base64
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
from ultralytics import YOLO

class YOLOv5Detector:
    def __init__(self, model_path):
        self.classes = ['aeroplane', 'bicycle', 'bird', 'boat', 'bottle', 'bus', 'car', 'cat', 'chair', 'cow', 'diningtable', 'dog', 'horse', 'motorbike', 'person', 'pottedplant', 'sheep', 'sofa', 'train', 'tvmonitor']
        # Generate distinct colors for each class
        self.colors = self._get_colors()
        print(f"Loading YOLOv5 model from {model_path}...")
        self.model = YOLO(model_path)
        print("YOLOv5 model loaded successfully.")

    def _get_colors(self):
        # Deterministic colors based on class names
        colors = {}
        for i, cls in enumerate(self.classes):
            np.random.seed(i)
            colors[cls] = tuple(np.random.randint(0, 255, 3).tolist())
        return colors

    def detect(self, pil_image, conf_threshold=0.25, iou_threshold=0.45):
        """Runs inference on a PIL.Image and returns a list of detections."""
        try:
            # Convert PIL to numpy for YOLO
            results = self.model.predict(
                source=pil_image,
                conf=conf_threshold,
                iou=iou_threshold,
                verbose=False
            )
            
            detections = []
            for r in results:
                boxes = r.boxes
                for box in boxes:
                    cls_id = int(box.cls[0])
                    
                    # COCO to VOC mapping for standard YOLOv5 models
                    coco_to_voc = {
                        0: 'person', 1: 'bicycle', 2: 'car', 3: 'motorbike', 4: 'aeroplane',
                        5: 'bus', 6: 'train', 8: 'boat', 14: 'bird', 15: 'cat', 16: 'dog',
                        17: 'horse', 18: 'sheep', 19: 'cow', 39: 'bottle', 56: 'chair',
                        57: 'sofa', 58: 'pottedplant', 60: 'diningtable', 62: 'tvmonitor'
                    }
                    
                    # Check if model is standard COCO or our VOC
                    # If model has 80 classes, it's likely COCO
                    if self.model.names and len(self.model.names) > 20:
                        cls_name = coco_to_voc.get(cls_id, self.model.names[cls_id])
                    else:
                        cls_name = self.classes[cls_id] if cls_id < len(self.classes) else str(cls_id)
                        
                    conf = float(box.conf[0])
                    # x1, y1, x2, y2 coordinates
                    coords = box.xyxy[0].tolist()
                    
                    detections.append({
                        "class": cls_name,
                        "confidence": conf,
                        "bbox": coords
                    })
            return detections
        except Exception as e:
            print(f"Error in YOLOv5 detection: {e}")
            return []

    def draw_boxes(self, pil_image, detections):
        """Draws bounding boxes and labels on an image and returns base64 PNG."""
        draw = ImageDraw.Draw(pil_image)
        # Try to load a font, fallback to default
        try:
            # Common paths for Windows/Linux
            font = ImageFont.truetype("arial.ttf", 20)
        except:
            font = ImageFont.load_default()

        for det in detections:
            cls = det["class"]
            conf = det["confidence"]
            bbox = det["bbox"]
            color = self.colors.get(cls, (255, 0, 0))

            # Draw rectangle
            draw.rectangle(bbox, outline=color, width=4)
            
            # Draw label
            label = f"{cls} {conf:.2f}"
            text_size = draw.textbbox((bbox[0], bbox[1]), label, font=font)
            draw.rectangle([text_size[0], text_size[1], text_size[2], text_size[3]], fill=color)
            draw.text((bbox[0], bbox[1]), label, fill=(255, 255, 255), font=font)

        buffered = BytesIO()
        pil_image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{img_str}"
