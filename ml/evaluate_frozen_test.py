"""Final Evaluation of Winning Model on Frozen Independent Test Set (180 samples).

Strictly evaluates on ml/data/frozen_test_set.csv.
Computes:
1. Overall Accuracy and Macro-F1.
2. Per-class Precision, Recall, F1, and Support.
3. 6x6 Confusion Matrix.
4. 95% Bootstrap Confidence Intervals (1,000 resamples).
5. Per-source-type breakdown (genuine, colloquial, edge_case, negation).
6. Complete error analysis of all misclassifications.
7. Auto-routing precision vs coverage under calibrated thresholds.
"""
from __future__ import annotations

import csv
import json
import numpy as np
from pathlib import Path
from collections import Counter, defaultdict
from scipy.special import softmax

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score

ROOT = Path(__file__).resolve().parent
TRAIN_PATH = ROOT / "data" / "train_dev_set.csv"
TEST_PATH = ROOT / "data" / "frozen_test_set.csv"

def bootstrap_ci(y_true: list[str], y_pred: list[str], n_bootstraps: int = 1000, seed: int = 20261115):
    rng = np.random.RandomState(seed)
    n = len(y_true)
    accs, f1s = [], []
    for _ in range(n_bootstraps):
        indices = rng.choice(n, size=n, replace=True)
        sample_true = [y_true[i] for i in indices]
        sample_pred = [y_pred[i] for i in indices]
        accs.append(accuracy_score(sample_true, sample_pred))
        f1s.append(f1_score(sample_true, sample_pred, average="macro"))
        
    return {
        "acc_mean": float(np.mean(accs)),
        "acc_ci_lower": float(np.percentile(accs, 2.5)),
        "acc_ci_upper": float(np.percentile(accs, 97.5)),
        "f1_mean": float(np.mean(f1s)),
        "f1_ci_lower": float(np.percentile(f1s, 2.5)),
        "f1_ci_upper": float(np.percentile(f1s, 97.5)),
    }

def main():
    train_rows = list(csv.DictReader(TRAIN_PATH.open(encoding="utf-8")))
    test_rows = list(csv.DictReader(TEST_PATH.open(encoding="utf-8")))
    
    print(f"Loaded {len(train_rows)} train rows and {len(test_rows)} frozen test rows.")
    
    x_train = [r["text"] for r in train_rows]
    y_train = [r["department_id"] for r in train_rows]
    
    x_test = [r["text"] for r in test_rows]
    y_test = [r["department_id"] for r in test_rows]
    source_types = [r["source_type"] for r in test_rows]
    
    # Fit vectorizer and classifier on 600 train samples
    vectorizer = TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=(3, 5),
        max_features=5000,
        lowercase=True,
    )
    x_train_vec = vectorizer.fit_transform(x_train)
    x_test_vec = vectorizer.transform(x_test)
    
    classifier = LogisticRegression(C=4.0, max_iter=1000, random_state=42)
    classifier.fit(x_train_vec, y_train)
    
    # Predict on frozen test
    scores = classifier.decision_function(x_test_vec)
    probs = softmax(scores, axis=1)
    
    y_pred = []
    confidences = []
    margins = []
    
    for s, p in zip(scores, probs):
        sorted_indices = np.argsort(s)[::-1]
        top1_idx = sorted_indices[0]
        top2_idx = sorted_indices[1]
        y_pred.append(classifier.classes_[top1_idx])
        confidences.append(float(p[top1_idx]))
        margins.append(float(s[top1_idx] - s[top2_idx]))
        
    acc = accuracy_score(y_test, y_pred)
    macro_f1 = f1_score(y_test, y_pred, average="macro")
    cr = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    cm = confusion_matrix(y_test, y_pred, labels=classifier.classes_).tolist()
    
    ci = bootstrap_ci(y_test, y_pred, n_bootstraps=1000)
    
    print("\n" + "=" * 70)
    print("=== FROZEN INDEPENDENT TEST SET EVALUATION RESULTS (180 SAMPLES) ===")
    print("=" * 70)
    print(f"Overall Accuracy: {acc*100:.2f}%  (95% CI: [{ci['acc_ci_lower']*100:.2f}%, {ci['acc_ci_upper']*100:.2f}%])")
    print(f"Macro-F1 Score  : {macro_f1:.4f}  (95% CI: [{ci['f1_ci_lower']:.4f}, {ci['f1_ci_upper']:.4f}])")
    
    print("\nPer-Class Metrics:")
    print(f"{'Class':<12} | {'Precision':<10} | {'Recall':<10} | {'F1-Score':<10} | {'Support':<8}")
    print("-" * 58)
    for cls in classifier.classes_:
        m = cr[cls]
        print(f"{cls:<12} | {m['precision']*100:<9.2f}% | {m['recall']*100:<9.2f}% | {m['f1-score']:<10.4f} | {int(m['support']):<8}")
        
    print("\nConfusion Matrix (Rows=True, Columns=Predicted):")
    print(f"{'True \\ Pred':<12} | " + " | ".join(f"{c:>8}" for c in classifier.classes_))
    print("-" * 72)
    for i, row in enumerate(cm):
        print(f"{classifier.classes_[i]:<12} | " + " | ".join(f"{val:8d}" for val in row))
        
    # Breakdown by source type
    type_metrics = {}
    print("\nBreakdown by Source Type:")
    print(f"{'Source Type':<20} | {'Count':<6} | {'Correct':<8} | {'Accuracy':<10} | {'Macro-F1':<10}")
    print("-" * 62)
    for stype in sorted(set(source_types)):
        indices = [i for i, t in enumerate(source_types) if t == stype]
        st_true = [y_test[i] for i in indices]
        st_pred = [y_pred[i] for i in indices]
        st_acc = accuracy_score(st_true, st_pred)
        st_f1 = f1_score(st_true, st_pred, average="macro", zero_division=0)
        st_correct = sum(1 for yt, yp in zip(st_true, st_pred) if yt == yp)
        type_metrics[stype] = {
            "count": len(indices),
            "correct": st_correct,
            "accuracy": round(st_acc, 4),
            "macro_f1": round(st_f1, 4),
        }
        print(f"{stype:<20} | {len(indices):<6} | {st_correct:<8} | {st_acc*100:<9.2f}% | {st_f1:<10.4f}")
        
    # Error Analysis
    errors = []
    print("\nDetailed Error Analysis of Misclassified Test Samples:")
    print("-" * 70)
    for idx, (yt, yp, conf, marg, txt, stype) in enumerate(zip(y_test, y_pred, confidences, margins, x_test, source_types)):
        if yt != yp:
            err = {
                "index": idx,
                "text": txt,
                "true_department": yt,
                "predicted_department": yp,
                "confidence": round(conf, 4),
                "margin": round(marg, 4),
                "source_type": stype,
                "needs_review_at_050": conf < 0.50 or marg < 0.10,
                "needs_review_at_055": conf < 0.55 or marg < 0.15,
            }
            errors.append(err)
            print(f"[{len(errors)}] TRUE: {yt:<9} PREDICTED: {yp:<9} CONF: {conf:.3f} MARGIN: {marg:.3f} TYPE: {stype}")
            print(f"    Text: \"{txt}\"")
            print(f"    Caught by review threshold: 0.50/0.10 -> {err['needs_review_at_050']}, 0.55/0.15 -> {err['needs_review_at_055']}")
            
    print(f"\nTotal Errors on 180 Frozen Samples: {len(errors)} / 180 (Error rate: {len(errors)/180*100:.2f}%)")
    
    # Auto-routing under calibrated threshold (0.50 conf, 0.15 margin)
    for conf_t, marg_t in [(0.50, 0.10), (0.50, 0.15), (0.55, 0.15)]:
        auto_mask = [(c >= conf_t and m >= marg_t) for c, m in zip(confidences, margins)]
        n_auto = sum(auto_mask)
        auto_correct = sum(1 for i, m in enumerate(auto_mask) if m and y_test[i] == y_pred[i])
        auto_precision = auto_correct / n_auto if n_auto > 0 else 1.0
        coverage = n_auto / len(y_test)
        n_flagged = len(y_test) - n_auto
        flagged_errors = sum(1 for i, m in enumerate(auto_mask) if not m and y_test[i] != y_pred[i])
        print(f"\nRouting Policy [Conf >= {conf_t:.2f}, Margin >= {marg_t:.2f}]:")
        print(f"  Coverage        : {coverage*100:.2f}% ({n_auto}/180)")
        print(f"  Auto-Precision  : {auto_precision*100:.2f}% ({auto_correct}/{n_auto})")
        print(f"  Review Queue    : {n_flagged}/180 ({n_flagged/180*100:.1f}%)")
        print(f"  Errors Caught   : {flagged_errors} / {len(errors)} errors routed safely to human review!")
        
    # Save artifacts
    results_artifact = {
        "model": "TfidfVectorizer(analyzer=char_wb, ngram_range=(3,5), max_features=5000) + LogisticRegression(C=4.0)",
        "train_samples": len(train_rows),
        "test_samples": len(test_rows),
        "overall_accuracy": round(acc, 4),
        "macro_f1": round(macro_f1, 4),
        "bootstrap_ci_95": ci,
        "per_class_metrics": {
            cls: {
                "precision": round(cr[cls]["precision"], 4),
                "recall": round(cr[cls]["recall"], 4),
                "f1_score": round(cr[cls]["f1-score"], 4),
                "support": int(cr[cls]["support"]),
            }
            for cls in classifier.classes_
        },
        "confusion_matrix": cm,
        "classes": list(classifier.classes_),
        "source_type_metrics": type_metrics,
        "error_count": len(errors),
        "errors": errors,
    }
    
    (ROOT / "evaluation_frozen_test.json").write_text(json.dumps(results_artifact, indent=2), encoding="utf-8")
    print(f"\nSaved evaluation artifact to {ROOT / 'evaluation_frozen_test.json'}")

if __name__ == "__main__":
    main()
