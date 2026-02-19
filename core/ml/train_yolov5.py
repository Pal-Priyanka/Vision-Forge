"""
YOLOv5 Training Script with Real-Time WebSocket Metrics
Trains YOLOv5 on Pascal VOC 2012 dataset with live progress updates
"""

import os
import sys
import asyncio
import json
import torch
from pathlib import Path
from datetime import datetime
from ultralytics import YOLO
import websockets

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.append(str(PROJECT_ROOT))

class YOLOv5Trainer:
    def __init__(self, run_id: str, websocket_url: str = "ws://localhost:8000"):
        self.run_id = run_id
        self.websocket_url = websocket_url
        self.model = None
        self.ws_clients = set()
        
    async def broadcast_metric(self, metric_data: dict):
        """Broadcast training metrics to all connected WebSocket clients"""
        message = json.dumps(metric_data)
        if self.ws_clients:
            await asyncio.gather(
                *[client.send(message) for client in self.ws_clients],
                return_exceptions=True
            )
        print(f"📊 Epoch {metric_data.get('epoch', 0)}: mAP={metric_data.get('map_50', 0):.4f}")
    
    def train(self, 
              data_yaml: str = "voc.yaml",
              epochs: int = 50,
              batch_size: int = 16,
              img_size: int = 640,
              device: str = "cuda" if torch.cuda.is_available() else "cpu"):
        """
        Train YOLOv5 model with real-time metrics
        
        Args:
            data_yaml: Path to dataset YAML configuration
            epochs: Number of training epochs
            batch_size: Batch size for training
            img_size: Input image size
            device: Training device (cuda/cpu)
        """
        print(f"🚀 Starting YOLOv5 Training - Run ID: {self.run_id}")
        print(f"📦 Device: {device}")
        print(f"📊 Epochs: {epochs}, Batch Size: {batch_size}")
        
        # Initialize YOLOv5 model
        self.model = YOLO('yolov5s.pt')  # Start with pretrained weights
        
        # Training configuration
        results = self.model.train(
            data=data_yaml,
            epochs=epochs,
            batch=batch_size,
            imgsz=img_size,
            device=device,
            project=str(PROJECT_ROOT / "runs" / "train"),
            name=f"yolov5_{self.run_id}",
            exist_ok=True,
            verbose=True,
            # Callbacks for real-time metrics
            callbacks={
                'on_train_epoch_end': self.on_epoch_end,
                'on_fit_epoch_end': self.on_fit_epoch_end,
            }
        )
        
        print(f"✅ Training Complete!")
        print(f"📁 Results saved to: {results.save_dir}")
        
        return results
    
    def on_epoch_end(self, trainer):
        """Callback after each training epoch"""
        epoch = trainer.epoch
        metrics = trainer.metrics
        
        # Extract metrics
        metric_data = {
            "type": "epoch_complete",
            "run_id": self.run_id,
            "model": "yolov5",
            "epoch": epoch + 1,
            "train_loss": float(metrics.get('train/box_loss', 0)),
            "val_loss": float(metrics.get('val/box_loss', 0)),
            "map_50": float(metrics.get('metrics/mAP50', 0)),
            "map_75": float(metrics.get('metrics/mAP50-95', 0)),
            "precision": float(metrics.get('metrics/precision', 0)),
            "recall": float(metrics.get('metrics/recall', 0)),
            "lr": float(trainer.optimizer.param_groups[0]['lr']),
            "timestamp": datetime.now().isoformat()
        }
        
        # Broadcast to WebSocket (async)
        asyncio.run(self.broadcast_metric(metric_data))
    
    def on_fit_epoch_end(self, trainer):
        """Callback after validation"""
        pass  # Additional validation metrics can be added here
    
    def save_checkpoint(self, path: str):
        """Save model checkpoint"""
        if self.model:
            self.model.save(path)
            print(f"💾 Checkpoint saved: {path}")


def main():
    """Main training entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Train YOLOv5 on Pascal VOC 2012')
    parser.add_argument('--run-id', type=str, default=f"yolo_{datetime.now().strftime('%Y%m%d_%H%M%S')}", 
                        help='Unique run identifier')
    parser.add_argument('--data', type=str, default='voc.yaml', 
                        help='Path to dataset YAML')
    parser.add_argument('--epochs', type=int, default=50, 
                        help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=16, 
                        help='Batch size')
    parser.add_argument('--img-size', type=int, default=640, 
                        help='Input image size')
    parser.add_argument('--device', type=str, default='cuda' if torch.cuda.is_available() else 'cpu',
                        help='Training device')
    
    args = parser.parse_args()
    
    # Initialize trainer
    trainer = YOLOv5Trainer(run_id=args.run_id)
    
    # Start training
    results = trainer.train(
        data_yaml=args.data,
        epochs=args.epochs,
        batch_size=args.batch_size,
        img_size=args.img_size,
        device=args.device
    )
    
    # Save final checkpoint
    checkpoint_path = PROJECT_ROOT / "checkpoints" / f"yolov5_{args.run_id}_final.pt"
    checkpoint_path.parent.mkdir(parents=True, exist_ok=True)
    trainer.save_checkpoint(str(checkpoint_path))
    
    print(f"🎉 Training completed successfully!")
    print(f"📊 Final mAP@0.5: {results.results_dict.get('metrics/mAP50', 0):.4f}")


if __name__ == "__main__":
    main()
