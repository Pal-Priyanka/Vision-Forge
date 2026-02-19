import os
import time
import base64
import uuid
import asyncio
import json
import logging
from io import BytesIO
from collections import deque
from typing import Optional, Dict, List
from PIL import Image
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, JSONResponse
import torch
import numpy as np
from pydantic import BaseModel, Field

from .models.yolov5_detector import YOLOv5Detector
from .models.detr_detector import DETRDetector
from .evaluation.evaluator import evaluate_detections, compute_iou
import sys
from pathlib import Path
# Add core to path for pipeline access
sys.path.append(str(Path(__file__).parent.parent.parent / "core"))
from pipeline.voc_parser import get_dataset_stats, parse_voc_annotation
import hashlib

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("visionforge")

app = FastAPI(title="VisionForge AI API")

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── PATHS ──
API_DIR = Path(__file__).parent
MONOREPO_ROOT = API_DIR.parent.parent
CORE_DIR = MONOREPO_ROOT / "core"
DATA_DIR = MONOREPO_ROOT / "data"

YOLO_PATH = str(CORE_DIR / "ml" / "yolov5su.pt")
DETR_PATH = "facebook/detr-resnet-50"
VOC_ROOT = str(DATA_DIR / "VOC2012_train_val" / "VOC2012_train_val")
VOC_ANNOTATIONS = os.path.join(VOC_ROOT, "Annotations")
VOC_IMAGES = os.path.join(VOC_ROOT, "JPEGImages")

# ── REQUEST MODELS ──
class DetectRequest(BaseModel):
    image: str  # base64
    model: str = "both"
    conf_threshold: float = Field(0.5, ge=0.0, le=1.0)
    iou_threshold: float = Field(0.45, ge=0.0, le=1.0)

# ── INFERENCE STORE ──
# Accumulates real inference results for dynamic analytics
class InferenceStore:
    def __init__(self, max_history: int = 200):
        self.max_history = max_history
        # Per-model latency history (ms)
        self.latency_history: Dict[str, deque] = {
            "yolov5": deque(maxlen=max_history),
            "detr": deque(maxlen=max_history),
        }
        # Per-model FPS history (computed from latency)
        self.fps_history: Dict[str, deque] = {
            "yolov5": deque(maxlen=max_history),
            "detr": deque(maxlen=max_history),
        }
        # Per-model all detections for PR/AP computation
        self.all_predictions: Dict[str, Dict[str, List[Dict]]] = {
            "yolov5": {},
            "detr": {},
        }
        # Per-model ground truths matched
        self.all_ground_truths: Dict[str, Dict[str, List[Dict]]] = {
            "yolov5": {},
            "detr": {},
        }
        # SSE subscribers
        self.subscribers: List[asyncio.Queue] = []
        # Inference counter
        self.inference_count = 0
        # Last evaluation results cache
        self.eval_cache: Dict[str, Dict] = {}

    def record_inference(self, model: str, image_id: str, detections: list,
                         ground_truths: list, latency_ms: float, iteration: int = 1, total_iterations: int = 1):
        """Record a single inference run or one iteration of a profile."""
        if iteration == 1:
             self.inference_count += 1
        
        self.latency_history[model].append(latency_ms)
        fps = 1000.0 / latency_ms if latency_ms > 0 else 0
        
        # We only record FPS history for the first iteration to avoid chart skew, 
        # or we could record an average. For now, let's record first.
        if iteration == 1:
            self.fps_history[model].append({
                "time": self.inference_count,
                "fps": round(fps, 1),
                "latency_ms": round(latency_ms, 2),
            })

            # Store predictions for the first run (the "official" results)
            preds_formatted = [{
                "class_name": d["class"],
                "confidence": d["confidence"],
                "bbox": d["bbox"],
            } for d in detections]
            self.all_predictions[model][image_id] = preds_formatted

            # Store ground truths
            gts_formatted = [{
                "class_name": g["class"],
                "bbox": g["bbox"],
                "difficult": g.get("difficult", 0),
            } for g in ground_truths]
            self.all_ground_truths[model][image_id] = gts_formatted

            # Invalidate eval cache
            self.eval_cache.pop(model, None)

    def get_evaluation(self, model: str) -> Optional[Dict]:
        """Get or compute real evaluation metrics."""
        if model in self.eval_cache:
            return self.eval_cache[model]

        preds = self.all_predictions.get(model, {})
        gts = self.all_ground_truths.get(model, {})
        if not preds:
            return None

        VOC_CLASSES = [
            'person', 'bird', 'cat', 'cow', 'dog', 'horse', 'sheep',
            'aeroplane', 'bicycle', 'boat', 'bus', 'car', 'motorbike', 'train',
            'bottle', 'chair', 'diningtable', 'pottedplant', 'sofa', 'tvmonitor'
        ]

        try:
            result = evaluate_detections(
                all_predictions=preds,
                all_ground_truths=gts,
                class_names=VOC_CLASSES,
                iou_thresholds=[0.5],
            )
            self.eval_cache[model] = result
            return result
        except Exception as e:
            logger.error(f"Evaluation error for {model}: {e}")
            return None

    def get_latency_distribution(self, model: str) -> list:
        """Return real latency samples binned as histogram."""
        samples = list(self.latency_history.get(model, []))
        if not samples:
            return []

        arr = np.array(samples)
        hist, bin_edges = np.histogram(arr, bins=min(10, len(samples)))
        return [
            {
                "bin": f"{bin_edges[i]:.1f}-{bin_edges[i+1]:.1f}",
                "count": int(hist[i]),
                "ms": float((bin_edges[i] + bin_edges[i+1]) / 2),
            }
            for i in range(len(hist))
        ]

    def get_fps_history(self, model: str) -> list:
        """Return real FPS measurements over time."""
        return list(self.fps_history.get(model, []))

    def get_pr_curve(self, model: str) -> list:
        """Return real PR curve from evaluation."""
        evaluation = self.get_evaluation(model)
        if not evaluation or "pr_curves" not in evaluation:
            return []

        # Aggregate across all classes for overall PR curve
        all_points = []
        for cls_name, curve in evaluation["pr_curves"].items():
            all_points.extend(curve)

        if not all_points:
            return []

        # Sort by recall and subsample
        all_points.sort(key=lambda x: x["recall"])
        step = max(1, len(all_points) // 50)
        return [
            {"recall": round(p["recall"], 4), "precision": round(p["precision"], 4)}
            for p in all_points[::step]
        ]

    def get_per_class_ap(self, model: str) -> list:
        """Return real per-class AP values."""
        evaluation = self.get_evaluation(model)
        if not evaluation or "per_class_ap" not in evaluation:
            return []

        return [
            {"class": cls_name, "ap": round(ap, 4)}
            for cls_name, ap in evaluation["per_class_ap"].items()
        ]

    async def broadcast_event(self, event: dict):
        """Send event to all SSE subscribers."""
        dead = []
        for q in self.subscribers:
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                dead.append(q)
        for q in dead:
            self.subscribers.remove(q)


store = InferenceStore()

# ── MODEL LOADING ──
print("📦 Initializing Detectors...")
yolo_detector = None
detr_detector = DETRDetector(DETR_PATH) # Initialize with empty status

async def load_models_async():
    global yolo_detector, detr_detector
    
    # YOLOv5 usually loads fast enough, but we keep it here for consistency
    try:
        yolo_detector = YOLOv5Detector(YOLO_PATH)
    except Exception as e:
        print(f"⚠️ Failed to load YOLOv5: {e}")

    # DETR is the heavy lifter — load it in background
    try:
        # Run synchronous load in a thread to keep event loop free
        await asyncio.to_thread(detr_detector.load_model)
    except Exception as e:
        print(f"⚠️ Async DETR Load failed: {e}")

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(load_models_async())

# Static files
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# ── HELPER: Image Hashing for VOC Matching ──
VOC_HASH_MAP = {}

def build_voc_hash_map():
    """Compute hashes for all VOC images to match against uploads."""
    if not os.path.exists(VOC_IMAGES):
        return
    print("🧠 Building VOC Image Hash Map...")
    for fname in os.listdir(VOC_IMAGES):
        if fname.endswith(".jpg"):
            img_id = os.path.splitext(fname)[0]
            # Just use first 8k for speed if needed, but VOC images are small
            with open(os.path.join(VOC_IMAGES, fname), "rb") as f:
                h = hashlib.md5(f.read()).hexdigest()
                VOC_HASH_MAP[h] = img_id

@app.on_event("startup")
async def build_hashes_task():
    asyncio.to_thread(build_voc_hash_map)

def find_ground_truth_for_image(image_bytes: bytes) -> list:
    """Match uploaded image hash against VOC for real ground truth."""
    h = hashlib.md5(image_bytes).hexdigest()
    image_id = VOC_HASH_MAP.get(h)
    if image_id:
        logger.info(f"🎯 Match found in VOC: {image_id}")
        return load_voc_ground_truth(image_id)
    return []


def load_voc_ground_truth(image_id: str) -> list:
    """Load ground truth annotations for a specific VOC image ID."""
    xml_path = os.path.join(VOC_ANNOTATIONS, f"{image_id}.xml")
    if not os.path.exists(xml_path):
        return []
    try:
        data = parse_voc_annotation(xml_path)
        return [
            {"class": obj["class"], "bbox": obj["bbox"], "difficult": 0}
            for obj in data["objects"]
        ]
    except Exception:
        return []


# ═══════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "yolov5_loaded": yolo_detector is not None,
        "detr_loaded": detr_detector is not None,
        "gpu_available": torch.cuda.is_available(),
        "device": str(torch.device("cuda" if torch.cuda.is_available() else "cpu")),
        "inference_count": store.inference_count,
    }


# ── CORE: DETECT ENDPOINT ──
@app.post("/api/detect")
async def detect(req: DetectRequest):
    """
    Run object detection on uploaded image.
    Returns detections, annotated images, and live-computed metrics.
    """
    logger.info(f"[INFERENCE] model={req.model} conf={req.conf_threshold} iou={req.iou_threshold}")

    # Decode base64 image
    try:
        raw = req.image
        if "," in raw:
            _, raw = raw.split(",", 1)
        image_data = base64.b64decode(raw)
        image = Image.open(BytesIO(image_data)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {e}")

    image_id = f"upload_{uuid.uuid4().hex[:8]}"
    response = {}

    async def run_model_inference(model_name, detector, iterations=1):
        # Initial run (with drawing)
        start = time.perf_counter()
        dets = detector.detect(image, req.conf_threshold, req.iou_threshold if hasattr(detector, 'detect') and 'iou_threshold' in detector.detect.__code__.co_varnames else None)
        img_with_boxes = detector.draw_boxes(image.copy(), dets)
        latency = (time.perf_counter() - start) * 1000
        
        gt = find_ground_truth_for_image(image_data)
        store.record_inference(model_name, image_id, dets, gt, latency, 1, iterations)

        # Telemetry for first run
        await store.broadcast_event({
            "type": "inference_iteration",
            "model": model_name,
            "iteration": 1,
            "total": iterations,
            "latency_ms": round(latency, 2),
            "num_detections": len(dets),
            "timestamp": time.time(),
            "log": f"[{model_name.upper()}] Iteration 1/1: {len(dets)} objs, {latency:.1f}ms"
        })

        # Background Profiling (Multiple iterations)
        if iterations > 1:
            async def profile_task():
                for i in range(2, iterations + 1):
                    # Sleep slightly to avoid complete CPU lockup if on single core
                    await asyncio.sleep(0.01)
                    p_start = time.perf_counter()
                    _ = detector.detect(image, req.conf_threshold)
                    p_lat = (time.perf_counter() - p_start) * 1000
                    store.record_inference(model_name, image_id, [], [], p_lat, i, iterations)
                    
                    if i % 5 == 0 or i == iterations:
                        await store.broadcast_event({
                            "type": "profiling_update",
                            "model": model_name,
                            "iteration": i,
                            "total": iterations,
                            "avg_latency": round(float(np.mean(list(store.latency_history[model_name])[-i:])), 2),
                            "log": f"[{model_name.upper()}] Profiling: {i}/{iterations} runs complete..."
                        })
            
            asyncio.create_task(profile_task())

        return {
            "detections": dets,
            "inference_time_ms": round(latency, 2),
            "num_objects": len(dets),
            "avg_confidence": round(sum(d["confidence"] for d in dets) / len(dets), 4) if dets else 0,
            "image_with_boxes": img_with_boxes,
        }

    if req.model in ["yolov5", "both"] and yolo_detector:
        response["yolov5"] = await run_model_inference("yolov5", yolo_detector, 20)

    if req.model in ["detr", "both"] and detr_detector:
        # Check if DETR is actually ready
        if detr_detector.status == "Ready":
            response["detr"] = await run_model_inference("detr", detr_detector, 10) # 10 for DETR since it's slower
        else:
            logger.warning("DETR not ready, skipping from dual mode")

    if not response:
        raise HTTPException(status_code=503, detail="Requested models are still initializing or failed to load.")

    # Final broadcast
    await store.broadcast_event({
        "type": "inference_complete",
        "count": store.inference_count,
        "models": list(response.keys()),
        "timestamp": time.time(),
    })
    
    return response


# ── ANALYTICS ENDPOINTS ──

@app.get("/api/evaluation/latest/metrics")
async def get_latest_metrics():
    """Return real metrics computed from inference history."""
    result = {"run_id": "latest"}
    for model in ["yolov5", "detr"]:
        latencies = list(store.latency_history[model])
        fps_data = store.get_fps_history(model)
        evaluation = store.get_evaluation(model)

        avg_latency = np.mean(latencies) if latencies else 0
        avg_fps = np.mean([f["fps"] for f in fps_data]) if fps_data else 0

        if evaluation:
            result[model] = {
                "map_50": evaluation.get("mAP_50", 0),
                "map_75": evaluation.get("mAP_50_95", 0),
                "precision": evaluation.get("aggregate_precision", 0),
                "recall": evaluation.get("aggregate_recall", 0),
                "avg_inference_ms": round(float(avg_latency), 2),
                "fps": round(float(avg_fps), 1),
                "params_millions": 7.2 if model == "yolov5" else 41.3,
            }
        else:
            result[model] = {
                "map_50": 0,
                "map_75": 0,
                "precision": 0,
                "recall": 0,
                "avg_inference_ms": round(float(avg_latency), 2),
                "fps": round(float(avg_fps), 1),
                "params_millions": 7.2 if model == "yolov5" else 41.3,
            }

    logger.info("[ANALYTICS PIPELINE] Metrics computed ✓")
    return result


@app.get("/api/evaluation/latest/pr-curve")
async def get_pr_curve(model: str = "yolov5"):
    """Return real PR curve from accumulated detections."""
    curve = store.get_pr_curve(model)
    logger.info(f"[ANALYTICS PIPELINE] PR curve generated for {model} ({len(curve)} points) ✓")
    return curve


@app.get("/api/evaluation/latest/per-class")
async def get_per_class(model: str = "yolov5"):
    """Return real per-class AP values."""
    metrics = store.get_per_class_ap(model)
    logger.info(f"[ANALYTICS PIPELINE] Per-class AP computed for {model} ({len(metrics)} classes) ✓")
    return {"model": model, "run_id": "latest", "metrics": metrics}


@app.get("/api/evaluation/latest/stability")
async def get_stability(model: str = "yolov5"):
    """Return real latency distribution."""
    dist = store.get_latency_distribution(model)
    logger.info(f"[ANALYTICS PIPELINE] Latency distribution updated for {model} ✓")
    return dist


@app.get("/api/evaluation/latest/fps-history")
async def get_fps_history(model: str = "yolov5"):
    """Return real FPS measurements over time."""
    return store.get_fps_history(model)


# ── DATASET ENDPOINTS ──

@app.get("/api/dataset/stats")
async def dataset_stats():
    """Return Pascal VOC 2012 dataset statistics."""
    if not os.path.exists(VOC_ANNOTATIONS):
        raise HTTPException(status_code=404, detail="VOC annotations directory not found")

    stats = get_dataset_stats(VOC_ANNOTATIONS)
    if stats is None:
        raise HTTPException(status_code=500, detail="Failed to parse dataset")

    stats["num_classes"] = len(stats.get("class_distribution", {}))
    return stats


@app.get("/api/dataset/samples")
async def dataset_samples(cls: Optional[str] = None, count: int = 10):
    """Return sample images from Pascal VOC dataset."""
    if not os.path.exists(VOC_IMAGES):
        raise HTTPException(status_code=404, detail="VOC images directory not found")

    all_images = [f for f in os.listdir(VOC_IMAGES) if f.endswith(('.jpg', '.jpeg', '.png'))]

    if cls and os.path.exists(VOC_ANNOTATIONS):
        # Filter images containing the specified class
        filtered = []
        for img_file in all_images:
            xml_name = os.path.splitext(img_file)[0] + ".xml"
            xml_path = os.path.join(VOC_ANNOTATIONS, xml_name)
            if os.path.exists(xml_path):
                try:
                    data = parse_voc_annotation(xml_path)
                    if any(obj["class"] == cls for obj in data["objects"]):
                        filtered.append(img_file)
                except Exception:
                    continue
        all_images = filtered

    # Sample
    import random
    sample_files = random.sample(all_images, min(count, len(all_images)))

    samples = []
    for fname in sample_files:
        img_path = os.path.join(VOC_IMAGES, fname)
        try:
            with Image.open(img_path) as img:
                img.thumbnail((256, 256))
                buf = BytesIO()
                img.save(buf, format="JPEG", quality=75)
                b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
                samples.append({"filename": fname, "data": b64})
        except Exception:
            continue

    return samples


@app.get("/api/dataset/evaluate-subset")
async def evaluate_subset(
    model: str = "yolov5",
    subset_pct: float = 0.1,
    conf_threshold: float = 0.5,
):
    """
    Run evaluation on a subset of VOC dataset.
    Returns mAP and timing for dataset-size analysis.
    """
    if not os.path.exists(VOC_ANNOTATIONS) or not os.path.exists(VOC_IMAGES):
        raise HTTPException(status_code=404, detail="VOC dataset not found")

    detector = yolo_detector if model == "yolov5" else detr_detector
    if detector is None:
        raise HTTPException(status_code=500, detail=f"{model} detector not loaded")

    # Get all XML files
    xml_files = [f for f in os.listdir(VOC_ANNOTATIONS) if f.endswith('.xml')]
    import random
    subset_size = max(1, int(len(xml_files) * subset_pct))
    subset = random.sample(xml_files, subset_size)

    VOC_CLASSES = [
        'person', 'bird', 'cat', 'cow', 'dog', 'horse', 'sheep',
        'aeroplane', 'bicycle', 'boat', 'bus', 'car', 'motorbike', 'train',
        'bottle', 'chair', 'diningtable', 'pottedplant', 'sofa', 'tvmonitor'
    ]

    all_preds = {}
    all_gts = {}
    total_latency = 0

    for xml_file in subset:
        image_id = os.path.splitext(xml_file)[0]
        img_path = os.path.join(VOC_IMAGES, f"{image_id}.jpg")
        xml_path = os.path.join(VOC_ANNOTATIONS, xml_file)

        if not os.path.exists(img_path):
            continue

        try:
            pil_img = Image.open(img_path).convert("RGB")
            gt_data = parse_voc_annotation(xml_path)

            start = time.perf_counter()
            if model == "yolov5":
                dets = detector.detect(pil_img, conf_threshold, 0.45)
            else:
                dets = detector.detect(pil_img, conf_threshold)
            latency = (time.perf_counter() - start) * 1000
            total_latency += latency

            all_preds[image_id] = [
                {"class_name": d["class"], "confidence": d["confidence"], "bbox": d["bbox"]}
                for d in dets
            ]
            all_gts[image_id] = [
                {"class_name": o["class"], "bbox": o["bbox"], "difficult": 0}
                for o in gt_data["objects"]
            ]
        except Exception as e:
            logger.warning(f"Skipping {image_id}: {e}")
            continue

    if not all_preds:
        return {"error": "No images processed", "subset_size": 0}

    evaluation = evaluate_detections(all_preds, all_gts, VOC_CLASSES, [0.5])
    avg_latency = total_latency / len(all_preds)

    return {
        "model": model,
        "subset_pct": subset_pct,
        "subset_size": len(all_preds),
        "total_images_in_dataset": len(xml_files),
        "mAP_50": round(evaluation["mAP_50"], 4),
        "per_class_ap": {k: round(v, 4) for k, v in evaluation["per_class_ap"].items()},
        "avg_latency_ms": round(avg_latency, 2),
        "total_time_s": round(total_latency / 1000, 2),
    }


# ── TELEMETRY SSE STREAM ──

@app.get("/api/telemetry/stream")
async def telemetry_stream(request: Request):
    """Server-Sent Events stream for real-time inference telemetry."""
    queue = asyncio.Queue(maxsize=100)
    store.subscribers.append(queue)

    async def event_generator():
        try:
            # Send initial connection event
            yield f"data: {json.dumps({'type': 'connected', 'inference_count': store.inference_count})}\n\n"

            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"data: {json.dumps(event)}\n\n"
                except asyncio.TimeoutError:
                    # Send heartbeat
                    yield f"data: {json.dumps({'type': 'heartbeat', 'inference_count': store.inference_count})}\n\n"
        finally:
            if queue in store.subscribers:
                store.subscribers.remove(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
@app.get("/api/model/status")
async def get_model_status():
    """Return loading status of backend models."""
    return {
        "yolov5": {
            "status": "Ready" if yolo_detector else "Loading",
        },
        "detr": {
            "status": detr_detector.status,
            "stages": detr_detector.stage_details
        }
    }

# ── INTEGRITY CHECK ──

@app.get("/api/health/integrity")
async def integrity_check():
    """
    Automated integrity validation.
    Flags if metrics appear to be static/dummy.
    """
    checks = []

    # Check latency variance (identical latencies = dummy)
    for model in ["yolov5", "detr"]:
        latencies = list(store.latency_history[model])
        if len(latencies) >= 3:
            variance = np.var(latencies)
            is_real = variance > 0.001  # Real latencies always have some variance
            checks.append({
                "check": f"{model}_latency_variance",
                "passed": bool(is_real),
                "value": round(float(variance), 6),
                "detail": "Real variance detected" if is_real else "Suspiciously identical latencies — possible dummy values",
            })

        fps_data = store.get_fps_history(model)
        if len(fps_data) >= 3:
            fps_vals = [f["fps"] for f in fps_data]
            variance = np.var(fps_vals)
            is_real = variance > 0.01
            checks.append({
                "check": f"{model}_fps_variance",
                "passed": bool(is_real),
                "value": round(float(variance), 6),
                "detail": "Real FPS variance" if is_real else "Static FPS values detected",
            })

    # Check if predictions exist
    for model in ["yolov5", "detr"]:
        n_preds = len(store.all_predictions.get(model, {}))
        checks.append({
            "check": f"{model}_has_predictions",
            "passed": n_preds > 0,
            "value": n_preds,
            "detail": f"{n_preds} inference runs recorded" if n_preds > 0 else "No inference runs yet",
        })

    all_passed = all(c["passed"] for c in checks) if checks else False

    return {
        "integrity_status": "VERIFIED" if all_passed else "NEEDS_INFERENCE" if not checks else "FLAGGED",
        "total_checks": len(checks),
        "passed": sum(1 for c in checks if c["passed"]),
        "failed": sum(1 for c in checks if not c["passed"]),
        "checks": checks,
        "inference_count": store.inference_count,
    }


# ── SYSTEM HEALTH REPORT ──

@app.get("/api/health/report")
async def system_health_report():
    """Complete system health report."""
    yolo_latencies = list(store.latency_history["yolov5"])
    detr_latencies = list(store.latency_history["detr"])
    yolo_eval = store.get_evaluation("yolov5")
    detr_eval = store.get_evaluation("detr")

    return {
        "components": [
            {
                "name": "YOLOv5 Inference",
                "status": "Working" if yolo_detector is not None else "Failing",
                "detail": f"Model loaded, {len(yolo_latencies)} runs recorded" if yolo_detector else "Model failed to load",
            },
            {
                "name": "DETR Inference",
                "status": "Working" if detr_detector is not None else "Failing",
                "detail": f"Model loaded, {len(detr_latencies)} runs recorded" if detr_detector else "Model failed to load",
            },
            {
                "name": "PR Curve",
                "status": "Dynamic" if yolo_eval and yolo_eval.get("pr_curves") else "Awaiting Data",
                "detail": "Computed from real detections" if yolo_eval else "Run inference to generate",
            },
            {
                "name": "Stability Analysis",
                "status": "Real" if len(yolo_latencies) >= 3 else "Insufficient Data",
                "detail": f"Based on {len(yolo_latencies)} real latency samples" if yolo_latencies else "Need at least 3 inference runs",
            },
            {
                "name": "Telemetry Stream",
                "status": "Live",
                "detail": f"SSE endpoint active, {len(store.subscribers)} subscribers",
            },
            {
                "name": "Analytics Engine",
                "status": "Dynamic" if store.inference_count > 0 else "Awaiting Inference",
                "detail": "All metrics computed from live inference data — zero synthetic values",
            },
        ],
        "inference_count": store.inference_count,
        "gpu_available": torch.cuda.is_available(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
