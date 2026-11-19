import json
import collections

def audit():
    with open('data/v11/eval_v13_3/v13_3_evaluation_report.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    for sys_name in ['run004Baseline', 'run004Candidate', 'run006Baseline', 'run006Candidate']:
        sys = data['systems'][sys_name]
        print(f"=== SYSTEM: {sys['systemName']} ===")
        print(f"Exact Acc: {sys['exactAccuracy']}% | False Extra: {sys['falseExtraRate']}% | Missed: {sys['missedDeptRate']}%")
        print(f"Complexity: {sys['complexityAccuracy']}")
        print()

    # Deep dive on Run006 Candidate (V13.3)
    r6 = data['systems']['run006Candidate']
    failures = r6['failuresSample']
    
    causal_failures = [f for f in failures if f.get('complexity') == 'causal_consequence']
    print(f"Total causal failures in sample for Run006+V13.3: {len(causal_failures)}")
    for i, c in enumerate(causal_failures[:15]):
        print(f"--- Causal Failure {i+1} ({c['id']}) ---")
        print(f"Text: {c['text']}")
        print(f"Expected: {c['expected']}")
        print(f"Predicted: {c['predicted']}")
        print(f"Notes: {c['notes']}")
        print()

    # Also analyze False Extra failures in general
    false_extras = [f for f in failures if set(f['predicted']) - set(f['expected'])]
    print(f"Total false extra failures in sample: {len(false_extras)}")
    extra_dept_counts = collections.Counter()
    for f in false_extras:
        diff = set(f['predicted']) - set(f['expected'])
        for d in diff:
            extra_dept_counts[d] += 1
    print(f"Extra departments assigned incorrectly: {extra_dept_counts}")
    
    print("\nSample False Extras (first 10):")
    for i, f in enumerate(false_extras[:10]):
        print(f"--- False Extra {i+1} ({f['id']}, comp={f.get('complexity')}) ---")
        print(f"Text: {f['text']}")
        print(f"Expected: {f['expected']}")
        print(f"Predicted: {f['predicted']}")
        print(f"Notes: {f['notes']}")
        print()

if __name__ == '__main__':
    audit()
