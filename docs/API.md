# API Specification: Vision-Forge

The Vision-Forge API is a high-performance RESTful interface designed for real-time model interaction and system diagnostics.

## Core Endpoints

### Inference Arena

`POST /api/detection/run`
Runs object detection architectures on the provided image.

**Payload**:
```json
{
  "image": "base64_string",
  "model": "yolov5" | "detr" | "both",
  "confidence": 0.45,
  "iou": 0.5
}
```

**Response**:
```json
{
  "yolov5": {
    "detections": [...],
    "latency_ms": 14.2
  },
  "detr": { ... }
}
```

---

### Analytics & Telemetry

`GET /api/metrics`
Retrieves cumulative performance metrics for the active session.

`GET /api/health/integrity`
Performs a deep audit of the analytics engine to ensure truthfulness in data representation.

---

### Dataset Benchmarking

`POST /api/dataset/evaluate`
Programs a batch evaluation run against a subset of the benchmark dataset.

**Payload**:
```json
{
  "model": "yolov5",
  "subset_pct": 0.1,
  "threshold": 0.5
}
```

---

## Security and Middleware

- **CORS**: Configured for high-trust origins.
- **Rate Limiting**: 100 requests/minute per IP to prevent DoS on GPU resources.
- **Validation**: Strict Pydantic models for all ingress/egress.

## WebSockets

`WS /ws/inference/live`
Unstable feature (In Development). Supports a persistent stream of frames for live video analysis without HTTP overhead.
