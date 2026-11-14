"""Reproducible development baseline: char TF-IDF + supervised LinearSVC.

The bundled CSV is intentionally labelled as a small, hand-authored development
dataset. It is not a claim of representative Karachi-wide production data.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import classification_report, confusion_matrix, f1_score
from sklearn.model_selection import train_test_split
from sklearn.svm import LinearSVC

ROOT = Path(__file__).resolve().parent
rows = list(csv.DictReader((ROOT / "data" / "roman_urdu_civic_development.csv").open(encoding="utf-8")))
texts = [row["text"] for row in rows]
labels = [row["department_id"] for row in rows]
x_train, x_test, y_train, y_test = train_test_split(
    texts, labels, test_size=0.25, stratify=labels, random_state=20261114
)
vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 4), max_features=500, lowercase=True)
x_train_vector = vectorizer.fit_transform(x_train)
classifier = LinearSVC(C=1.0)
classifier.fit(x_train_vector, y_train)
y_pred = classifier.predict(vectorizer.transform(x_test))

metrics = {
    "dataset": "hand-authored development dataset (48 examples; 36 train / 12 held-out)",
    "model": "TfidfVectorizer(analyzer=char_wb, ngram_range=(3,4), max_features=500) + LinearSVC(C=1.0)",
    "random_state": 20261114,
    "macro_f1": f1_score(y_test, y_pred, average="macro"),
    "labels": list(classifier.classes_),
    "confusion_matrix": confusion_matrix(y_test, y_pred, labels=classifier.classes_).tolist(),
    "classification_report": classification_report(y_test, y_pred, output_dict=True, zero_division=0),
}
(ROOT / "evaluation.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")

# The score above remains held-out: only after it is recorded do we refit the
# selected baseline on all 48 development rows for the deployed artifact.
production_vectorizer = TfidfVectorizer(
    analyzer="char_wb", ngram_range=(3, 4), max_features=500, lowercase=True
)
production_matrix = production_vectorizer.fit_transform(texts)
production_classifier = LinearSVC(C=1.0).fit(production_matrix, labels)

artifact = {
    "classes": list(production_classifier.classes_),
    "vocabulary": {term: int(index) for term, index in production_vectorizer.vocabulary_.items()},
    "idf": production_vectorizer.idf_.tolist(),
    "coef": production_classifier.coef_.tolist(),
    "intercept": production_classifier.intercept_.tolist(),
    "ngram_range": [3, 4],
    "analyzer": "char_wb",
}
(ROOT / "model.json").write_text(json.dumps(artifact, separators=(",", ":")), encoding="utf-8")
print(json.dumps(metrics, indent=2))
