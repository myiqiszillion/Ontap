import sys, re
sys.stdout.reconfigure(encoding='utf-8')
with open(r'd:\Ontap\docs\sinh10.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix short answers that have extra text
text = re.sub(r'Đáp án\s*:\s*2\s*\(1 và 3\)', r'Đáp án: 2', text)
text = re.sub(r'Đáp án\s*:\s*(?:\:\s*)?Có 4 phát biểu đúng', r'Đáp án: 4', text)
text = re.sub(r'Đáp án\s*:\s*3\s*\(tiềm phát, lũy thừa, cân bằng\)', r'Đáp án: 3', text)
text = re.sub(r'Đáp án\s*:\s*1\s*\(chỉ phát biểu 4 đúng\)', r'Đáp án: 1', text)
text = re.sub(r'Đáp án\s*:\s*3\s*\(1,\s*2\s*và\s*3\)', r'Đáp án: 3', text)

# Convert pseudo-TF questions that use "Đáp án: A đúng; B sai..." to use inline (Đ) / (S)
def repl_tf(match):
    chunk = match.group(0)
    ans_line = match.group(2)
    # Extract correctness for each letter
    tf_map = {}
    ans_parts = re.findall(r'([A-D])\s*([Đđ]úng|[Ss]ai)', ans_line)
    for letter, status in ans_parts:
        if 'đúng' in status.lower():
            tf_map[letter.lower()] = '(Đ)'
        else:
            tf_map[letter.lower()] = '(S)'
    
    if not tf_map: return chunk # Couldn't parse, leave as is
    
    # Remove the whole "Đáp án:" line
    chunk = chunk.replace(ans_line, '')
    
    # Inject into the options
    lines = chunk.split('\n')
    for i, line in enumerate(lines):
        m = re.match(r'^([a-dA-D])\.', line)
        if m:
            letter = m.group(1).lower()
            if letter in tf_map and '(Đ)' not in line and '(S)' not in line:
                lines[i] = line + ' ' + tf_map[letter]
                
    return '\n'.join(lines)

# Apply replacement to blocks starting with 'Câu X' and ending with 'Đáp án: ...'
text = re.sub(r'(Câu\s+\d+\..*?)(Đáp án\s*:\s*[A-Da-d\s,ĐúngSaiđúngsai;]+(?:(?=\nCâu)|\Z))', repl_tf, text, flags=re.DOTALL)

with open(r'd:\Ontap\docs\sinh10.txt', 'w', encoding='utf-8') as f:
    f.write(text)
    
print("Fixed short answers!")
