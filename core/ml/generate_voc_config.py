"""
VOC Dataset Configuration for YOLOv5
Generates YAML configuration file for Pascal VOC 2012 dataset
"""

import os
from pathlib import Path

# Project paths
PROJECT_ROOT = Path(__file__).parent.parent
VOC_ROOT = PROJECT_ROOT / "VOCdevkit" / "VOC2012"

# VOC 2012 Classes (20 classes)
VOC_CLASSES = [
    'aeroplane', 'bicycle', 'bird', 'boat', 'bottle',
    'bus', 'car', 'cat', 'chair', 'cow',
    'diningtable', 'dog', 'horse', 'motorbike', 'person',
    'pottedplant', 'sheep', 'sofa', 'train', 'tvmonitor'
]

def generate_voc_yaml(output_path: str = "voc.yaml"):
    """
    Generate YOLOv5-compatible YAML configuration for VOC dataset
    
    Args:
        output_path: Path to save the YAML file
    """
    yaml_content = f"""# Pascal VOC 2012 Dataset Configuration for YOLOv5

# Dataset root directory
path: {VOC_ROOT}

# Train and validation image directories
train: ImageSets/Main/train.txt
val: ImageSets/Main/val.txt

# Number of classes
nc: 20

# Class names
names:
"""
    
    # Add class names
    for idx, class_name in enumerate(VOC_CLASSES):
        yaml_content += f"  {idx}: {class_name}\n"
    
    # Save to file
    output_file = PROJECT_ROOT / output_path
    with open(output_file, 'w') as f:
        f.write(yaml_content)
    
    print(f"✅ VOC YAML configuration saved to: {output_file}")
    print(f"📊 Classes: {len(VOC_CLASSES)}")
    print(f"📁 Dataset root: {VOC_ROOT}")
    
    return output_file


def verify_voc_dataset():
    """Verify that VOC dataset exists and is properly structured"""
    required_dirs = [
        VOC_ROOT / "Annotations",
        VOC_ROOT / "ImageSets" / "Main",
        VOC_ROOT / "JPEGImages"
    ]
    
    print("🔍 Verifying VOC dataset structure...")
    
    all_exist = True
    for dir_path in required_dirs:
        if dir_path.exists():
            print(f"  ✅ {dir_path.relative_to(PROJECT_ROOT)}")
        else:
            print(f"  ❌ {dir_path.relative_to(PROJECT_ROOT)} - NOT FOUND")
            all_exist = False
    
    if all_exist:
        print("\n✅ VOC dataset structure is valid!")
        
        # Count images
        jpeg_dir = VOC_ROOT / "JPEGImages"
        if jpeg_dir.exists():
            num_images = len(list(jpeg_dir.glob("*.jpg")))
            print(f"📸 Total images: {num_images}")
        
        # Count annotations
        ann_dir = VOC_ROOT / "Annotations"
        if ann_dir.exists():
            num_annotations = len(list(ann_dir.glob("*.xml")))
            print(f"📝 Total annotations: {num_annotations}")
    else:
        print("\n❌ VOC dataset is incomplete!")
        print("   Download from: http://host.robots.ox.ac.uk/pascal/VOC/voc2012/")
        print(f"   Extract to: {VOC_ROOT.parent}")
    
    return all_exist


if __name__ == "__main__":
    print("=" * 60)
    print("VOC Dataset Configuration Generator")
    print("=" * 60)
    
    # Verify dataset
    dataset_valid = verify_voc_dataset()
    
    if dataset_valid:
        print("\n" + "=" * 60)
        # Generate YAML
        yaml_path = generate_voc_yaml()
        print("=" * 60)
        print(f"\n🚀 Ready to train!")
        print(f"   Run: python training/train_yolov5.py --data {yaml_path.name}")
    else:
        print("\n⚠️  Please download and extract the VOC dataset first.")
