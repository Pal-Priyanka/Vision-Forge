# VisionForge AI - Training Scripts

This directory contains training scripts for YOLOv5 and DETR models on the Pascal VOC 2012 dataset.

## 🚀 Quick Start

### 1. Prepare Dataset

Download Pascal VOC 2012:
```bash
# Download and extract VOC2012
wget http://host.robots.ox.ac.uk/pascal/VOC/voc2012/VOCtrainval_11-May-2012.tar
tar -xvf VOCtrainval_11-May-2012.tar
mv VOCdevkit ../
```

Generate YOLOv5 configuration:
```bash
python generate_voc_config.py
```

### 2. Train YOLOv5

```bash
python train_yolov5.py \
  --run-id yolo_experiment_001 \
  --epochs 50 \
  --batch-size 16 \
  --img-size 640 \
  --device cuda
```

**Arguments:**
- `--run-id`: Unique identifier for this training run
- `--epochs`: Number of training epochs (default: 50)
- `--batch-size`: Batch size (default: 16)
- `--img-size`: Input image size (default: 640)
- `--device`: Training device - `cuda` or `cpu`

### 3. Train DETR

```bash
python train_detr.py \
  --run-id detr_experiment_001 \
  --epochs 50 \
  --batch-size 4 \
  --lr 1e-4 \
  --device cuda
```

**Arguments:**
- `--run-id`: Unique identifier for this training run
- `--epochs`: Number of training epochs (default: 50)
- `--batch-size`: Batch size (default: 4, DETR is memory-intensive)
- `--lr`: Learning rate (default: 1e-4)
- `--device`: Training device - `cuda` or `cpu`

## 📊 Real-Time Monitoring

Both training scripts emit metrics via WebSocket to `ws://localhost:8000/ws/training/{run_id}`.

**Metrics broadcasted:**
- `epoch`: Current epoch number
- `train_loss`: Training loss
- `val_loss`: Validation loss
- `map_50`: mAP@0.5
- `map_75`: mAP@0.75
- `precision`: Precision score
- `recall`: Recall score
- `lr`: Current learning rate
- `timestamp`: ISO timestamp

**Frontend Integration:**
The frontend automatically connects to the WebSocket and displays live training progress in the "Live Training Stream" section.

## 💾 Checkpoints

Checkpoints are automatically saved to `../checkpoints/`:

**YOLOv5:**
- Final checkpoint: `yolov5_{run_id}_final.pt`
- Training results: `../runs/train/yolov5_{run_id}/`

**DETR:**
- Periodic checkpoints: `detr_{run_id}_epoch{N}.pt` (every 10 epochs)
- Final checkpoint: `detr_{run_id}_final.pt`

## 📁 Directory Structure

```
training/
├── train_yolov5.py          # YOLOv5 training script
├── train_detr.py            # DETR training script
├── generate_voc_config.py   # VOC dataset configuration
├── voc.yaml                 # Generated YOLOv5 config
└── README.md                # This file

../checkpoints/              # Model checkpoints
../runs/train/               # Training results
../VOCdevkit/VOC2012/        # Pascal VOC dataset
```

## 🔧 Requirements

Install dependencies:
```bash
pip install -r ../web_app/backend/requirements.txt
```

**Key dependencies:**
- `torch>=2.1.0`
- `torchvision>=0.16.0`
- `ultralytics>=8.1.0` (YOLOv5)
- `transformers>=4.36.0` (DETR)
- `websockets>=12.0`

## 🎯 Expected Performance

**YOLOv5s on VOC2012:**
- mAP@0.5: ~82%
- Inference time: ~8.5ms (GPU)
- FPS: ~117

**DETR-ResNet50 on VOC2012:**
- mAP@0.5: ~79%
- Inference time: ~25ms (GPU)
- FPS: ~39

## 🐛 Troubleshooting

**CUDA Out of Memory:**
- Reduce `--batch-size`
- Use smaller `--img-size` for YOLOv5
- Enable gradient checkpointing (advanced)

**WebSocket Connection Failed:**
- Ensure backend is running: `cd ../web_app/backend && python main.py`
- Check WebSocket URL in training script

**Dataset Not Found:**
- Run `python generate_voc_config.py` to verify dataset structure
- Ensure VOCdevkit is in the correct location

## 📝 Notes

- **GPU Recommended:** Training on CPU will be significantly slower
- **Disk Space:** Ensure ~10GB free for checkpoints and results
- **Memory:** YOLOv5 requires ~8GB GPU RAM, DETR requires ~12GB
- **Time:** Full 50-epoch training takes ~2-4 hours on modern GPU

## 🚀 Next Steps

After training:
1. Checkpoints are saved automatically
2. View results in `../runs/train/`
3. Use trained models for inference via the web interface
4. Compare performance in the metrics dashboard
