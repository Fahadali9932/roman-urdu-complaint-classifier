"""Reproducible Roman Urdu civic classifier training pipeline.

Architecture:
  - Character n-gram TF-IDF (analyzer='char_wb', ngram_range=(3, 4), max_features=1200)
  - Multinomial Logistic Regression (C=5.0, max_iter=1000)
  - Balanced 6-class municipal categories (KMC, KE, KWSC, SSGC, SSWMB, SBCA)
  - Roman Urdu text normalization (phonetic variants, character elongation, negation preservation)
"""
from __future__ import annotations

import csv
import json
import re
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import classification_report, confusion_matrix, f1_score, accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression

def normalize_roman_urdu(text: str) -> str:
    if not text:
        return ""
    text = text.lower().strip()
    text = re.sub(r'([a-z])\1{2,}', r'\1\1', text)
    substitutions = [
        (r'\bnhi\b', 'nahi'),
        (r'\bnahin\b', 'nahi'),
        (r'\bnahe\b', 'nahi'),
        (r'\bpaani\b', 'pani'),
        (r'\baarahe\b', 'aa rahe'),
        (r'\baarahay\b', 'aa rahe'),
        (r'\baarahey\b', 'aa rahe'),
        (r'\baaraha\b', 'aa raha'),
        (r'\baarahi\b', 'aa rahi'),
        (r'\baraha\b', 'aa raha'),
        (r'\barahi\b', 'aa rahi'),
        (r'\bsarak\b', 'sadak'),
        (r'\bkhadday\b', 'gadday'),
        (r'\bkhadda\b', 'gadda'),
        (r'\belectricity\b', 'bijli'),
        (r'\blite\b', 'light'),
    ]
    for pattern, repl in substitutions:
        text = re.sub(pattern, repl, text)
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def train():
    root = Path(__file__).resolve().parent
    csv_path = root / "data" / "roman_urdu_civic_development.csv"
    rows = list(csv.DictReader(csv_path.open(encoding="utf-8")))
    
    texts = [row["text"] for row in rows]
    labels = [row["department_id"] for row in rows]
    norm_texts = [normalize_roman_urdu(t) for t in texts]

    x_train, x_test, y_train, y_test = train_test_split(
        norm_texts, labels, test_size=0.20, stratify=labels, random_state=20261114
    )

    vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 4), max_features=1200, lowercase=True)
    x_train_vec = vectorizer.fit_transform(x_train)
    x_test_vec = vectorizer.transform(x_test)

    classifier = LogisticRegression(C=5.0, max_iter=1000)
    classifier.fit(x_train_vec, y_train)
    y_pred = classifier.predict(x_test_vec)

    acc = accuracy_score(y_test, y_pred)
    macro_f1 = f1_score(y_test, y_pred, average="macro")
    cr = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    cm = confusion_matrix(y_test, y_pred, labels=classifier.classes_).tolist()

    metrics = {
        "dataset": f"Curated Roman Urdu civic dataset ({len(rows)} samples; {len(x_train)} train / {len(x_test)} held-out test)",
        "classes": list(classifier.classes_),
        "sample_counts_per_class": {dept: sum(1 for d in labels if d == dept) for dept in classifier.classes_},
        "model": "TfidfVectorizer(analyzer=char_wb, ngram_range=(3,4), max_features=1200) + LogisticRegression(C=5.0)",
        "random_state": 20261114,
        "test_size": 0.20,
        "accuracy": acc,
        "macro_f1": macro_f1,
        "per_class_metrics": {
            cls: {
                "precision": cr[cls]["precision"],
                "recall": cr[cls]["recall"],
                "f1-score": cr[cls]["f1-score"],
                "support": cr[cls]["support"],
            }
            for cls in classifier.classes_
        },
        "confusion_matrix": cm,
    }
    (root / "evaluation.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    # Production fit on all verified samples
    prod_vec = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 4), max_features=1200, lowercase=True)
    prod_x = prod_vec.fit_transform(norm_texts)
    prod_clf = LogisticRegression(C=5.0, max_iter=1000).fit(prod_x, labels)

    artifact = {
        "classes": list(prod_clf.classes_),
        "vocabulary": {term: int(index) for term, index in prod_vec.vocabulary_.items()},
        "idf": prod_vec.idf_.tolist(),
        "coef": prod_clf.coef_.tolist(),
        "intercept": prod_clf.intercept_.tolist(),
        "ngram_range": [3, 4],
        "analyzer": "char_wb",
        "model_type": "multinomial_logistic_regression",
        "normalizer_rules": "roman_urdu_v2",
    }
    (root / "model.json").write_text(json.dumps(artifact, separators=(",", ":")), encoding="utf-8")
    
    edge_model = root.parent / "supabase" / "functions" / "submit-classified-complaint" / "model.json"
    if edge_model.parent.exists():
        edge_model.write_text(json.dumps(artifact, separators=(",", ":")), encoding="utf-8")

    print(f"Model retrained successfully. Held-out Acc: {acc*100:.2f}%, Macro-F1: {macro_f1:.4f}")

if __name__ == "__main__":
    train()
