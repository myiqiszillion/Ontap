# -*- coding: utf-8 -*-
import json, re, sys
sys.stdout.reconfigure(encoding='utf-8')

d = json.load(open(r'D:\Ontap\data\sinh.json', encoding='utf-8'))
fixes = 0
for li, l in enumerate(d['lessons']):
    for qi, q in enumerate(l.get('questions', [])):
        if q.get('type') == 'shortanswer':
            ans = q['correctAnswer']
            m = re.search(r'(\d+)', ans)
            if m and ans != m.group(1):
                old = ans
                q['correctAnswer'] = m.group(1)
                fixes += 1
                print(f'Bai {li+1} Q{qi+1}: "{old}" -> "{m.group(1)}"')

json.dump(d, open(r'D:\Ontap\data\sinh.json','w',encoding='utf-8'), ensure_ascii=False, indent=2)
print(f'\nFixed {fixes} shortanswer values')
