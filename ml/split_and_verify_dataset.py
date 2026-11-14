"""Split curated Roman Urdu dataset into train/dev (600) and frozen test (180).

Ensures:
1. Stratified split across all 6 classes (100 train / 30 test per class).
2. Stratified split across source types (genuine, colloquial, edge cases, negation).
3. Zero exact duplicate texts.
4. Comprehensive Jaccard character 3-gram distance check (no train-test leakage).
5. Output CSV files saved with explicit UTF-8 encoding.
"""
from __future__ import annotations

import csv
import json
import random
import re
from pathlib import Path
from collections import Counter, defaultdict

import curate_dataset

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)

SEED = 20261115
random.seed(SEED)

def get_char_ngrams(text: str, n: int = 3) -> set[str]:
    clean = re.sub(r"[^a-z0-9]", "", text.lower())
    if len(clean) < n:
        return {clean}
    return {clean[i:i+n] for i in range(len(clean) - n + 1)}

def jaccard_similarity(s1: set[str], s2: set[str]) -> float:
    if not s1 or not s2:
        return 0.0
    intersection = len(s1 & s2)
    union = len(s1 | s2)
    return intersection / union if union > 0 else 0.0

def main():
    print(f"=== SPLITTING & VERIFYING ROMAN URDU DATASET (SEED={SEED}) ===")
    
    # 1. Collect all samples
    all_records = []
    class_type_records = defaultdict(lambda: defaultdict(list))
    
    for dept, samples in curate_dataset.SAMPLES.items():
        for text, stype in samples:
            record = {
                "text": text.strip(),
                "department_id": dept,
                "source_type": stype,
            }
            all_records.append(record)
            class_type_records[dept][stype].append(record)
            
    print(f"Total curated records: {len(all_records)}")
    
    # Check duplicate texts in full dataset
    text_counts = Counter(r["text"].lower() for r in all_records)
    duplicates = [t for t, c in text_counts.items() if c > 1]
    if duplicates:
        print(f"WARNING: Found {len(duplicates)} duplicate texts in curated data:")
        for d in duplicates[:5]:
            print(f"  Duplicate: {d}")
        raise ValueError(f"Curated dataset contains duplicate texts: {duplicates}")
    else:
        print("[PASS] Full dataset contains 0 exact duplicates.")

    # 2. Stratified selection into Train (600) and Test (180)
    # Target per department: 100 train, 30 test
    # Per source_type:
    #   curated_genuine (50): 40 train, 10 test
    #   colloquial_variant (40): 30 train, 10 test
    #   edge_case (25): 19 train, 6 test
    #   negation_contrast (15): 11 train, 4 test
    
    test_records = []
    train_records = []
    
    test_quotas = {
        "curated_genuine": 10,
        "colloquial_variant": 10,
        "edge_case": 6,
        "negation_contrast": 4,
    }
    
    for dept, type_map in class_type_records.items():
        dept_test = []
        dept_train = []
        for stype, items in type_map.items():
            shuffled = list(items)
            random.shuffle(shuffled)
            quota = test_quotas[stype]
            dept_test.extend(shuffled[:quota])
            dept_train.extend(shuffled[quota:])
            
        assert len(dept_test) == 30, f"{dept} test count is {len(dept_test)} (expected 30)"
        assert len(dept_train) == 100, f"{dept} train count is {len(dept_train)} (expected 100)"
        test_records.extend(dept_test)
        train_records.extend(dept_train)
        
    print(f"Split complete: Train/Dev = {len(train_records)}, Frozen Test = {len(test_records)}")
    
    # 3. Leakage checks
    train_texts = {r["text"].lower() for r in train_records}
    test_texts = {r["text"].lower() for r in test_records}
    
    overlap = train_texts & test_texts
    if overlap:
        raise ValueError(f"Critical error: Train-test overlap detected! {overlap}")
    print("[PASS] Zero exact overlap between Train and Test sets.")
    
    # Check near-duplicate Jaccard similarity across train and test
    max_jaccard = 0.0
    highest_pair = None
    
    train_ngrams = [(r["text"], get_char_ngrams(r["text"], 3)) for r in train_records]
    test_ngrams = [(r["text"], get_char_ngrams(r["text"], 3)) for r in test_records]
    
    high_sim_count = 0
    for test_text, test_ng in test_ngrams:
        for train_text, train_ng in train_ngrams:
            sim = jaccard_similarity(test_ng, train_ng)
            if sim > max_jaccard:
                max_jaccard = sim
                highest_pair = (test_text, train_text, sim)
            if sim >= 0.75:
                high_sim_count += 1
                
    print(f"Max train-test 3-gram Jaccard similarity: {max_jaccard:.4f}")
    if highest_pair:
        print(f"  Test text : {highest_pair[0]}")
        print(f"  Train text: {highest_pair[1]}")
        print(f"  Similarity: {highest_pair[2]:.4f}")
    if high_sim_count > 0:
        print(f"WARNING: {high_sim_count} pairs exceed 0.75 Jaccard similarity.")
    else:
        print("[PASS] No train-test pairs exceed 0.75 Jaccard character 3-gram threshold.")
        
    # 4. Save CSV files
    fieldnames = ["text", "department_id", "source_type"]
    
    full_csv = DATA_DIR / "full_dataset_780.csv"
    with open(full_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_records)
    print(f"Saved full dataset: {full_csv} ({len(all_records)} rows)")
    
    train_csv = DATA_DIR / "train_dev_set.csv"
    with open(train_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(train_records)
    print(f"Saved train/dev dataset: {train_csv} ({len(train_records)} rows)")
    
    test_csv = DATA_DIR / "frozen_test_set.csv"
    with open(test_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(test_records)
    print(f"Saved frozen test dataset: {test_csv} ({len(test_records)} rows)")
    
    # 5. Print class & type breakdowns
    print("\n--- Frozen Test Set Breakdown (180 samples) ---")
    test_depts = Counter(r["department_id"] for r in test_records)
    test_types = Counter(r["source_type"] for r in test_records)
    print(f"Classes: {dict(test_depts)}")
    print(f"Source Types: {dict(test_types)}")
    
    print("\n--- Train/Dev Set Breakdown (600 samples) ---")
    train_depts = Counter(r["department_id"] for r in train_records)
    train_types = Counter(r["source_type"] for r in train_records)
    print(f"Classes: {dict(train_depts)}")
    print(f"Source Types: {dict(train_types)}")

if __name__ == "__main__":
    main()
