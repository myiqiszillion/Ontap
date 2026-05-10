import sys, re
sys.stdout.reconfigure(encoding='utf-8')
with open(r'd:\Ontap\docs\sinh10.txt', 'r', encoding='utf-8') as f:
    text = f.read()

def repl_tf(match):
    chunk = match.group(0)
    ans_line = match.group(2)
    tf_map = {}
    
    parts = re.split(r'(?i)(đúng|sai)', ans_line)
    
    current_letters = []
    for p in parts:
        p_lower = p.lower()
        if p_lower in ['đúng', 'sai']:
            status = '(Đ)' if p_lower == 'đúng' else '(S)'
            for l in current_letters:
                tf_map[l] = status
            current_letters = []
        else:
            letters = re.findall(r'[A-Da-d]', p)
            current_letters.extend([l.lower() for l in letters])
            
    if not tf_map: return chunk
    
    chunk = chunk.replace(ans_line, '')
    lines = chunk.split('\n')
    for i, line in enumerate(lines):
        m = re.match(r'^([a-dA-D])\.', line)
        if m:
            letter = m.group(1).lower()
            if letter in tf_map and '(Đ)' not in line and '(S)' not in line:
                lines[i] = line + ' ' + tf_map[letter]
                
    return '\n'.join(lines)

text = re.sub(r'(Câu\s+\d+\..*?)(Đáp án\s*:\s*[A-Da-d\s,ĐúngSaiđúngsai;\.\t]+(?:(?=\nCâu)|\Z))', repl_tf, text, flags=re.DOTALL)

with open(r'd:\Ontap\docs\sinh10.txt', 'w', encoding='utf-8') as f:
    f.write(text)
