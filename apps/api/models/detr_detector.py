import torch
import numpy as np
import base64
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
from transformers import DetrImageProcessor, DetrForObjectDetection

class DETRDetector:
    def __init__(self, model_path_or_name="facebook/detr-resnet-50"):
        self.classes = ['aeroplane', 'bicycle', 'bird', 'boat', 'bottle', 'bus', 'car', 'cat', 'chair', 'cow', 'diningtable', 'dog', 'horse', 'motorbike', 'person', 'pottedplant', 'sheep', 'sofa', 'train', 'tvmonitor']
        self.colors = self._get_colors()
        self.model_path = model_path_or_name
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self.processor = None
        self.status = "Initializing"
        self.stage_details = {
            "encoder": "Awaiting",
            "weights": "Awaiting",
            "warmup": "Awaiting"
        }

    def load_model(self):
        """Asynchronous-friendly model loading."""
        try:
            print(f"📦 Loading DETR model: {self.model_path}")
            
            # Stage 1: Encoder/Processor
            self.stage_details["encoder"] = "Loading..."
            self.processor = DetrImageProcessor.from_pretrained(self.model_path)
            self.stage_details["encoder"] = "Ready"

            # Stage 2: Weights
            self.stage_details["weights"] = "Loading..."
            if self.model_path in ["facebook/detr-resnet-50"]:
                 self.model = DetrForObjectDetection.from_pretrained(self.model_path)
            else:
                 self.model = DetrForObjectDetection.from_pretrained("facebook/detr-resnet-50", 
                                                                   num_labels=len(self.classes),
                                                                   ignore_mismatched_sizes=True)
                 state_dict = torch.load(self.model_path, map_location=self.device)
                 self.model.load_state_dict(state_dict)
            
            self.model.to(self.device).eval()
            self.stage_details["weights"] = "Ready"

            # Stage 3: Warmup
            self.stage_details["warmup"] = "Running..."
            self._warmup()
            self.stage_details["warmup"] = "Ready"
            
            self.status = "Ready"
            print(f"✅ DETR model fully loaded on {self.device}.")
        except Exception as e:
            self.status = "Failed"
            print(f"❌ Failed to load DETR: {e}")
            raise e

    def _warmup(self):
        """Prime CUDA and internal tensors to prevent first-run lag."""
        dummy_img = Image.fromarray(np.zeros((640, 640, 3), dtype=np.uint8))
        inputs = self.processor(images=dummy_img, return_tensors="pt").to(self.device)
        with torch.no_grad():
            self.model(**inputs)

    def _get_colors(self):
        colors = {}
        for i, cls in enumerate(self.classes):
            np.random.seed(i)
            # Use same seed as YOLO for consistency
            colors[cls] = tuple(np.random.randint(0, 255, 3).tolist())
        return colors

    def detect(self, pil_image, conf_threshold=0.7):
        """Runs inference on a PIL.Image and returns a list of detections."""
        try:
            inputs = self.processor(images=pil_image, return_tensors="pt").to(self.device)
            with torch.no_grad():
                outputs = self.model(**inputs)

            # Post-process detections
            target_sizes = torch.tensor([pil_image.size[::-1]])
            results = self.processor.post_process_object_detection(outputs, target_sizes=target_sizes, threshold=conf_threshold)[0]

            detections = []
            for score, label, box in zip(results["scores"], results["labels"], results["boxes"]):
                box = [round(i, 2) for i in box.tolist()]
                # DETR labels are 1-indexed (0 is background in some versions, but HF usually handles it)
                # However, our VOC_CLASSES list is 0-indexed. 
                # DETR trained on COCO has 91 classes.
                # If using the pretrained one, we need to map COCO to VOC or just show the ID.
                # If using custom weights, label matches our list.
                
                cls_id = label.item()
                
                # COCO to VOC mapping (COCO class ID to VOC class Name)
                # Standard DETR is trained on COCO (91 labels, 0 is often background or N/A)
                coco_to_voc = {
                    1: 'person', 2: 'bicycle', 3: 'car', 4: 'motorbike', 5: 'aeroplane',
                    6: 'bus', 7: 'train', 9: 'boat', 16: 'bird', 17: 'cat', 18: 'dog',
                    19: 'horse', 20: 'sheep', 21: 'cow', 44: 'bottle', 62: 'chair',
                    63: 'sofa', 64: 'pottedplant', 67: 'diningtable', 72: 'tvmonitor'
                }
                
                if self.model_path == "facebook/detr-resnet-50":
                    cls_name = coco_to_voc.get(cls_id, f"Object ({cls_id})")
                else:
                    cls_name = self.classes[cls_id] if cls_id < len(self.classes) else f"label_{cls_id}"
                
                detections.append({
                    "class": cls_name,
                    "confidence": float(score),
                    "bbox": box
                })
            return detections
        except Exception as e:
            print(f"Error in DETR detection: {e}")
            return []

    def draw_boxes(self, pil_image, detections):
        """Draws bounding boxes and labels on an image and returns base64 PNG."""
        draw = ImageDraw.Draw(pil_image)
        try:
            font = ImageFont.truetype("arial.ttf", 20)
        except:
            font = ImageFont.load_default()

        for det in detections:
            cls = det["class"]
            conf = det["confidence"]
            bbox = det["bbox"]
            color = self.colors.get(cls, (139, 92, 246)) # Default purple

            draw.rectangle(bbox, outline=color, width=4)
            label = f"{cls} {conf:.2f}"
            text_size = draw.textbbox((bbox[0], bbox[1]), label, font=font)
            draw.rectangle([text_size[0], text_size[1], text_size[2], text_size[3]], fill=color)
            draw.text((bbox[0], bbox[1]), label, fill=(255, 255, 255), font=font)

        buffered = BytesIO()
        pil_image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{img_str}"
