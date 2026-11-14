"""Tune and calibrate routing uncertainty thresholds on out-of-fold validation predictions.

Runs strictly on ml/data/train_dev_set.csv.
Finds optimal (confidence_threshold, margin_threshold) operating point
for precision >= 95% with maximal routing coverage.
"""
from __future__ import annotations

import csv
import json
import numpy as np
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold
from scipy.special import softmax

ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "data" / "train_dev_set.csv"

def main():
    rows = list(csv.DictReader(DATA_PATH.open(encoding="utf-8")))
    texts = [r["text"] for r in rows]
    labels = [r["department_id"] for r in rows]
    
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=20261115)
    
    oof_preds = []
    oof_true = []
    oof_conf = []
    oof_margin = []
    
    for tr, va in skf.split(texts, labels):
        vec = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), max_features=5000, lowercase=True)
        x_tr = vec.fit_transform([texts[i] for i in tr])
        x_va = vec.transform([texts[i] for i in va])
        clf = LogisticRegression(C=4.0, max_iter=1000, random_state=42)
        clf.fit(x_tr, [labels[i] for i in tr])
        
        scores = clf.decision_function(x_va)
        probs = softmax(scores, axis=1)
        
        for idx, (p, s) in enumerate(zip(probs, scores)):
            sorted_indices = np.argsort(s)[::-1]
            top1_idx = sorted_indices[0]
            top2_idx = sorted_indices[1]
            top1_class = clf.classes_[top1_idx]
            conf = p[top1_idx]
            margin = s[top1_idx] - s[top2_idx]
            
            oof_preds.append(top1_class)
            oof_true.append(labels[va[idx]])
            oof_conf.append(conf)
            oof_margin.append(margin)
            
    oof_correct = np.array([p == t for p, t in zip(oof_preds, oof_true)])
    oof_conf = np.array(oof_conf)
    oof_margin = np.array(oof_margin)
    
    print(f"Overall Out-of-Fold Accuracy (Raw): {np.mean(oof_correct)*100:.2f}% ({np.sum(oof_correct)}/600)")
    
    print("\nCandidate Operating Points (Precision >= 95.0% and Coverage >= 75.0%):")
    print(f"{'Conf Thresh':<12} | {'Margin Thresh':<14} | {'Coverage':<10} | {'Auto-Routed':<12} | {'Auto-Route Precision':<22} | {'Review Count':<12}")
    print("-" * 95)
    
    operating_points = []
    
    for conf_th in np.arange(0.35, 0.75, 0.05):
        for marg_th in np.arange(0.10, 0.55, 0.05):
            mask = (oof_conf >= conf_th) & (oof_margin >= marg_th)
            n_auto = int(np.sum(mask))
            coverage = float(n_auto / len(oof_correct))
            precision = float(np.sum(oof_correct[mask]) / n_auto) if n_auto > 0 else 1.0
            n_review = int(len(oof_correct) - n_auto)
            
            operating_points.append({
                "confidence_threshold": round(float(conf_th), 2),
                "margin_threshold": round(float(marg_th), 2),
                "coverage": round(coverage, 4),
                "precision": round(precision, 4),
                "n_auto": n_auto,
                "n_review": n_review,
            })
            
            if precision >= 0.95 and coverage >= 0.75:
                print(f"{conf_th:<12.2f} | {marg_th:<14.2f} | {coverage*100:<9.1f}% | {n_auto:<12} | {precision*100:<21.2f}% | {n_review:<12}")

    # Find optimal operating point: max coverage subject to precision >= 96%
    candidates = [p for p in operating_points if p["precision"] >= 0.96]
    candidates.sort(key=lambda p: (p["coverage"], p["precision"]), reverse=True)
    best = candidates[0] if candidates else operating_points[0]
    
    print("\n--- Selected Optimal Operating Point (Precision >= 96%) ---")
    print(f"Confidence Threshold: {best['confidence_threshold']:.2f}")
    print(f"Margin Threshold    : {best['margin_threshold']:.2f}")
    print(f"Routing Coverage    : {best['coverage']*100:.2f}% ({best['n_auto']}/600)")
    print(f"Auto-Route Precision: {best['precision']*100:.2f}%")
    print(f"Flagged for Review  : {best['n_review']} / 600 ({best['n_review']/600*100:.1f}%)")
    
    (ROOT / "threshold_calibration.json").write_text(json.dumps({
        "optimal_point": best,
        "all_points": operating_points,
    }, indent=2), encoding="utf-8")
    print(f"\nSaved threshold calibration results to {ROOT / 'threshold_calibration.json'}")

if __name__ == "__main__":
    main()
