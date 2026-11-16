"""Exports exact Python probability vectors and predictions for the 245 locked test samples."""
import csv
import json
import sys
from pathlib import Path
sys.path.insert(0, ".")

import numpy as np
from ml.v10.preprocess import normalize_roman_urdu, extract_word_and_char_tokens

model = json.loads(Path("ml/v10/multilabel_model_v10.json").read_text(encoding="utf-8"))
classes = model["classes"]
vocab = model["vocabulary"]
idf = np.array(model["idf"], dtype=np.float64)
coef = np.array(model["coef"], dtype=np.float64)
intercept = np.array(model["intercept"], dtype=np.float64)
thresholds = model["thresholds"]

samples = []
with open("ml/v10/data/v10_test.csv", "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        text = row["text"].strip()
        norm = normalize_roman_urdu(text)
        tokens = extract_word_and_char_tokens(text)

        # Count frequencies
        term_counts = {}
        for t in tokens:
            if t in vocab:
                col = vocab[t]
                term_counts[col] = term_counts.get(col, 0) + 1

        # TF-IDF calculation
        vec = np.zeros(len(vocab), dtype=np.float64)
        for col, count in term_counts.items():
            tf = 1.0 + np.log(count)
            vec[col] = tf * idf[col]

        norm_l2 = np.linalg.norm(vec)
        if norm_l2 > 0:
            vec /= norm_l2

        # Logits and probabilities
        logits = np.dot(coef, vec) + intercept
        probs = 1.0 / (1.0 + np.exp(-logits))

        # Selected departments
        selected = [classes[j] for j in range(len(classes)) if probs[j] >= thresholds[classes[j]]]

        samples.append({
            "dataset_id": row["dataset_id"],
            "text": text,
            "normalized_text": norm,
            "probabilities": {classes[j]: round(float(probs[j]), 6) for j in range(len(classes))},
            "selected_departments": selected,
        })

Path("ml/v10/python_test_predictions.json").write_text(json.dumps(samples, indent=2), encoding="utf-8")
print(f"Exported Python reference predictions for {len(samples)} samples to ml/v10/python_test_predictions.json")
