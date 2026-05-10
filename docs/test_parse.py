import sys, json
sys.stdout.reconfigure(encoding='utf-8')
from parse_to_json import parse_txt

data = parse_txt(r'D:\Ontap\docs\sinh10.txt', 'sinh')

for l in data['lessons']:
    if '24' in l['name']:
        print('FOUND BÀI 24 in JSON!')
        for q in l.get('questions', []):
            print(q)
