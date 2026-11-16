"""Extract quarantined human gold evaluation records from existing verified curated complaints."""
import csv
import json
from pathlib import Path

reader = csv.DictReader(open('ml/data/multilabel_test.csv', encoding='utf-8'))
genuine_rows = [r for r in reader if r.get('source_type') == 'curated_genuine']

gold_records = []
for r in genuine_rows:
    depts = [d.strip() for d in r['departments'].split(',') if d.strip()]
    issues = [{'issue_id': f'iss_{idx+1}', 'issue_type': f'{d}_issue', 'department_key': d} for idx, d in enumerate(depts)]
    relations = []
    if len(depts) > 1:
        relations = [{'left': 'iss_1', 'right': f'iss_{i+1}', 'type': 'INDEPENDENT'} for i in range(1, len(depts))]
    
    clean_id = r["dataset_id"].lower().replace("-", "_")
    gold_records.append({
        'record_id': f'gold_{clean_id}',
        'text_sanitized': r['text'],
        'source_kind': 'human_authored',
        'label_origin': 'human_curated',
        'review_status': 'reviewed',
        'is_gold': True,
        'language': 'roman_urdu',
        'scenario_id': r['template_family_id'],
        'family_id': r['template_family_id'],
        'issues': issues,
        'relations': relations,
        'context_flags': ['human_curated_historical_gold'],
        'expected_route': 'candidate_auto_route' if issues else 'review',
    })

out_dir = Path('data/v11/human_gold')
out_dir.mkdir(parents=True, exist_ok=True)
out_file = out_dir / 'locked_gold.jsonl'
with out_file.open('w', encoding='utf-8') as f:
    for rec in gold_records:
        f.write(json.dumps(rec, ensure_ascii=False) + '\n')

print(f'Wrote {len(gold_records)} quarantined human gold records to {out_file}')
