import json
import os

notebook_path = 'vision_transformer_object_detection.ipynb'

try:
    with open(notebook_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # We want to add the weighted sampler logic. 
    # Let's find a spot after cell 19? Or actually insert it before cell 19's setup.
    # Looking at the previous code, cell 19 (index 18) now has the dataloader setup.
    # We should add the weight calculation before that or integrate it into cell 18.
    
    cell_index = 18
    
    sampler_code = [
        "import torch\n",
        "from torch.utils.data import DataLoader, WeightedRandomSampler\n",
        "from torch.cuda.amp import autocast, GradScaler\n",
        "import numpy as np\n",
        "\n",
        "def collate_fn(batch):\n",
        "    return tuple(zip(*batch))\n",
        "\n",
        "# ── Weighted Sampler for Class Imbalance ──\n",
        "print(\"⚖️ Calculating class weights for sampling...\")\n",
        "\n",
        "# Count classes in training set\n",
        "class_counts = train_df['object_class'].value_counts().to_dict()\n",
        "class_weights = {cls: 1.0 / count for cls, count in class_counts.items()}\n",
        "\n",
        "# Assign weight to each sample based on its objects (taking max weight if multiple objects)\n",
        "sample_weights = []\n",
        "for img_id in train_df['image_id'].unique():\n",
        "    img_objs = train_df[train_df['image_id'] == img_id]['object_class']\n",
        "    weight = max([class_weights[obj] for obj in img_objs])\n",
        "    sample_weights.append(weight)\n",
        "\n",
        "sampler = WeightedRandomSampler(sample_weights, num_samples=len(sample_weights), replacement=True)\n",
        "\n",
        "# ── DETR Refined Training Setup ──\n",
        "print(\"🚀 Setting up optimized DETR training pipeline with Weighted Sampling...\")\n",
        "\n",
        "train_dataset = VOCDetectionDataset(train_df, VOC_ROOT/\"JPEGImages\", transform=get_transforms(train=True))\n",
        "val_dataset = VOCDetectionDataset(val_df, VOC_ROOT/\"JPEGImages\", transform=get_transforms(train=False))\n",
        "\n",
        "# Use WeightedRandomSampler in train_loader\n",
        "train_loader = DataLoader(train_dataset, batch_size=4, sampler=sampler, collate_fn=collate_fn, num_workers=2)\n",
        "val_loader = DataLoader(val_dataset, batch_size=4, shuffle=False, collate_fn=collate_fn, num_workers=2)\n",
        "\n",
        "def train_detr_epoch(model, loader, optimizer, scaler, device):\n",
        "    model.train()\n",
        "    total_loss = 0\n",
        "    pbar = tqdm(loader, desc=\"Training DETR\")\n",
        "    \n",
        "    for images, targets in pbar:\n",
        "        images = list(img.to(device) for img in images)\n",
        "        processed_targets = [{k: v.to(device) for k, v in t.items()} for t in targets]\n",
        "            \n",
        "        optimizer.zero_grad()\n",
        "        with autocast():\n",
        "            outputs = model(pixel_values=torch.stack(images), labels=processed_targets)\n",
        "            loss = outputs.loss\n",
        "            \n",
        "        scaler.scale(loss).backward()\n",
        "        scaler.unscale_(optimizer)\n",
        "        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=0.1)\n",
        "        \n",
        "        scaler.step(optimizer)\n",
        "        scaler.update()\n",
        "        \n",
        "        total_loss += loss.item()\n",
        "        pbar.set_postfix({'loss': f\"{loss.item():.4f}\"})\n",
        "        \n",
        "    return total_loss / len(loader)\n",
        "\n",
        "def validate_detr(model, loader, device):\n",
        "    model.eval()\n",
        "    total_loss = 0\n",
        "    with torch.no_grad():\n",
        "        for images, targets in tqdm(loader, desc=\"Validating DETR\"):\n",
        "            images = list(img.to(device) for img in images)\n",
        "            processed_targets = [{k: v.to(device) for k, v in t.items()} for t in targets]\n",
        "            outputs = model(pixel_values=torch.stack(images), labels=processed_targets)\n",
        "            total_loss += outputs.loss.item()\n",
        "    return total_loss / len(loader)\n",
        "\n",
        "optimizer = torch.optim.AdamW(detr_model.parameters(), lr=1e-4, weight_decay=1e-4)\n",
        "scaler = GradScaler()\n",
        "\n",
        "print(\"✅ DETR optimization routine (AMP + Grad Clipping + Weighted Sampler) implemented.\")"
    ]
    
    data['cells'][cell_index]['source'] = sampler_code
    
    with open(notebook_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=1)
    
    print("SUCCESS: Notebook updated with Weighted Sampler logic.")

except Exception as e:
    print(f"FAILED: {str(e)}")
