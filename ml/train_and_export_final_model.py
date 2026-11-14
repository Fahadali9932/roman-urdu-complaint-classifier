"""Train, evaluate, and export the Phase 3C Roman Urdu Complaint Classifier.

Model Architecture:
- Vectorizer: TfidfVectorizer(analyzer='word', ngram_range=(1, 2), max_features=3000, lowercase=True)
- Classifier: LogisticRegression(C=5.0, max_iter=1000, random_state=42)
- Target performance on Frozen Test Set: >= 90.0% accuracy, ~0.90 Macro-F1.

Artifacts produced:
- ml/model.json
- ml/evaluation_frozen_test.json
- ml/parity_verification.json
"""
from __future__ import annotations

import csv
import json
import numpy as np
from pathlib import Path
from collections import Counter
from scipy.special import softmax

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score

ROOT = Path(__file__).resolve().parent
TRAIN_PATH = ROOT / "data" / "train_dev_set.csv"
TEST_PATH = ROOT / "data" / "frozen_test_set.csv"

def bootstrap_ci(y_true, y_pred, n_bootstraps=1000, seed=20261115):
    rng = np.random.RandomState(seed)
    n = len(y_true)
    accs, f1s = [], []
    for _ in range(n_bootstraps):
        idx = rng.choice(n, size=n, replace=True)
        accs.append(accuracy_score([y_true[i] for i in idx], [y_pred[i] for i in idx]))
        f1s.append(f1_score([y_true[i] for i in idx], [y_pred[i] for i in idx], average="macro"))
    return {
        "acc_mean": float(np.mean(accs)),
        "acc_ci": [float(np.percentile(accs, 2.5)), float(np.percentile(accs, 97.5))],
        "f1_mean": float(np.mean(f1s)),
        "f1_ci": [float(np.percentile(f1s, 2.5)), float(np.percentile(f1s, 97.5))],
    }

def main():
    train_rows = list(csv.DictReader(TRAIN_PATH.open(encoding="utf-8")))
    test_rows = list(csv.DictReader(TEST_PATH.open(encoding="utf-8")))
    
    print(f"Loaded {len(train_rows)} training samples and {len(test_rows)} frozen test samples.")
    
    x_tr = [r["text"] for r in train_rows]
    y_tr = [r["department_id"] for r in train_rows]
    x_te = [r["text"] for r in test_rows]
    y_te = [r["department_id"] for r in test_rows]
    test_types = [r["source_type"] for r in test_rows]
    
    # 1. Fit Vectorizer and Classifier
    vec = TfidfVectorizer(analyzer="word", ngram_range=(1, 2), max_features=3000, lowercase=True)
    x_tr_v = vec.fit_transform(x_tr)
    x_te_v = vec.transform(x_te)
    
    clf = LogisticRegression(C=5.0, max_iter=1000, random_state=42)
    clf.fit(x_tr_v, y_tr)
    
    # 2. Evaluate on Frozen Test Set
    scores = clf.decision_function(x_te_v)
    probs = softmax(scores, axis=1)
    
    y_pred, confidences, margins = [], [], []
    for s, p in zip(scores, probs):
        sorted_indices = np.argsort(s)[::-1]
        top1_idx = sorted_indices[0]
        top2_idx = sorted_indices[1]
        y_pred.append(clf.classes_[top1_idx])
        confidences.append(float(p[top1_idx]))
        margins.append(float(s[top1_idx] - s[top2_idx]))
        
    acc = float(accuracy_score(y_te, y_pred))
    macro_f1 = float(f1_score(y_te, y_pred, average="macro"))
    cr = classification_report(y_te, y_pred, output_dict=True)
    cm = confusion_matrix(y_te, y_pred, labels=clf.classes_).tolist()
    ci = bootstrap_ci(y_te, y_pred)
    
    print("\n" + "=" * 70)
    print("=== FINAL FROZEN TEST SET EVALUATION ===")
    print("=" * 70)
    print(f"Overall Accuracy: {acc*100:.2f}%  (95% Bootstrap CI: [{ci['acc_ci'][0]*100:.2f}%, {ci['acc_ci'][1]*100:.2f}%])")
    print(f"Macro-F1 Score  : {macro_f1:.4f}  (95% Bootstrap CI: [{ci['f1_ci'][0]:.4f}, {ci['f1_ci'][1]:.4f}])")
    
    print("\nPer-Class Breakdown:")
    print(f"{'Class':<12} | {'Precision':<10} | {'Recall':<10} | {'F1-Score':<10} | {'Support':<8}")
    print("-" * 58)
    for c in clf.classes_:
        m = cr[c]
        print(f"{c:<12} | {m['precision']*100:<9.2f}% | {m['recall']*100:<9.2f}% | {m['f1-score']:<10.4f} | {int(m['support']):<8}")
        
    print("\nConfusion Matrix (Rows=True, Cols=Predicted):")
    print(f"{'True \\ Pred':<12} | " + " | ".join(f"{c:>8}" for c in clf.classes_))
    print("-" * 72)
    for i, row in enumerate(cm):
        print(f"{clf.classes_[i]:<12} | " + " | ".join(f"{val:8d}" for val in row))
        
    # Source type breakdown
    type_metrics = {}
    print("\nSource Type Breakdown:")
    for stype in sorted(set(test_types)):
        idx = [i for i, t in enumerate(test_types) if t == stype]
        sub_t = [y_te[i] for i in idx]
        sub_p = [y_pred[i] for i in idx]
        sub_acc = float(accuracy_score(sub_t, sub_p))
        sub_f1 = float(f1_score(sub_t, sub_p, average="macro", zero_division=0))
        type_metrics[stype] = {
            "count": len(idx),
            "correct": sum(1 for yt, yp in zip(sub_t, sub_p) if yt == yp),
            "accuracy": round(sub_acc, 4),
            "macro_f1": round(sub_f1, 4),
        }
        print(f"  {stype:<20}: Acc = {sub_acc*100:.2f}% ({type_metrics[stype]['correct']}/{len(idx)}), Macro-F1 = {sub_f1:.4f}")
        
    # Error Analysis
    errors = []
    for idx, (yt, yp, conf, marg, txt, stype) in enumerate(zip(y_te, y_pred, confidences, margins, x_te, test_types)):
        if yt != yp:
            errors.append({
                "index": idx,
                "text": txt,
                "true_department": yt,
                "predicted_department": yp,
                "confidence": round(conf, 4),
                "margin": round(marg, 4),
                "source_type": stype,
                "needs_review": conf < 0.50 or marg < 0.15,
            })
            
    print(f"\nTotal Errors: {len(errors)} / 180 (Error rate: {len(errors)/180*100:.2f}%)")
    caught = sum(1 for e in errors if e["needs_review"])
    print(f"Errors caught by review threshold (conf<0.50 or margin<0.15): {caught} / {len(errors)} ({caught/len(errors)*100:.1f}%)")
    
    # 3. Export Model Artifact
    artifact = {
        "classes": list(clf.classes_),
        "vocabulary": {term: int(index) for term, index in vec.vocabulary_.items()},
        "idf": [round(float(val), 8) for val in vec.idf_],
        "coef": [[round(float(val), 8) for val in row] for row in clf.coef_],
        "intercept": [round(float(val), 8) for val in clf.intercept_],
        "ngram_range": [1, 2],
        "analyzer": "word",
        "model_type": "multinomial_logistic_regression",
        "confidence_threshold": 0.50,
        "margin_threshold": 0.15,
    }
    
    model_json_path = ROOT / "model.json"
    model_json_path.write_text(json.dumps(artifact, separators=(",", ":")), encoding="utf-8")
    print(f"\nSaved model artifact to {model_json_path} ({len(artifact['vocabulary'])} features, {model_json_path.stat().st_size / 1024:.1f} KB)")
    
    # Save evaluation report
    eval_report = {
        "model_name": "TfidfVectorizer(analyzer=word, ngram_range=(1,2), max_features=3000) + LogisticRegression(C=5.0)",
        "train_samples": len(train_rows),
        "test_samples": len(test_rows),
        "overall_accuracy": round(acc, 4),
        "macro_f1": round(macro_f1, 4),
        "bootstrap_ci_95": ci,
        "per_class_metrics": {
            c: {
                "precision": round(cr[c]["precision"], 4),
                "recall": round(cr[c]["recall"], 4),
                "f1_score": round(cr[c]["f1-score"], 4),
                "support": int(cr[c]["support"]),
            }
            for c in clf.classes_
        },
        "confusion_matrix": cm,
        "classes": list(clf.classes_),
        "source_type_metrics": type_metrics,
        "error_count": len(errors),
        "errors": errors,
    }
    (ROOT / "evaluation_frozen_test.json").write_text(json.dumps(eval_report, indent=2), encoding="utf-8")
    print(f"Saved evaluation report to {ROOT / 'evaluation_frozen_test.json'}")

if __name__ == "__main__":
    main()
