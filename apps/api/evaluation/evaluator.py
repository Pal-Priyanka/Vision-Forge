"""
Real Object Detection Evaluation Engine

Implements proper PASCAL VOC evaluation protocol:
- IoU computation
- Prediction-to-GT matching (greedy, per-class)
- Precision-Recall curve generation
- AP per class (all-point interpolation)
- mAP@0.5 and mAP@0.5:0.95
"""

import numpy as np
from collections import defaultdict
from typing import List, Dict, Tuple
import logging

logger = logging.getLogger("evaluation.evaluator")


def compute_iou(box_a: List[float], box_b: List[float]) -> float:
    """
    Compute Intersection over Union between two boxes.
    Boxes are [x1, y1, x2, y2].
    """
    x1 = max(box_a[0], box_b[0])
    y1 = max(box_a[1], box_b[1])
    x2 = min(box_a[2], box_b[2])
    y2 = min(box_a[3], box_b[3])

    intersection = max(0, x2 - x1) * max(0, y2 - y1)
    if intersection == 0:
        return 0.0

    area_a = (box_a[2] - box_a[0]) * (box_a[3] - box_a[1])
    area_b = (box_b[2] - box_b[0]) * (box_b[3] - box_b[1])
    union = area_a + area_b - intersection

    return intersection / union if union > 0 else 0.0


def match_predictions_to_gt(
    predictions: List[Dict],
    ground_truths: List[Dict],
    iou_threshold: float = 0.5
) -> Tuple[List[bool], int]:
    """
    Match predictions to ground truth using greedy IoU matching.

    Args:
        predictions: Sorted by confidence descending. Each: {bbox, confidence}
        ground_truths: Each: {bbox, difficult}
        iou_threshold: Minimum IoU for a valid match

    Returns:
        (tp_flags, n_gt): List of True/False for each prediction, and count of non-difficult GTs
    """
    n_gt = sum(1 for gt in ground_truths if not gt.get("difficult", 0))
    matched_gt = set()
    tp_flags = []

    for pred in predictions:
        best_iou = 0.0
        best_gt_idx = -1

        for gt_idx, gt in enumerate(ground_truths):
            if gt_idx in matched_gt:
                continue
            iou = compute_iou(pred["bbox"], gt["bbox"])
            if iou > best_iou:
                best_iou = iou
                best_gt_idx = gt_idx

        if best_iou >= iou_threshold and best_gt_idx >= 0:
            gt = ground_truths[best_gt_idx]
            if gt.get("difficult", 0):
                # Skip difficult objects — they don't count as TP or FP
                continue
            matched_gt.add(best_gt_idx)
            tp_flags.append(True)
        else:
            tp_flags.append(False)

    return tp_flags, n_gt


def compute_ap(precisions: np.ndarray, recalls: np.ndarray) -> float:
    """
    Compute Average Precision using all-point interpolation (VOC 2010+ protocol).
    """
    # Prepend sentinel values
    precisions = np.concatenate(([0.0], precisions, [0.0]))
    recalls = np.concatenate(([0.0], recalls, [1.0]))

    # Make precision monotonically decreasing (right to left)
    for i in range(len(precisions) - 2, -1, -1):
        precisions[i] = max(precisions[i], precisions[i + 1])

    # Find points where recall changes
    recall_changes = np.where(recalls[1:] != recalls[:-1])[0]

    # Sum (delta_recall * precision)
    ap = np.sum((recalls[recall_changes + 1] - recalls[recall_changes]) * precisions[recall_changes + 1])
    return float(ap)


def evaluate_detections(
    all_predictions: Dict[str, List[Dict]],
    all_ground_truths: Dict[str, List[Dict]],
    class_names: List[str],
    iou_thresholds: List[float] = None
) -> Dict:
    """
    Full evaluation pipeline across all images.

    Args:
        all_predictions: {image_id: [{class_name, confidence, bbox}]}
        all_ground_truths: {image_id: [{class_name, bbox, difficult}]}
        class_names: List of class names to evaluate
        iou_thresholds: IoU thresholds for mAP computation. Default: [0.5]

    Returns:
        {
            mAP_50: float,
            mAP_50_95: float,
            per_class_ap: {class_name: float},
            pr_curves: {class_name: [{precision, recall}]},
            total_predictions: int,
            total_ground_truths: int
        }
    """
    if iou_thresholds is None:
        iou_thresholds = [0.5]

    results_by_threshold = {}

    for iou_thresh in iou_thresholds:
        per_class_ap = {}
        pr_curves = {}

        for class_name in class_names:
            # Gather all predictions and GTs for this class across all images
            class_preds = []  # (confidence, tp_flag)
            total_gt = 0

            for image_id in set(list(all_predictions.keys()) + list(all_ground_truths.keys())):
                # Get predictions for this class in this image
                img_preds = [p for p in all_predictions.get(image_id, [])
                             if p["class_name"].lower() == class_name.lower()]
                img_preds.sort(key=lambda x: x["confidence"], reverse=True)

                # Get GTs for this class in this image
                img_gts = [g for g in all_ground_truths.get(image_id, [])
                           if g["class_name"].lower() == class_name.lower()]

                # Match predictions to GT
                tp_flags, n_gt = match_predictions_to_gt(img_preds, img_gts, iou_thresh)
                total_gt += n_gt

                for i, is_tp in enumerate(tp_flags):
                    class_preds.append((img_preds[i]["confidence"], is_tp))

            if total_gt == 0:
                per_class_ap[class_name] = 0.0
                pr_curves[class_name] = []
                continue

            # Sort all predictions by confidence descending
            class_preds.sort(key=lambda x: x[0], reverse=True)

            # Compute cumulative TP and FP
            tp_cumsum = np.zeros(len(class_preds))
            fp_cumsum = np.zeros(len(class_preds))

            for i, (conf, is_tp) in enumerate(class_preds):
                tp_cumsum[i] = (tp_cumsum[i - 1] if i > 0 else 0) + (1 if is_tp else 0)
                fp_cumsum[i] = (fp_cumsum[i - 1] if i > 0 else 0) + (0 if is_tp else 1)

            precisions = tp_cumsum / np.maximum(tp_cumsum + fp_cumsum, np.finfo(np.float64).eps)
            recalls = tp_cumsum / total_gt

            # Compute AP
            ap = compute_ap(precisions, recalls)
            per_class_ap[class_name] = ap

            # Store PR curve (subsample for API response)
            curve_points = []
            step = max(1, len(precisions) // 50)  # Max 50 points
            for i in range(0, len(precisions), step):
                curve_points.append({
                    "precision": float(precisions[i]),
                    "recall": float(recalls[i]),
                    "confidence": float(class_preds[i][0])
                })
            # Add last point
            if len(precisions) > 0:
                 curve_points.append({
                    "precision": float(precisions[-1]),
                    "recall": float(recalls[-1]),
                    "confidence": float(class_preds[-1][0])
                })
            pr_curves[class_name] = curve_points

        # Compute mAP
        valid_aps = [ap for ap in per_class_ap.values() if ap > 0]
        mAP = float(np.mean(valid_aps)) if valid_aps else 0.0

        results_by_threshold[iou_thresh] = {
            "mAP": mAP,
            "per_class_ap": per_class_ap,
            "pr_curves": pr_curves
        }

    # Aggregate
    mAP_50 = results_by_threshold.get(0.5, {}).get("mAP", 0.0)

    # Compute aggregate Precision/Recall across all classes
    # This is more accurate for the dashboard than per-class averages
    total_tp = 0
    total_fp = 0
    for threshold_data in results_by_threshold.values():
         # Placeholder for threshold-specific aggregation if needed
         pass
    
    # We use 0.5 threshold for the primary aggregate
    r50 = results_by_threshold.get(0.5, {})
    all_class_preds = []
    total_gt_all = 0
    
    # Re-computing aggregate P/R for the entire model across all classes
    for class_name in class_names:
        per_img_matches = []
        for image_id in set(list(all_predictions.keys()) + list(all_ground_truths.keys())):
            img_preds = [p for p in all_predictions.get(image_id, [])
                         if p["class_name"].lower() == class_name.lower()]
            img_gts = [g for g in all_ground_truths.get(image_id, [])
                       if g["class_name"].lower() == class_name.lower()]
            tp_f, n_g = match_predictions_to_gt(img_preds, img_gts, 0.5)
            total_gt_all += n_g
            total_tp += sum(1 for f in tp_f if f)
            total_fp += sum(1 for f in tp_f if not f)

    agg_precision = total_tp / max(1, total_tp + total_fp)
    agg_recall = total_tp / max(1, total_gt_all)

    # mAP@0.5:0.95 if we have multiple thresholds
    if len(iou_thresholds) > 1:
        mAP_50_95 = float(np.mean([r["mAP"] for r in results_by_threshold.values()]))
    else:
        mAP_50_95 = mAP_50

    total_preds = sum(len(v) for v in all_predictions.values())
    total_gts = sum(
        sum(1 for g in v if not g.get("difficult", 0))
        for v in all_ground_truths.values()
    )

    return {
        "mAP_50": mAP_50,
        "mAP_50_95": mAP_50_95,
        "aggregate_precision": round(agg_precision, 4),
        "aggregate_recall": round(agg_recall, 4),
        "per_class_ap": results_by_threshold.get(0.5, {}).get("per_class_ap", {}),
        "pr_curves": results_by_threshold.get(0.5, {}).get("pr_curves", {}),
        "total_predictions": total_preds,
        "total_ground_truths": total_gts,
        "iou_thresholds_used": iou_thresholds,
    }
