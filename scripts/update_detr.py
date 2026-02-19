import json
import os

notebook_path = 'vision_transformer_object_detection.ipynb'

try:
    with open(notebook_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Cell 19 (index 18) is the DETR Initialize & Training loop placeholder
    cell_index = 18
    
    optimized_code = [
        "from torch.utils.data import DataLoader\n",
        "from torch.cuda.amp import autocast, GradScaler\n",
        "\n",
        "def collate_fn(batch):\n",
        "    return tuple(zip(*batch))\n",
        "\n",
        "# ── DETR Refined Training Setup ──\n",
        "print(\"🚀 Setting up optimized DETR training pipeline...\")\n",
        "\n",
        "# Use transforms_v2 for advanced augmentation\n",
        "train_dataset = VOCDetectionDataset(train_df, VOC_ROOT/\"JPEGImages\", transform=get_transforms(train=True))\n",
        "val_dataset = VOCDetectionDataset(val_df, VOC_ROOT/\"JPEGImages\", transform=get_transforms(train=False))\n",
        "\n",
        "train_loader = DataLoader(train_dataset, batch_size=4, shuffle=True, collate_fn=collate_fn, num_workers=2)\n",
        "val_loader = DataLoader(val_dataset, batch_size=4, shuffle=False, collate_fn=collate_fn, num_workers=2)\n",
        "\n",
        "def train_detr_epoch(model, loader, optimizer, scaler, device):\n",
        "    model.train()\n",
        "    total_loss = 0\n",
        "    pbar = tqdm(loader, desc=\"Training DETR\")\n",
        "    \n",
        "    for images, targets in pbar:\n",
        "        images = list(img.to(device) for img in images)\n",
        "        \n",
        "        processed_targets = []\n",
        "        for t in targets:\n",
        "            d = {k: v.to(device) for k, v in t.items()}\n",
        "            processed_targets.append(d)\n",
        "            \n",
        "        optimizer.zero_grad()\n",
        "        \n",
        "        # AMP autocast\n",
        "        with autocast():\n",
        "            outputs = model(pixel_values=torch.stack(images), labels=processed_targets)\n",
        "            loss = outputs.loss\n",
        "            \n",
        "        scaler.scale(loss).backward()\n",
        "        \n",
        "        # Gradient Clipping\n",
        "        scaler.unscale_(optimizer)\n",
        "        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=0.1)\n",
        "        \n",
        "        scaler.step(optimizer)\n",
        "        scaler.update()\n",
        "        \n",
        "        total_loss += loss.item()\n",
        "        pbar.set_postfix({'loss': loss.item()})\n",
        "        \n",
        "    return total_loss / len(loader)\n",
        "\n",
        "def validate_detr(model, loader, device):\n",
        "    model.eval()\n",
        "    total_loss = 0\n",
        "    with torch.no_grad():\n",
        "        for images, targets in tqdm(loader, desc=\"Validating DETR\"):\n",
        "            images = list(img.to(device) for img in images)\n",
        "            processed_targets = []\n",
        "            for t in targets:\n",
        "                d = {k: v.to(device) for k, v in t.items()}\n",
        "                processed_targets.append(d)\n",
        "            \n",
        "            outputs = model(pixel_values=torch.stack(images), labels=processed_targets)\n",
        "            total_loss += outputs.loss.item()\n",
        "            \n",
        "    return total_loss / len(loader)\n",
        "\n",
        "optimizer = torch.optim.AdamW(detr_model.parameters(), lr=1e-4, weight_decay=1e-4)\n",
        "scaler = GradScaler()\n",
        "\n",
        "print(\"✅ DETR optimization routine (AMP + Grad Clipping + Collator) implemented.\")"
    ]
    
    data['cells'][cell_index]['source'] = optimized_code
    
    with open(notebook_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=1)
    
    print("SUCCESS: Notebook updated with optimized DETR logic.")

except Exception as e:
    print(f"FAILED: {str(e)}")
