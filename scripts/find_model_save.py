import json

nb_path = 'vision_transformer_object_detection.ipynb'

try:
    with open(nb_path, 'r', encoding='utf-8') as f:
        nb = json.load(f)

    print(f"Scanning {nb_path} for DETR and SAVE operations...")
    
    for i, cell in enumerate(nb['cells']):
        if cell['cell_type'] == 'code':
            source = ''.join(cell['source'])
            if 'DETR' in source or 'detr' in source:
                print(f"\n[Cell {i+1}] DETR Context:")
                print("-" * 20)
                # Print lines containing save or torch.save
                lines = source.split('\n')
                for line in lines:
                    if 'save' in line.lower() or 'torch.save' in line.lower() or 'state_dict' in line.lower():
                        print(f"  >>> {line}")
                
                # Check for model instantiation
                if 'DetrForObjectDetection' in source:
                     print("  >>> Found DETR Instantiation")

except Exception as e:
    print(f"Error reading notebook: {e}")
