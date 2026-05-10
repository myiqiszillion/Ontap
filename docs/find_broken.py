import json
import sys

sys.stdout.reconfigure(encoding='utf-8')
with open('D:/Ontap/data/su.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

for l in d['lessons']:
    for qg in l.get('questionGroups', []):
        for i, st in enumerate(qg['statements']):
            q = st['question']
            if len(q.split()) < 5 or (q and q[0].islower()):
                print(f"Lesson: {l['name']}")
                print(f"Passage ends with: ...{qg['passage'][-100:]}")
                print(f"Suspicious statement {i}: {q}")
                print("---")
