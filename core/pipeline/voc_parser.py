import os
import xml.etree.ElementTree as ET
from collections import Counter

def parse_voc_annotation(xml_path):
    tree = ET.parse(xml_path)
    root = tree.getroot()
    
    objects = []
    for obj in root.findall('object'):
        name = obj.find('name').text
        bndbox = obj.find('bndbox')
        bbox = [
            int(bndbox.find('xmin').text),
            int(bndbox.find('ymin').text),
            int(bndbox.find('xmax').text),
            int(bndbox.find('ymax').text)
        ]
        objects.append({"class": name, "bbox": bbox})
        
    return {
        "filename": root.find('filename').text,
        "width": int(root.find('size').find('width').text),
        "height": int(root.find('size').find('height').text),
        "objects": objects
    }

def get_dataset_stats(annotations_dir):
    if not os.path.exists(annotations_dir):
        return None
        
    xml_files = [f for f in os.listdir(annotations_dir) if f.endswith('.xml')]
    
    total_annotations = 0
    class_counts = Counter()
    image_sizes = []
    
    for xml_file in xml_files:
        try:
            data = parse_voc_annotation(os.path.join(annotations_dir, xml_file))
            total_annotations += len(data['objects'])
            for obj in data['objects']:
                class_counts[obj['class']] += 1
            image_sizes.append((data['width'], data['height']))
        except Exception:
            continue
            
    if not xml_files:
        return None
        
    avg_width = sum(s[0] for s in image_sizes) / len(image_sizes)
    avg_height = sum(s[1] for s in image_sizes) / len(image_sizes)
    
    return {
        "total_images": len(xml_files),
        "total_annotations": total_annotations,
        "class_distribution": dict(class_counts),
        "avg_annotations_per_image": total_annotations / len(xml_files),
        "image_size_stats": {
            "avg_width": avg_width,
            "avg_height": avg_height
        }
    }
