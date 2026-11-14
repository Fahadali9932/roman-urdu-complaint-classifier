"""Rigorous comparative evaluation of candidate classifiers on:
1. 5-Fold Cross-Validation on Train/Dev (600 samples)
2. Final evaluation on Frozen Independent Test Set (180 samples)
"""
from __future__ import annotations

import csv
import json
import numpy as np
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression, SGDClassifier
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import accuracy_score, f1_score, classification_report, confusion_matrix
from scipy.special import softmax

ROOT = Path(__file__).resolve().parent
TRAIN_PATH = ROOT / "data" / "train_dev_set.csv"
TEST_PATH = ROOT / "data" / "frozen_test_set.csv"

def get_models():
    return [
        {
            "id": "char_wb_3_4_baseline",
            "name": "Model 1: char_wb (3,4), max_f=1200, C=5.0 (Phase 3B Baseline Replicate)",
            "vec": lambda: TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 4), max_features=1200, lowercase=True),
            "clf": lambda: LogisticRegression(C=5.0, max_iter=1000, random_state=42),
            "analyzer": "char_wb",
            "ngram_range": [3, 4],
        },
        {
            "id": "char_wb_3_5_tuned",
            "name": "Model 2: char_wb (3,5), max_f=5000, C=4.0 (Character n-gram Optimized)",
            "vec": lambda: TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), max_features=5000, lowercase=True),
            "clf": lambda: LogisticRegression(C=4.0, max_iter=1000, random_state=42),
            "analyzer": "char_wb",
            "ngram_range": [3, 5],
        },
        {
            "id": "word_1_2_tuned",
            "name": "Model 3: word (1,2), max_f=2500, C=6.0 (Word n-gram Optimized)",
            "vec": lambda: TfidfVectorizer(analyzer="word", ngram_range=(1, 2), max_features=2500, lowercase=True),
            "clf": lambda: LogisticRegression(C=6.0, max_iter=1000, random_state=42),
            "analyzer": "word",
            "ngram_range": [1, 2],
        },
        {
            "id": "word_1_2_3000",
            "name": "Model 4: word (1,2), max_f=3000, C=5.0 (Word n-gram Expanded)",
            "vec": lambda: TfidfVectorizer(analyzer="word", ngram_range=(1, 2), max_features=3000, lowercase=True),
            "clf": lambda: LogisticRegression(C=5.0, max_iter=1000, random_state=42),
            "analyzer": "word",
            "ngram_range": [1, 2],
        },
        {
            "id": "word_1_3_tuned",
            "name": "Model 5: word (1,3), max_f=3500, C=5.0 (Word 3-gram)",
            "vec": lambda: TfidfVectorizer(analyzer="word", ngram_range=(1, 3), max_features=3500, lowercase=True),
            "clf": lambda: LogisticRegression(C=5.0, max_iter=1000, random_state=42),
            "analyzer": "word",
            "ngram_range": [1, 3],
        },
    ]

def bootstrap_ci(y_true, y_pred, n_bootstraps=1000, seed=20261115):
    rng = np.random.RandomState(seed)
    n = len(y_true)
    accs, f1s = [], []
    for _ in range(n_bootstraps):
        idx = rng.choice(n, size=n, replace=True)
        sample_t = [y_true[i] for i in idx]
        sample_p = [y_pred[i] for i in idx]
        accs.append(accuracy_score(sample_t, sample_p))
        f1s.append(f1_score(sample_t, sample_p, average="macro"))
    return {
        "acc_ci": (float(np.percentile(accs, 2.5)), float(np.percentile(accs, 97.5))),
        "f1_ci": (float(np.percentile(f1s, 2.5)), float(np.percentile(f1s, 97.5))),
    }

def main():
    train_rows = list(csv.DictReader(TRAIN_PATH.open(encoding="utf-8")))
    test_rows = list(csv.DictReader(TEST_PATH.open(encoding="utf-8")))
    
    x_tr = [r["text"] for r in train_rows]
    y_tr = [r["department_id"] for r in train_rows]
    x_te = [r["text"] for r in test_rows]
    y_te = [r["department_id"] for r in test_rows]
    test_types = [r["source_type"] for r in test_rows]
    
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=20261115)
    
    models = get_models()
    comparison = []
    
    print("=" * 80)
    print("=== MODEL COMPARISON BENCHMARK (CV & FROZEN TEST EVALUATION) ===")
    print("=" * 80)
    
    for m in models:
        # 1. 5-Fold Cross-Validation on Train/Dev
        cv_accs, cv_f1s = [], []
        for tr_idx, va_idx in skf.split(x_tr, y_tr):
            v = m["vec"]()
            xtr_v = v.fit_transform([x_tr[i] for i in tr_idx])
            xva_v = v.transform([x_tr[i] for i in va_idx])
            clf = m["clf"]()
            clf.fit(xtr_v, [y_tr[i] for i in tr_idx])
            preds = clf.predict(xva_v)
            cv_accs.append(accuracy_score([y_tr[i] for i in va_idx], preds))
            cv_f1s.append(f1_score([y_tr[i] for i in va_idx], preds, average="macro"))
            
        cv_mean_acc = float(np.mean(cv_accs))
        cv_mean_f1 = float(np.mean(cv_f1s))
        
        # 2. Frozen Test Set Evaluation
        final_vec = m["vec"]()
        final_xtr = final_vec.fit_transform(x_tr)
        final_xte = final_vec.transform(x_te)
        final_clf = m["clf"]()
        final_clf.fit(final_xtr, y_tr)
        
        test_preds = final_clf.predict(final_xte)
        test_acc = float(accuracy_score(y_te, test_preds))
        test_f1 = float(f1_score(y_te, test_preds, average="macro"))
        
        ci = bootstrap_ci(y_te, test_preds)
        
        # Breakdown by source type
        st_breakdown = {}
        for stype in sorted(set(test_types)):
            indices = [i for i, t in enumerate(test_types) if t == stype]
            sub_t = [y_te[i] for i in indices]
            sub_p = [test_preds[i] for i in indices]
            st_breakdown[stype] = {
                "count": len(indices),
                "accuracy": round(float(accuracy_score(sub_t, sub_p)), 4),
                "macro_f1": round(float(f1_score(sub_t, sub_p, average="macro", zero_division=0)), 4),
            }
            
        entry = {
            "id": m["id"],
            "name": m["name"],
            "cv_mean_acc": round(cv_mean_acc, 4),
            "cv_mean_f1": round(cv_mean_f1, 4),
            "test_acc": round(test_acc, 4),
            "test_f1": round(test_f1, 4),
            "test_acc_ci": [round(ci["acc_ci"][0], 4), round(ci["acc_ci"][1], 4)],
            "test_f1_ci": [round(ci["f1_ci"][0], 4), round(ci["f1_ci"][1], 4)],
            "source_type_breakdown": st_breakdown,
        }
        comparison.append(entry)
        
        print(f"\n{m['name']}")
        print(f"  5-Fold CV  : Acc = {cv_mean_acc*100:.2f}%, Macro-F1 = {cv_mean_f1:.4f}")
        print(f"  Frozen Test: Acc = {test_acc*100:.2f}% (95% CI: [{ci['acc_ci'][0]*100:.2f}%, {ci['acc_ci'][1]*100:.2f}%]), Macro-F1 = {test_f1:.4f}")
        for st, data in st_breakdown.items():
            print(f"    - {st:<18}: Acc = {data['accuracy']*100:.2f}% (n={data['count']})")
            
    # Sort by test accuracy and Macro-F1
    comparison.sort(key=lambda x: (x["test_acc"], x["test_f1"]), reverse=True)
    
    (ROOT / "all_models_comparison.json").write_text(json.dumps(comparison, indent=2), encoding="utf-8")
    print(f"\nSaved comparison to {ROOT / 'all_models_comparison.json'}")

if __name__ == "__main__":
    main()
