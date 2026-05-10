import json
import sys

sys.stdout.reconfigure(encoding='utf-8')
try:
    with open('D:/Ontap/data/su.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    for l in data.get('lessons', []):
        print(f"\n===== {l['name']} =====")
        for qg in l.get('questionGroups', []):
            print(f"\n--- {qg['passage'][:80]}...")
            for st in qg.get('statements', []):
                print(f"  [{st['correct']}] {st['question']}")
except Exception as e:
    print(e)
