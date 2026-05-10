# -*- coding: utf-8 -*-
import json, sys, re
sys.stdout.reconfigure(encoding='utf-8')

d = json.load(open(r'D:\Ontap\data\sinh.json', encoding='utf-8'))
print('Lessons:', len(d['lessons']))
issues = 0

for li, l in enumerate(d['lessons']):
    qs = l.get('questions', [])
    mcq = [q for q in qs if q.get('type') != 'shortanswer']
    sa = [q for q in qs if q.get('type') == 'shortanswer']
    tf = len(l.get('questionGroups', []))
    name = l['name'][:50]
    print(f"  Bai {li+1}: {name} MCQ={len(mcq)} SA={len(sa)} TF={tf}")
    
    for qi, q in enumerate(mcq):
        opts = q.get('options', [])
        if len(opts) < 4:
            print(f"    ❌ MCQ{qi+1}: ONLY {len(opts)} OPTIONS - {q['question'][:60]}")
            issues += 1
    
    for gi, g in enumerate(l.get('questionGroups', [])):
        sc = len(g.get('statements', []))
        if sc != 4:
            print(f"    ❌ TF{gi+1}: {sc} statements (expected 4)")
            issues += 1
        p = g.get('passage', '')
        if re.search(r'Trả lời|→\s*(Đúng|Sai)|Biết.*→|Hiểu.*→|Vận dụng.*→|Đáp án:', p):
            print(f"    ⚠️ TF{gi+1}: PASSAGE STILL HAS ANSWER KEY")
            issues += 1

print(f"\n{'✅ No issues found!' if issues == 0 else f'❌ {issues} issues remaining'}")
