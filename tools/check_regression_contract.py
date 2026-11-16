"""Validate developer-authored behavioral cases; not a model benchmark or gold test."""
import argparse
import collections
import json
import re
from pathlib import Path

DEPARTMENTS = {"kmc", "kwsc", "kelectric", "ssgc", "sswmb", "sbca"}
RELATIONS = {
    "SINGLE", "CAUSES_CONTEXT_ONLY", "INDEPENDENT",
    "SAME_INCIDENT_DIFFERENT_REPAIRS", "NEGATED", "RECIPIENT_ONLY",
    "SPATIAL_PROXIMITY_ONLY", "UNCERTAIN",
}
PHONE = re.compile(r"(?<!\d)(?:\+?92|0)3\d{9}(?!\d)")
CNIC = re.compile(r"\b\d{5}-?\d{7}-?\d\b")


def validate(path: Path) -> dict:
    records = []
    ids, texts = set(), set()
    with path.open(encoding="utf-8") as stream:
        for line_number, line in enumerate(stream, 1):
            if not line.strip():
                continue
            item = json.loads(line)
            required = {"id", "text", "expected_departments", "relation", "review"}
            if set(item) != required:
                raise ValueError(f"Line {line_number}: unexpected/missing fields")
            if not isinstance(item["id"], str) or not item["id"]:
                raise ValueError(f"Line {line_number}: invalid ID")
            if not isinstance(item["text"], str) or len(item["text"].split()) < 4:
                raise ValueError(f"Line {line_number}: invalid complaint")
            if item["id"] in ids or item["text"].lower() in texts:
                raise ValueError(f"Line {line_number}: duplicate")
            ids.add(item["id"])
            texts.add(item["text"].lower())
            labs = item["expected_departments"]
            if (not isinstance(labs, list) or any(x not in DEPARTMENTS for x in labs)
                    or labs != sorted(set(labs))):
                raise ValueError(f"Line {line_number}: bad labels")
            if item["relation"] not in RELATIONS or not isinstance(item["review"], bool):
                raise ValueError(f"Line {line_number}: bad relation/review")
            if item["relation"] in {"INDEPENDENT", "SAME_INCIDENT_DIFFERENT_REPAIRS"} and len(labs) < 2:
                raise ValueError(f"Line {line_number}: multi repair without two labels")
            if item["relation"] == "UNCERTAIN" and (not item["review"] or labs):
                raise ValueError(f"Line {line_number}: uncertain case must review without guessed labels")
            if not labs and not item["review"]:
                raise ValueError(f"Line {line_number}: empty label set requires review")
            if PHONE.search(item["text"]) or CNIC.search(item["text"]):
                raise ValueError(f"Line {line_number}: PII token")
            records.append(item)
    return {
        "count": len(records),
        "relations": dict(collections.Counter(x["relation"] for x in records)),
        "departments": dict(collections.Counter(d for x in records for d in x["expected_departments"])),
        "review_count": sum(x["review"] for x in records),
        "provenance": "developer_authored_regression_only_NOT_independent_gold",
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("file", type=Path)
    args = parser.parse_args()
    print(json.dumps(validate(args.file), indent=2, sort_keys=True))

