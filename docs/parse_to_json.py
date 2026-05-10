# -*- coding: utf-8 -*-
"""
Convert sinh10.txt and su10.txt into data-loader compatible JSON files.
Auto-detect question mode.
"""
import json
import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

def parse_txt(filepath, subject_type):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = [line.strip() for line in f if line.strip()]
        
    lessons = []
    
    current_q = None
    
    def save_q():
        if not current_q or not lessons:
            return
            
        q_text = current_q.get('question', '')
        image_match = re.search(r'\[IMAGE:\s*(.*?)\]', q_text)
        if image_match:
            current_q['image'] = image_match.group(1)
            current_q['question'] = q_text.replace(image_match.group(0), '').strip()
            
        # Determine mode
        mode = 'mcq'
        if current_q['answer']:
            mode = 'sa'
        elif current_q['tf_answers'] or 'Đọc đoạn tư liệu' in current_q['question'] or 'đúng hay sai' in current_q['question'].lower() or 'phát biểu nào sau đây đúng, phát biểu nào sai' in current_q['question'].lower():
            mode = 'tf'
        else:
            # Check if options use uppercase A-D (MCQ) or lowercase a-d (TF)
            has_star = any('★' in opt for opt in current_q['options'])
            has_uppercase_abcd = any(re.match(r'^[★\s]*[A-D]\.', opt) for opt in current_q['options'])
            has_lowercase_abcd = any(re.match(r'^[a-d]\.', opt) for opt in current_q['options'])
            has_tf_markers = any('(Đ)' in opt or '(S)' in opt for opt in current_q['options'])
            
            # If options use uppercase A-D with ★, it's MCQ even if (Đ)/(S) present
            if has_uppercase_abcd and has_star:
                mode = 'mcq'
            elif has_lowercase_abcd and has_tf_markers:
                mode = 'tf'
            elif has_tf_markers and not has_uppercase_abcd:
                mode = 'tf'
            elif has_tf_markers and has_uppercase_abcd and not has_star:
                # Uppercase A-D with (Đ)/(S) but no ★ - treat as TF
                mode = 'tf'
                
        if mode == 'mcq':
            opts = current_q.get('options', [])
            correct_idx = 0
            clean_opts = []
            
            for i, opt in enumerate(opts):
                if '★' in opt:
                    correct_idx = i
                    opt = opt.replace('★', '')
                
                opt = re.sub(r'^[A-D]\.\s*', '', opt).strip()
                # Strip (Đ)/(S) markers from MCQ options
                opt = re.sub(r'\s*\([SĐ]\)\s*$', '', opt).strip()
                # Strip trailing section headers like "2. THÔNG HIỂU"
                opt = re.sub(r'\s+\d+\.\s*(NHẬN BIẾT|THÔNG HIỂU|VẬN DỤNG|VẬN DỤNG CAO)\s*$', '', opt).strip()
                clean_opts.append(opt)
                
            if clean_opts:
                lessons[-1]['questions'].append({
                    "type": "mcq",
                    "question": current_q['question'],
                    "image": current_q.get('image'),
                    "options": clean_opts,
                    "correct": correct_idx
                })
                
        elif mode == 'tf':
            passage = current_q['question']
            stmts = []
            
            for opt in current_q.get('options', []):
                stmt_text = opt
                # Optional remove a. b. c. d. or A. B. C. D.
                stmt_text = re.sub(r'^[a-dA-D]\.\s*', '', stmt_text).strip()
                
                correct = False
                if '(Đ)' in stmt_text:
                    correct = True
                    stmt_text = stmt_text.replace('(Đ)', '').strip()
                elif '(S)' in stmt_text:
                    correct = False
                    stmt_text = stmt_text.replace('(S)', '').strip()
                else:
                    prefix_match = re.match(r'^([a-dA-D])\.', opt)
                    if prefix_match:
                        letter = prefix_match.group(1).lower()
                        correct = current_q.get('tf_answers', {}).get(letter, False)
                
                # Filter empty statements
                if stmt_text:
                    stmts.append({
                        "question": stmt_text,
                        "correct": correct
                    })
                
            if stmts:
                lessons[-1]['questionGroups'].append({
                    "passage": passage,
                    "image": current_q.get('image'),
                    "statements": stmts
                })
                
        elif mode == 'sa':
            ans = current_q.get('answer', '')
            if ans:
                val = ans
                try:
                    val = float(ans)
                    if val.is_integer():
                        val = int(val)
                except ValueError:
                    pass
                
                lessons[-1]['questions'].append({
                    "type": "shortanswer",
                    "question": current_q['question'],
                    "image": current_q.get('image'),
                    "correctAnswer": [val] if not isinstance(val, list) else val
                })
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Lesson Header
        if re.match(r'^(BÀI|Bài)\s+\d+', line):
            save_q()
            current_q = None
            lessons.append({
                "name": line,
                "questions": [],
                "questionGroups": []
            })
            i += 1
            continue
            
        if not lessons:
            lessons.append({
                "name": "Bài 0: Mở đầu",
                "questions": [],
                "questionGroups": []
            })
            
        # Skip TỰ LUẬN sections entirely
        if re.match(r'^(PHẦN|I\.|II\.|III\.)', line) and ('TỰ LUẬN' in line.upper()):
            i += 1
            while i < len(lines):
                if re.match(r'^(BÀI|Bài)\s+\d+', lines[i]):
                    break
                i += 1
            continue
            
        # Ignore explicit section headers
        if re.match(r'^(PHẦN|I\.|II\.|III\.|\d+\.)', line) and ('CÂU HỎI' in line.upper() or 'TRẮC NGHIỆM' in line.upper() or 'ĐÚNG' in line.upper() or 'SAI' in line.upper()):
            i += 1
            continue
            
        # Question start
        if re.match(r'^(Câu\s+\d+[\.:])', line):
            save_q()
            current_q = {
                'question': line,
                'options': [],
                'tf_answers': {},
                'answer': ''
            }
            # Look ahead for question text
            i += 1
            while i < len(lines):
                next_l = lines[i]
                if re.match(r'^(Câu\s+\d+|[A-D]\.|★?[A-D]\.|[a-d]\.|\*\s*Đáp án|\*\s*Hướng dẫn|Đáp án:|ĐÁP ÁN:|BÀI|Bài)', next_l) or re.search(r'\([SĐ]\)', next_l):
                    # But wait, if next_l has (S)/(Đ) and does NOT start with a/b/c/d, it might be an option without letter
                    # In su10.txt, statements might not start with a. b. c. d.
                    # e.g., "Văn minh Ai Cập là ... (Đ)"
                    # We should treat it as an option
                    if re.match(r'^(Câu\s+\d+|★?[A-D]\.|\*\s*Đáp án|Đáp án|ĐÁP ÁN|BÀI|Bài)', next_l):
                        break
                    if re.match(r'^([a-d]\.)', next_l):
                        break
                    if re.search(r'\([SĐ]\)', next_l):
                        break # It's an option line, stop appending to question
                        
                current_q['question'] += ' ' + next_l
                i += 1
            
            current_q['question'] = re.sub(r'^Câu\s+\d+[\.:]\s*', '', current_q['question']).strip()
            continue
            
        if not current_q:
            i += 1
            continue
            
        # Options or answers
        if '* Hướng dẫn giải' in line or '* Hướng dẫn giải:' in line:
            i += 1
            while i < len(lines):
                next_l = lines[i]
                if re.match(r'^(Câu\s+\d+|PHẦN|I\.|II\.|III\.)', next_l):
                    break
                
                ans_matches = re.findall(r'([a-d])\.\s*([^\.]*?(?:Đúng|Sai|đúng|sai|Biết\s*Đúng|Biết\s*Sai|Hiểu\s*Đúng|Hiểu\s*Sai))', next_l, re.IGNORECASE)
                for m in ans_matches:
                    letter = m[0].lower()
                    is_correct = 'Đúng' in m[1] or 'đúng' in m[1]
                    current_q['tf_answers'][letter] = is_correct
                i += 1
            continue
            
        elif '* Đáp án' in line or 'Đáp án' in line or 'ĐÁP ÁN' in line:
            inline_ans = re.sub(r'^.*?(?:[Đđ]áp án|ĐÁP ÁN)\s*\:?\s*', '', line).strip()
            if inline_ans:
                current_q['answer'] = inline_ans
                i += 1
            else:
                i += 1
                if i < len(lines):
                    ans_text = lines[i]
                    m = re.match(r'^(\d+)', ans_text)
                    if m:
                        current_q['answer'] = m.group(1)
                    else:
                        current_q['answer'] = ans_text
                    i += 1
            continue
            
        elif re.match(r'^([★\s]*[A-D]\.)', line) or re.match(r'^([a-d]\.)', line) or re.search(r'\([SĐ]\)', line):
            current_q['options'].append(line)
        else:
            if current_q['options']:
                current_q['options'][-1] += ' ' + line
            else:
                current_q['question'] += ' ' + line
                
        i += 1

    save_q()
    
    for lesson in lessons:
        if not lesson['questions']: del lesson['questions']
        if not lesson['questionGroups']: del lesson['questionGroups']
        
    lessons = [l for l in lessons if l.get('questions') or l.get('questionGroups')]
    return {"lessons": lessons}

if __name__ == '__main__':
    sinh_data = parse_txt(r'D:\Ontap\docs\sinh10.txt', 'sinh')
    su_data = parse_txt(r'D:\Ontap\docs\su10.txt', 'su')
    
    with open(r'D:\Ontap\data\sinh.json', 'w', encoding='utf-8') as f:
        json.dump(sinh_data, f, ensure_ascii=False, indent=2)
        
    with open(r'D:\Ontap\data\su.json', 'w', encoding='utf-8') as f:
        json.dump(su_data, f, ensure_ascii=False, indent=2)
        
    print(f"Generated sinh.json ({len(sinh_data['lessons'])} lessons)")
    print(f"Generated su.json ({len(su_data['lessons'])} lessons)")
