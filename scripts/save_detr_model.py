from transformers import DetrForObjectDetection
import torch
import os

save_path = "transformer-vs-cnn/backend/models/detr_model.pt"

print("Downloading DETR model (facebook/detr-resnet-50)...")
try:
    model = DetrForObjectDetection.from_pretrained("facebook/detr-resnet-50")
    
    print(f"Saving model state_dict to {save_path}...")
    torch.save(model.state_dict(), save_path)
    
    print("✅ DETR model saved successfully!")
    
except Exception as e:
    print(f"❌ Error saving model: {e}")
