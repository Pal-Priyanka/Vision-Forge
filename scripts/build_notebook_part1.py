"""Part 1: Build notebook cells for Sections 1-2 (Setup + EDA).
Now includes explicit dependency checks and timm import.
FIX: Added newline handling for proper .ipynb JSON format.
"""
import json, os
from typing import Any

def md(source): return {"cell_type": "markdown", "metadata": {}, "source": [line + "\n" for line in source.split("\n")]}
def code(source): return {"cell_type": "code", "metadata": {}, "source": [line + "\n" for line in source.split("\n")], "outputs": [], "execution_count": None}

cells: list[dict[str, Any]] = []

# ── Title ──
cells.append(md("""# 🔬 Transformer vs CNN Object Detection on Pascal VOC 2012
## Comparing YOLOv5 (CNN) and DETR (Vision Transformer)

---"""))

# ── Section 1: Setup ──
cells.append(md("# 📦 Section 1: Setup & Data Loading"))

cells.append(md("## 1.1 Install & Verify Dependencies"))
cells.append(code("""# Comprehensive dependency installation
# !pip install torch torchvision transformers ultralytics opencv-python pandas matplotlib seaborn tqdm Pillow scipy scikit-learn pycocotools numpy timm

import importlib
import sys

def check_dependencies(packages):
    missing = []
    for pkg in packages:
        try:
            importlib.import_module(pkg)
        except ImportError:
            missing.append(pkg)
    
    if missing:
        print(f"❌ Missing packages: {', '.join(missing)}")
        print("Please run: !pip install " + " ".join(missing))
        print("⚠️ IMPORTANT: After installation, you MUST restart your Jupyter kernel (Kernel -> Restart).")
    else:
        print("✅ All core dependencies present.")

check_dependencies(['torch', 'torchvision', 'transformers', 'ultralytics', 'cv2', 'pandas', 'matplotlib', 'seaborn', 'tqdm', 'PIL', 'scipy', 'sklearn', 'pycocotools', 'numpy', 'timm'])"""))

cells.append(md("## 1.2 Import Libraries"))
cells.append(code("""import os
import glob
import json
import time
import random
import logging
import warnings
import xml.etree.ElementTree as ET
from pathlib import Path
from collections import Counter, defaultdict

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import seaborn as sns
from PIL import Image
from tqdm.auto import tqdm
from scipy import ndimage

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import torchvision
from torchvision import transforms

# DETR & Transformer specific
import transformers
from transformers import DetrImageProcessor, DetrForObjectDetection
try:
    import timm
    print(f"✅ timm version: {timm.__version__}")
except ImportError:
    print("❌ timm not found in the current kernel. RESTART YOUR KERNEL NOW.")

warnings.filterwarnings('ignore')
logging.basicConfig(level=logging.INFO)

# Visualization defaults
sns.set_style("whitegrid")
plt.rcParams.update({'figure.figsize': (12, 6), 'figure.dpi': 100})
CB_PALETTE = sns.color_palette("colorblind", 20)

print(f"✅ PyTorch: {torch.__version__} | Transformers: {transformers.__version__}")"""))

cells.append(md("## 1.3 Device Configuration"))
cells.append(code("""SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)
torch.cuda.manual_seed_all(SEED)
torch.backends.cudnn.deterministic = True

DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {DEVICE}")
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")"""))

cells.append(md("## 1.4 Define Paths & Constants"))
cells.append(code("""PROJECT_ROOT = Path(r"C:\\Users\\palan\\OneDrive\\Desktop\\DL_Transformer_project")
VOC_ROOT = PROJECT_ROOT / "VOC2012_train_val" / "VOC2012_train_val"
ANNOTATIONS_DIR = VOC_ROOT / "Annotations"
IMAGES_DIR = VOC_ROOT / "JPEGImages"
IMAGESETS_DIR = VOC_ROOT / "ImageSets" / "Main"
RESULTS_DIR = PROJECT_ROOT / "results"
RESULTS_DIR.mkdir(exist_ok=True)

VOC_CLASSES = ['aeroplane', 'bicycle', 'bird', 'boat', 'bottle', 'bus', 'car', 'cat', 'chair', 'cow', 'diningtable', 'dog', 'horse', 'motorbike', 'person', 'pottedplant', 'sheep', 'sofa', 'train', 'tvmonitor']
CLASS_TO_IDX = {cls: i for i, cls in enumerate(VOC_CLASSES)}

IMG_SIZE_YOLO, IMG_SIZE_DETR = 640, 512
BATCH_SIZE = 8
EPOCHS = 50"""))

cells.append(md("## 1.5 Load Annotations"))
cells.append(code("""def parse_voc_xml(xml_path):
    tree = ET.parse(xml_path)
    root = tree.getroot()
    filename = root.find('filename').text
    size = root.find('size')
    img_w, img_h = int(size.find('width').text), int(size.find('height').text)
    
    objects = []
    for obj in root.findall('object'):
        name = obj.find('name').text
        bbox = obj.find('bndbox')
        xmin, ymin = float(bbox.find('xmin').text), float(bbox.find('ymin').text)
        xmax, ymax = float(bbox.find('xmax').text), float(bbox.find('ymax').text)
        objects.append({
            'image_id': Path(xml_path).stem, 'image_path': str(IMAGES_DIR / filename),
            'object_class': name, 'xmin': xmin, 'ymin': ymin, 'xmax': xmax, 'ymax': ymax,
            'bbox_width': xmax - xmin, 'bbox_height': ymax - ymin,
            'image_width': img_w, 'image_height': img_h
        })
    return objects

train_ids = [l.strip() for l in open(IMAGESETS_DIR / "train.txt") if l.strip()]
val_ids = [l.strip() for l in open(IMAGESETS_DIR / "val.txt") if l.strip()]

all_objects = []
# For testing, we only parse first 100 XMLs if env is 'test', otherwise all
xml_files = glob.glob(str(ANNOTATIONS_DIR / "*.xml"))
if os.getenv("NB_TEST_MODE") == "1":
    xml_files = xml_files[:100]

for xml_path in tqdm(xml_files, desc="Parsing"):
    all_objects.extend(parse_voc_xml(xml_path))

df = pd.DataFrame(all_objects)
df['split'] = 'other'
df.loc[df['image_id'].isin(train_ids), 'split'] = 'train'
df.loc[df['image_id'].isin(val_ids), 'split'] = 'val'
print(f"Total: {len(df)} annots | {df['image_id'].nunique()} images")"""))

cells.append(md("# 📊 Section 2: EDA (Compact)"))
cells.append(code("""fig, ax = plt.subplots(figsize=(10, 6))
df['object_class'].value_counts().plot(kind='barh', ax=ax, color=CB_PALETTE)
ax.set_title("Class Distribution")
plt.show()"""))

with open('cells_part1.json', 'w') as f: json.dump(cells, f)
