import json, sys
sys.stdout.reconfigure(encoding='utf-8')
d = json.load(open(r'D:\Ontap\data\sinh.json', encoding='utf-8'))
for l in d['lessons']:
    name = l['name']
    sas = [q for q in l.get('questions', []) if q.get('type') == 'shortanswer']
    print(f"\n{name}: {len(sas)} short answers")
    for q in sas:
        print(f"  Answer: {q['correctAnswer']} | Q: {q['question'][:80]}...")
