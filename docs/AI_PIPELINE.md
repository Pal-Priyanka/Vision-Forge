# AI/ML Pipeline: Vision-Forge Engine

This document details the neural processing pipeline, from raw data ingestion to real-time inference.

## 🧬 Neural Architectures

### 1. YOLOv5 (CNN)
- **Role**: High-speed real-time detection.
- **Backbone**: CSP-Darknet53.
- **Optimization**: Uses Auto-anchor for dataset-specific bounding box optimization.
- **Performance**: Sub-15ms inference on standard GPU instances.

### 2. DETR (End-to-End Object Detection with Transformers)
- **Role**: High-fidelity detection with global context.
- **Architecture**: CNN Backbone (ResNet-50) + Transformer Encoder/Decoder.
- **Heuristics**: Removes the need for Non-Maximum Suppression (NMS) via bipartite matching loss.

## 🛤 Training Pipeline

Training manifests are located in `core/ml/`.

1.  **Data Ingestion**: Pascal VOC 2012 dataset is parsed with `voc_parser.py`.
2.  **Augmentation**: Mosaic augmentation (YOLO) and Mixup (DETR) are used to improve generalization.
3.  **Optimization**: AdamW optimizer with cosine learning rate scheduling.
4.  **Checkpointing**: Weights are saved in `core/ml/*.pt` and registered in the API registry.

## ⚡ Inference Engineering

The inference engine in `apps/api/main.py` is designed for low overhead:

```python
# Multi-Model Orchestration Pattern
async def run_comparison(image_tensor):
    yolo_task = asyncio.create_task(yolo_engine.predict(image_tensor))
    detr_task = asyncio.create_task(detr_engine.predict(image_tensor))
    
    yolo_res, detr_res = await asyncio.gather(yolo_task, detr_task)
    return merge_results(yolo_res, detr_res)
```

## 📊 Evaluation Metrics

We benchmark models using:
- **mAP@.5**: Mean Average Precision at IoU threshold 0.5.
- **Precision/Recall Equilibrium**: Visualized via dynamic PR curves.
- **Inference Stability**: Measuring variance (sigma) in latency across 100+ runs.
