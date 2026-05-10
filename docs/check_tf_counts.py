import json
import sys

sys.stdout.reconfigure(encoding='utf-8')
exec(open('parse_to_json.py', encoding='utf-8').read().split('if __name__')[0])
d = parse_txt(r'D:\Ontap\docs\su10.txt', 'su')
with open(r'D:\Ontap\data\su.json', 'w', encoding='utf-8') as f:
    json.dump(d, f, ensure_ascii=False, indent=2)

for l in d['lessons']:
    counts = [len(qg.get('statements', [])) for qg in l.get('questionGroups', [])]
    print(f"{l['name'][:60]}: {counts}")

    # Print out any that don't have exactly 4 statements
    for i, qg in enumerate(l.get('questionGroups', [])):
        if len(qg.get('statements', [])) != 4:
            print(f"  -> Group {i+1} has {len(qg.get('statements', []))} statements: {qg['passage'][:60]}...")
            for st in qg.get('statements', []):
                print(f"       {st['question']}")
