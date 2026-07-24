#!/usr/bin/env python3
"""
Model Evaluation Script for Motorcycle Diagnostic YOLOv8 Model
Evaluates trained model performance and generates detailed reports
"""

import os
import cv2
import json
import yaml
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from typing import List, Dict, Tuple, Optional
import torch
from ultralytics import YOLO
from sklearn.metrics import confusion_matrix, classification_report
import pandas as pd

class MotorcycleModelEvaluator:
    """Evaluator for motorcycle diagnostic YOLOv8 model"""
    
    def __init__(self, model_path: str, dataset_config_path: str):
        self.model_path = Path(model_path)
        self.dataset_config_path = Path(dataset_config_path)
        
        # Load model
        self.model = YOLO(str(self.model_path))
        
        # Load dataset configuration
        with open(self.dataset_config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        self.class_names = self.config['names']
        self.num_classes = self.config['nc']
        
        # Initialize evaluation metrics
        self.evaluation_results = {}
        self.confusion_matrices = {}
        self.class_metrics = {}
    
    def evaluate_on_dataset(self, split: str = 'val') -> Dict:
        """Evaluate model on dataset split"""
        print(f"🔍 Evaluating model on {split} split...")
        
        # Get dataset paths
        images_dir = Path(self.config['path']) / self.config[split]
        labels_dir = Path(self.config['path']) / 'labels' / split
        
        if not images_dir.exists() or not labels_dir.exists():
            raise ValueError(f"Dataset split '{split}' not found")
        
        # Initialize metrics
        total_images = 0
        total_detections = 0
        total_ground_truth = 0
        correct_detections = 0
        
        # Per-class metrics
        class_tp = np.zeros(self.num_classes)
        class_fp = np.zeros(self.num_classes)
        class_fn = np.zeros(self.num_classes)
        
        # Detection results
        detection_results = []
        
        # Process each image
        for image_path in images_dir.glob('*'):
            if image_path.suffix.lower() not in ['.jpg', '.jpeg', '.png', '.bmp']:
                continue
            
            # Load ground truth
            label_path = labels_dir / f"{image_path.stem}.txt"
            ground_truth = self._load_ground_truth(label_path)
            
            # Run inference
            results = self.model(str(image_path))
            predictions = self._parse_predictions(results[0])
            
            # Calculate metrics
            image_metrics = self._calculate_image_metrics(ground_truth, predictions)
            
            # Update totals
            total_images += 1
            total_detections += len(predictions)
            total_ground_truth += len(ground_truth)
            correct_detections += image_metrics['correct_detections']
            
            # Update per-class metrics
            for class_id in range(self.num_classes):
                class_tp[class_id] += image_metrics['class_tp'][class_id]
                class_fp[class_id] += image_metrics['class_fp'][class_id]
                class_fn[class_id] += image_metrics['class_fn'][class_id]
            
            # Store detection results
            detection_results.append({
                'image': image_path.name,
                'ground_truth': ground_truth,
                'predictions': predictions,
                'metrics': image_metrics
            })
        
        # Calculate overall metrics
        precision = correct_detections / total_detections if total_detections > 0 else 0
        recall = correct_detections / total_ground_truth if total_ground_truth > 0 else 0
        f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        # Calculate per-class metrics
        class_precision = np.zeros(self.num_classes)
        class_recall = np.zeros(self.num_classes)
        class_f1 = np.zeros(self.num_classes)
        
        for class_id in range(self.num_classes):
            if class_tp[class_id] + class_fp[class_id] > 0:
                class_precision[class_id] = class_tp[class_id] / (class_tp[class_id] + class_fp[class_id])
            if class_tp[class_id] + class_fn[class_id] > 0:
                class_recall[class_id] = class_tp[class_id] / (class_tp[class_id] + class_fn[class_id])
            if class_precision[class_id] + class_recall[class_id] > 0:
                class_f1[class_id] = 2 * (class_precision[class_id] * class_recall[class_id]) / \
                                   (class_precision[class_id] + class_recall[class_id])
        
        # Store results
        self.evaluation_results[split] = {
            'total_images': total_images,
            'total_detections': total_detections,
            'total_ground_truth': total_ground_truth,
            'correct_detections': correct_detections,
            'precision': precision,
            'recall': recall,
            'f1_score': f1_score,
            'class_precision': class_precision.tolist(),
            'class_recall': class_recall.tolist(),
            'class_f1': class_f1.tolist(),
            'class_tp': class_tp.tolist(),
            'class_fp': class_fp.tolist(),
            'class_fn': class_fn.tolist(),
            'detection_results': detection_results
        }
        
        print(f"✅ Evaluation complete for {split} split")
        print(f"   Images: {total_images}")
        print(f"   Precision: {precision:.3f}")
        print(f"   Recall: {recall:.3f}")
        print(f"   F1-Score: {f1_score:.3f}")
        
        return self.evaluation_results[split]
    
    def _load_ground_truth(self, label_path: Path) -> List[Dict]:
        """Load ground truth annotations"""
        ground_truth = []
        
        if not label_path.exists():
            return ground_truth
        
        with open(label_path, 'r') as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) == 5:
                    ground_truth.append({
                        'class_id': int(parts[0]),
                        'x_center': float(parts[1]),
                        'y_center': float(parts[2]),
                        'width': float(parts[3]),
                        'height': float(parts[4])
                    })
        
        return ground_truth
    
    def _parse_predictions(self, result) -> List[Dict]:
        """Parse YOLO prediction results"""
        predictions = []
        
        if result.boxes is not None:
            boxes = result.boxes
            for i in range(len(boxes)):
                predictions.append({
                    'class_id': int(boxes.cls[i]),
                    'confidence': float(boxes.conf[i]),
                    'x_center': float(boxes.xywh[i][0] / result.orig_shape[1]),
                    'y_center': float(boxes.xywh[i][1] / result.orig_shape[0]),
                    'width': float(boxes.xywh[i][2] / result.orig_shape[1]),
                    'height': float(boxes.xywh[i][3] / result.orig_shape[0])
                })
        
        return predictions
    
    def _calculate_image_metrics(self, ground_truth: List[Dict], predictions: List[Dict], 
                                iou_threshold: float = 0.5) -> Dict:
        """Calculate metrics for a single image"""
        # Initialize metrics
        class_tp = np.zeros(self.num_classes)
        class_fp = np.zeros(self.num_classes)
        class_fn = np.zeros(self.num_classes)
        correct_detections = 0
        
        # Create ground truth matrix
        gt_matrix = np.array([[gt['x_center'], gt['y_center'], gt['width'], gt['height']] 
                             for gt in ground_truth])
        gt_classes = [gt['class_id'] for gt in ground_truth]
        
        # Create prediction matrix
        pred_matrix = np.array([[pred['x_center'], pred['y_center'], pred['width'], pred['height']] 
                               for pred in predictions])
        pred_classes = [pred['class_id'] for pred in predictions]
        pred_confidences = [pred['confidence'] for pred in predictions]
        
        # Calculate IoU matrix
        if len(gt_matrix) > 0 and len(pred_matrix) > 0:
            iou_matrix = self._calculate_iou_matrix(gt_matrix, pred_matrix)
            
            # Match predictions to ground truth
            matched_gt = set()
            matched_pred = set()
            
            # Sort predictions by confidence
            pred_indices = sorted(range(len(predictions)), 
                                key=lambda i: pred_confidences[i], reverse=True)
            
            for pred_idx in pred_indices:
                best_iou = 0
                best_gt_idx = -1
                
                for gt_idx in range(len(ground_truth)):
                    if gt_idx in matched_gt:
                        continue
                    
                    iou = iou_matrix[gt_idx, pred_idx]
                    if iou > best_iou and iou >= iou_threshold:
                        best_iou = iou
                        best_gt_idx = gt_idx
                
                if best_gt_idx != -1:
                    # True positive
                    gt_class = gt_classes[best_gt_idx]
                    pred_class = pred_classes[pred_idx]
                    
                    if gt_class == pred_class:
                        class_tp[gt_class] += 1
                        correct_detections += 1
                    else:
                        class_fp[pred_class] += 1
                        class_fn[gt_class] += 1
                    
                    matched_gt.add(best_gt_idx)
                    matched_pred.add(pred_idx)
                else:
                    # False positive
                    class_fp[pred_classes[pred_idx]] += 1
            
            # False negatives (unmatched ground truth)
            for gt_idx in range(len(ground_truth)):
                if gt_idx not in matched_gt:
                    class_fn[gt_classes[gt_idx]] += 1
        
        return {
            'correct_detections': correct_detections,
            'class_tp': class_tp,
            'class_fp': class_fp,
            'class_fn': class_fn
        }
    
    def _calculate_iou_matrix(self, gt_boxes: np.ndarray, pred_boxes: np.ndarray) -> np.ndarray:
        """Calculate IoU matrix between ground truth and prediction boxes"""
        iou_matrix = np.zeros((len(gt_boxes), len(pred_boxes)))
        
        for i, gt_box in enumerate(gt_boxes):
            for j, pred_box in enumerate(pred_boxes):
                iou_matrix[i, j] = self._calculate_iou(gt_box, pred_box)
        
        return iou_matrix
    
    def _calculate_iou(self, box1: np.ndarray, box2: np.ndarray) -> float:
        """Calculate Intersection over Union (IoU) between two boxes"""
        # Convert from center format to corner format
        x1_1 = box1[0] - box1[2] / 2
        y1_1 = box1[1] - box1[3] / 2
        x2_1 = box1[0] + box1[2] / 2
        y2_1 = box1[1] + box1[3] / 2
        
        x1_2 = box2[0] - box2[2] / 2
        y1_2 = box2[1] - box2[3] / 2
        x2_2 = box2[0] + box2[2] / 2
        y2_2 = box2[1] + box2[3] / 2
        
        # Calculate intersection
        x1_i = max(x1_1, x1_2)
        y1_i = max(y1_1, y1_2)
        x2_i = min(x2_1, x2_2)
        y2_i = min(y2_1, y2_2)
        
        if x2_i <= x1_i or y2_i <= y1_i:
            return 0.0
        
        intersection = (x2_i - x1_i) * (y2_i - y1_i)
        
        # Calculate union
        area1 = (x2_1 - x1_1) * (y2_1 - y1_1)
        area2 = (x2_2 - x1_2) * (y2_2 - y1_2)
        union = area1 + area2 - intersection
        
        return intersection / union if union > 0 else 0.0
    
    def generate_confusion_matrix(self, split: str = 'val'):
        """Generate confusion matrix for the evaluation"""
        if split not in self.evaluation_results:
            raise ValueError(f"No evaluation results for split '{split}'")
        
        results = self.evaluation_results[split]
        
        # Create confusion matrix data
        cm_data = np.zeros((self.num_classes, self.num_classes))
        
        for result in results['detection_results']:
            for gt in result['ground_truth']:
                gt_class = gt['class_id']
                
                # Find best matching prediction
                best_iou = 0
                best_pred_class = -1
                
                for pred in result['predictions']:
                    iou = self._calculate_iou(
                        np.array([gt['x_center'], gt['y_center'], gt['width'], gt['height']]),
                        np.array([pred['x_center'], pred['y_center'], pred['width'], pred['height']])
                    )
                    
                    if iou > best_iou and iou >= 0.5:
                        best_iou = iou
                        best_pred_class = pred['class_id']
                
                if best_pred_class != -1:
                    cm_data[gt_class, best_pred_class] += 1
                else:
                    # False negative
                    cm_data[gt_class, gt_class] += 0  # This will be handled by FN calculation
        
        self.confusion_matrices[split] = cm_data
        return cm_data
    
    def plot_confusion_matrix(self, split: str = 'val', save_path: Optional[Path] = None):
        """Plot confusion matrix"""
        if split not in self.confusion_matrices:
            self.generate_confusion_matrix(split)
        
        cm_data = self.confusion_matrices[split]
        
        plt.figure(figsize=(15, 12))
        sns.heatmap(cm_data, annot=True, fmt='d', cmap='Blues',
                   xticklabels=self.class_names, yticklabels=self.class_names)
        plt.title(f'Confusion Matrix - {split.upper()} Split')
        plt.xlabel('Predicted Class')
        plt.ylabel('True Class')
        plt.xticks(rotation=45, ha='right')
        plt.yticks(rotation=0)
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
        
        plt.show()
    
    def plot_class_metrics(self, split: str = 'val', save_path: Optional[Path] = None):
        """Plot per-class precision, recall, and F1-score"""
        if split not in self.evaluation_results:
            raise ValueError(f"No evaluation results for split '{split}'")
        
        results = self.evaluation_results[split]
        
        # Create DataFrame
        df = pd.DataFrame({
            'Class': self.class_names,
            'Precision': results['class_precision'],
            'Recall': results['class_recall'],
            'F1-Score': results['class_f1']
        })
        
        # Plot
        fig, axes = plt.subplots(1, 3, figsize=(20, 6))
        
        metrics = ['Precision', 'Recall', 'F1-Score']
        colors = ['skyblue', 'lightcoral', 'lightgreen']
        
        for i, (metric, color) in enumerate(zip(metrics, colors)):
            ax = axes[i]
            bars = ax.bar(range(len(df)), df[metric], color=color, alpha=0.7)
            ax.set_title(f'{metric} by Class')
            ax.set_xlabel('Class')
            ax.set_ylabel(metric)
            ax.set_xticks(range(len(df)))
            ax.set_xticklabels(df['Class'], rotation=45, ha='right')
            ax.set_ylim(0, 1)
            
            # Add value labels on bars
            for bar, value in zip(bars, df[metric]):
                height = bar.get_height()
                ax.text(bar.get_x() + bar.get_width()/2., height + 0.01,
                       f'{value:.3f}', ha='center', va='bottom', fontsize=8)
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
        
        plt.show()
    
    def generate_evaluation_report(self, output_path: Path):
        """Generate comprehensive evaluation report"""
        print("📊 Generating evaluation report...")
        
        report = {
            'model_info': {
                'model_path': str(self.model_path),
                'dataset_config': str(self.dataset_config_path),
                'num_classes': self.num_classes,
                'class_names': self.class_names
            },
            'evaluation_results': self.evaluation_results,
            'confusion_matrices': {k: v.tolist() for k, v in self.confusion_matrices.items()}
        }
        
        # Save JSON report
        json_path = output_path / 'evaluation_report.json'
        with open(json_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        # Generate summary
        summary_path = output_path / 'evaluation_summary.txt'
        with open(summary_path, 'w') as f:
            f.write("MOTORCYCLE DIAGNOSTIC MODEL EVALUATION REPORT\n")
            f.write("=" * 50 + "\n\n")
            
            for split, results in self.evaluation_results.items():
                f.write(f"{split.upper()} SPLIT RESULTS:\n")
                f.write(f"  Total Images: {results['total_images']}\n")
                f.write(f"  Total Detections: {results['total_detections']}\n")
                f.write(f"  Total Ground Truth: {results['total_ground_truth']}\n")
                f.write(f"  Correct Detections: {results['correct_detections']}\n")
                f.write(f"  Precision: {results['precision']:.3f}\n")
                f.write(f"  Recall: {results['recall']:.3f}\n")
                f.write(f"  F1-Score: {results['f1_score']:.3f}\n\n")
                
                # Top performing classes
                f.write("TOP PERFORMING CLASSES (F1-Score):\n")
                class_f1 = list(zip(self.class_names, results['class_f1']))
                class_f1.sort(key=lambda x: x[1], reverse=True)
                for class_name, f1 in class_f1[:10]:
                    f.write(f"  {class_name}: {f1:.3f}\n")
                
                f.write("\n" + "-" * 30 + "\n\n")
        
        print(f"✅ Evaluation report saved to: {output_path}")
        return report

def main():
    """Main evaluation function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Evaluate motorcycle diagnostic YOLOv8 model')
    parser.add_argument('--model', type=str, required=True, help='Path to trained model')
    parser.add_argument('--config', type=str, required=True, help='Path to dataset config')
    parser.add_argument('--splits', nargs='+', default=['val'], help='Dataset splits to evaluate')
    parser.add_argument('--output', type=str, default='evaluation_results', help='Output directory')
    parser.add_argument('--plots', action='store_true', help='Generate plots')
    
    args = parser.parse_args()
    
    try:
        # Create output directory
        output_dir = Path(args.output)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize evaluator
        evaluator = MotorcycleModelEvaluator(args.model, args.config)
        
        # Evaluate on specified splits
        for split in args.splits:
            print(f"\n🔍 Evaluating on {split} split...")
            evaluator.evaluate_on_dataset(split)
            
            if args.plots:
                # Generate confusion matrix
                evaluator.plot_confusion_matrix(split, output_dir / f'confusion_matrix_{split}.png')
                
                # Generate class metrics plot
                evaluator.plot_class_metrics(split, output_dir / f'class_metrics_{split}.png')
        
        # Generate comprehensive report
        evaluator.generate_evaluation_report(output_dir)
        
        print("\n🎉 Evaluation completed successfully!")
        
    except Exception as e:
        print(f"❌ Evaluation failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
