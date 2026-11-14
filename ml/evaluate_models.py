"""5-Fold Stratified Cross-Validation evaluation of candidate Roman Urdu classifiers.

Runs STRICTLY on ml/data/train_dev_set.csv (600 samples).
Does NOT touch ml/data/frozen_test_set.csv.
"""
from __future__ import annotations

import csv
import json
import re
from pathlib import Path
from typing import Dict, Any, List

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression, SGDClassifier
from sklearn.naive_bayes import ComplementNB
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score

ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "data" / "train_dev_set.csv"

def clean_text(text: str) -> str:
    """Normalize whitespace and lowercase; strip non-alphanumeric except standard space."""
    if not text:
        return ""
    text = text.lower().strip()
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def run_cross_validation(clf_factory, vec_factory, texts: list[str], labels: list[str], n_splits: int = 5, seed: int = 20261115):
    skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=seed)
    accs, macro_f1s = [], []
    
    for train_idx, val_idx in skf.split(texts, labels):
        x_tr = [texts[i] for i in train_idx]
        y_tr = [labels[i] for i in train_idx]
        x_va = [texts[i] for i in val_idx]
        y_va = [labels[i] for i in val_idx]
        
        vec = vec_factory()
        x_tr_v = vec.fit_transform(x_tr)
        x_va_v = vec.transform(x_va)
        
        clf = clf_factory()
        clf.fit(x_tr_v, y_tr)
        preds = clf.predict(x_va_v)
        
        accs.append(accuracy_score(y_va, preds))
        macro_f1s.append(f1_score(y_va, preds, average="macro"))
        
    return {
        "mean_acc": float(np.mean(accs)),
        "std_acc": float(np.std(accs)),
        "mean_f1": float(np.mean(macro_f1s)),
        "std_f1": float(np.std(macro_f1s)),
        "acc_folds": [round(a, 4) for a in accs],
        "f1_folds": [round(f, 4) for f in macro_f1s],
    }

def main():
    rows = list(csv.DictReader(DATA_PATH.open(encoding="utf-8")))
    raw_texts = [r["text"] for r in rows]
    clean_texts = [clean_text(r["text"]) for r in rows]
    labels = [r["department_id"] for r in rows]
    
    print(f"Loaded {len(rows)} train/dev samples across {len(set(labels))} classes.")
    
    configs = [
        # Baseline: char_wb (3,4), max_feat 1200, C=5.0
        {
            "name": "Config 1 (Baseline replicate): char_wb (3,4), 1200 feats, LR C=5.0",
            "vec": lambda: TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 4), max_features=1200, lowercase=True),
            "clf": lambda: LogisticRegression(C=5.0, max_iter=1000, random_state=42),
            "clean": False,
        },
        # Config 2: char_wb (3,5), 2000 feats, LR C=3.0
        {
            "name": "Config 2: char_wb (3,5), 2000 feats, LR C=3.0",
            "vec": lambda: TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), max_features=2000, lowercase=True),
            "clf": lambda: LogisticRegression(C=3.0, max_iter=1000, random_state=42),
            "clean": False,
        },
        # Config 3: char_wb (3,5), 2500 feats, LR C=5.0
        {
            "name": "Config 3: char_wb (3,5), 2500 feats, LR C=5.0",
            "vec": lambda: TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), max_features=2500, lowercase=True),
            "clf": lambda: LogisticRegression(C=5.0, max_iter=1000, random_state=42),
            "clean": False,
        },
        # Config 4: char_wb (3,5), 3000 feats, LR C=4.0
        {
            "name": "Config 4: char_wb (3,5), 3000 feats, LR C=4.0",
            "vec": lambda: TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), max_features=3000, lowercase=True),
            "clf": lambda: LogisticRegression(C=4.0, max_iter=1000, random_state=42),
            "clean": False,
        },
        # Config 5: char_wb (2,5), 3000 feats, LR C=4.0
        {
            "name": "Config 5: char_wb (2,5), 3000 feats, LR C=4.0",
            "vec": lambda: TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), max_features=3000, lowercase=True),
            "clf": lambda: LogisticRegression(C=4.0, max_iter=1000, random_state=42),
            "clean": False,
        },
        # Config 6: char_wb (3,5) with text cleaning (punctuation removal)
        {
            "name": "Config 6: clean text, char_wb (3,5), 2500 feats, LR C=4.0",
            "vec": lambda: TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), max_features=2500, lowercase=True),
            "clf": lambda: LogisticRegression(C=4.0, max_iter=1000, random_state=42),
            "clean": True,
        },
        # Config 7: clean text, char_wb (3,5), 3000 feats, LR C=5.0
        {
            "name": "Config 7: clean text, char_wb (3,5), 3000 feats, LR C=5.0",
            "vec": lambda: TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), max_features=3000, lowercase=True),
            "clf": lambda: LogisticRegression(C=5.0, max_iter=1000, random_state=42),
            "clean": True,
        },
        # Config 8: clean text, char_wb (3,5), 3500 feats, LR C=5.0
        {
            "name": "Config 8: clean text, char_wb (3,5), 3500 feats, LR C=5.0",
            "vec": lambda: TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), max_features=3500, lowercase=True),
            "clf": lambda: LogisticRegression(C=5.0, max_iter=1000, random_state=42),
            "clean": True,
        },
        # Config 9: Calibrated LinearSVC (char_wb 3,5, 2500 feats)
        {
            "name": "Config 9: clean text, char_wb (3,5), 2500 feats, LinearSVC + Calibrated",
            "vec": lambda: TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), max_features=2500, lowercase=True),
            "clf": lambda: CalibratedClassifierCV(LinearSVC(C=1.0, random_state=42), cv=3),
            "clean": True,
        },
        # Config 10: Complement Naive Bayes (char_wb 3,5, 2500 feats)
        {
            "name": "Config 10: clean text, char_wb (3,5), 2500 feats, ComplementNB (alpha=0.5)",
            "vec": lambda: TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), max_features=2500, lowercase=True),
            "clf": lambda: ComplementNB(alpha=0.5),
            "clean": True,
        },
        # Config 11: Word n-gram (1,2) + LR
        {
            "name": "Config 11: clean text, word (1,2), 2500 feats, LR C=4.0",
            "vec": lambda: TfidfVectorizer(analyzer="word", ngram_range=(1, 2), max_features=2500, lowercase=True),
            "clf": lambda: LogisticRegression(C=4.0, max_iter=1000, random_state=42),
            "clean": True,
        },
    ]
    
    print("\n--- 5-Fold Stratified Cross-Validation on 600 Train/Dev Samples ---")
    results = []
    for cfg in configs:
        texts = clean_texts if cfg["clean"] else raw_texts
        cv_res = run_cross_validation(cfg["clf"], cfg["vec"], texts, labels)
        results.append({
            "name": cfg["name"],
            **cv_res,
        })
        print(f"{cfg['name']:<70} | Acc: {cv_res['mean_acc']*100:.2f}% (±{cv_res['std_acc']*100:.2f}%) | Macro-F1: {cv_res['mean_f1']:.4f}")
        
    # Sort by mean_f1
    results.sort(key=lambda x: x["mean_f1"], reverse=True)
    print("\n=== RANKED CV RESULTS ===")
    for rank, r in enumerate(results, 1):
        print(f"#{rank:2d}: {r['name']} -> Mean F1: {r['mean_f1']:.4f}, Mean Acc: {r['mean_acc']*100:.2f}%")
        
    (ROOT / "cv_comparison_results.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"\nSaved CV comparison to {ROOT / 'cv_comparison_results.json'}")

if __name__ == "__main__":
    main()
