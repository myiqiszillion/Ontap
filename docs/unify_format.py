# -*- coding: utf-8 -*-
"""
Unify and clean the text formatting of sinh10.txt and su10.txt
"""
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

def unify_txt(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()

    # 1. Standardize BÀI headers
    text = re.sub(r'(?i)^(bài)\s+(\d+)[\.:]\s*', r'BÀI \2: ', text, flags=re.MULTILINE)
    
    # 2. Standardize Câu headers
    text = re.sub(r'(?i)^(câu)\s+(\d+)[\.:]\s*', r'Câu \2. ', text, flags=re.MULTILINE)

    # 3. Fix double stars and spaces in stars
    text = re.sub(r'★\s*★', '★', text)
    text = re.sub(r'★\s+([A-D])\.', r'★\1.', text)
    
    # 4. Break options on the same line into separate lines
    # Sometimes options are tab-separated or space-separated: "A. xxx   B. yyy   ★C. zzz"
    # We find A., B., C., D. (with or without star) and insert newlines if they are not at the start of the line
    # But ONLY if they are proceeded by space/tab to avoid splitting inside a sentence like "Vitamin A. "
    # Regex: match space/tab before ★?[A-D]\.
    text = re.sub(r'(?<=\s)(★?[A-D]\.)', r'\n\1', text)
    
    # Also if they are right after a question mark or word (no space)
    text = re.sub(r'(?<=[^\n])(★?[A-D]\.)', r'\n\1', text)
    
    # 5. Clean up multiple blank lines
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # 6. Normalize Short Answer "Đáp án"
    text = re.sub(r'^\*\s*(Đáp án|Hướng dẫn giải):?\s*', r'\1: ', text, flags=re.MULTILINE)
    
    # 7. TF matching: In sinh10.txt, there is `Hướng dẫn giải:\n a. Đúng...`
    # Let's keep it as is, or convert to inline (Đ)/(S) for consistency?
    # It's easier to let parser handle both `a. (Đ)` and `Hướng dẫn giải`, but since user wants 1 unified format,
    # let's write a quick routine to inline TF answers for sinh10!
    
    lines = text.split('\n')
    new_lines = []
    
    tf_answers = {}
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Strip trailing tabs/spaces
        line = line.rstrip()
        
        if line.startswith('Hướng dẫn giải:'):
            # Parse the explanation lines
            # Example:
            # Hướng dẫn giải:
            # a. Đúng. b. Sai. c. Đúng. d. Sai.
            # We don't append this line
            i += 1
            while i < len(lines):
                next_l = lines[i].strip()
                if re.match(r'^(Câu\s+\d+|BÀI|PHẦN|I\.|II\.|III\.)', next_l):
                    break
                
                # Extract a. Đúng, etc.
                matches = re.findall(r'([a-d])\.\s*([^\.]*?(?:Đúng|Sai|đúng|sai))', next_l, re.IGNORECASE)
                for m in matches:
                    letter = m[0].lower()
                    is_correct = 'Đúng' in m[1] or 'đúng' in m[1]
                    tf_answers[letter] = '(Đ)' if is_correct else '(S)'
                i += 1
                
            # Now we need to go back and inject (Đ)/(S) into the a. b. c. d. lines of the CURRENT question
            # Backtrack new_lines to find the options
            for j in range(len(new_lines)-1, max(-1, len(new_lines)-20), -1):
                opt_match = re.match(r'^([a-d])\.', new_lines[j])
                if opt_match:
                    letter = opt_match.group(1).lower()
                    if letter in tf_answers and '(Đ)' not in new_lines[j] and '(S)' not in new_lines[j]:
                        new_lines[j] += f' {tf_answers[letter]}'
            
            tf_answers = {} # reset
            continue
            
        if line:
            new_lines.append(line)
        i += 1

    # Re-join
    text = '\n'.join(new_lines)
    
    # 8. Clean up extra empty lines again after removal of Hướng dẫn giải
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(text)

unify_txt(r'D:\Ontap\docs\sinh10.txt')
unify_txt(r'D:\Ontap\docs\su10.txt')

print("✅ Text files unified successfully!")
