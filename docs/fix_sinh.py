# -*- coding: utf-8 -*-
"""Fix all issues in sinh.json"""
import json, re, sys, copy
sys.stdout.reconfigure(encoding='utf-8')

with open(r'D:\Ontap\data\sinh.json', encoding='utf-8') as f:
    data = json.load(f)

fixes = 0

for li, lesson in enumerate(data['lessons']):
    name = lesson['name']
    
    # ═══════════════════════════════════════════════════════
    # FIX 1: Questions with empty options + string correct → shortanswer
    # ═══════════════════════════════════════════════════════
    for qi, q in enumerate(lesson.get('questions', [])):
        opts = q.get('options', [])
        correct = q.get('correct')
        
        if len(opts) == 0 and isinstance(correct, str):
            answer = correct.strip()
            answer = re.sub(r'^Đáp án:\s*', '', answer)
            answer = answer.rstrip('/ ')
            q['type'] = 'shortanswer'
            q['correctAnswer'] = answer
            del q['correct']
            if 'options' in q:
                del q['options']
            fixes += 1
            print(f"  [FIX] Bai {li+1} MCQ{qi+1} → shortanswer: '{answer}'")
    
    # ═══════════════════════════════════════════════════════
    # FIX 2: MCQ with 3 options where question = option A
    # ═══════════════════════════════════════════════════════
    for qi, q in enumerate(lesson.get('questions', [])):
        opts = q.get('options', [])
        correct = q.get('correct')
        if len(opts) == 3 and isinstance(correct, int) and q.get('question', '').strip().startswith('A.'):
            option_a = re.sub(r'^A\.\s*', '', q['question']).strip()
            q['options'] = [option_a] + opts
            q['correct'] = correct + 1
            # Try to recover the real question from context - set generic
            q['question'] = q['question']  # keep as-is, it's the best we have
            fixes += 1
            print(f"  [FIX] Bai {li+1} MCQ{qi+1}: Added option A back, 3→4 options")

    # ═══════════════════════════════════════════════════════
    # FIX 3: TF groups - remove trailing junk statements
    # ═══════════════════════════════════════════════════════
    for gi, group in enumerate(lesson.get('questionGroups', [])):
        stmts = group.get('statements', [])
        removed = 0
        while len(stmts) > 4:
            last = stmts[-1]
            lq = last['question'].strip()
            if lq.startswith('Hướng dẫn') or lq.startswith('* Hướng dẫn') or lq == '* Hướng dẫn giải:':
                stmts.pop()
                removed += 1
            else:
                break
        if removed:
            group['statements'] = stmts
            fixes += removed
            print(f"  [FIX] Bai {li+1} TF{gi+1}: Removed {removed} junk statements, now {len(stmts)}")

    # ═══════════════════════════════════════════════════════
    # FIX 4: Clean passages - remove answer keys
    # ═══════════════════════════════════════════════════════
    for gi, group in enumerate(lesson.get('questionGroups', [])):
        orig = group.get('passage', '')
        p = orig
        p = re.sub(r'\s*Trả lời:.*$', '', p, flags=re.DOTALL)
        p = re.sub(r'\s*\*?\s*Hướng dẫn giải:?\s*.*$', '', p, flags=re.DOTALL)
        p = re.sub(r'\s*Hướng dẫn giải\s*$', '', p)
        p = re.sub(r'\s*Hướng dẫn:\s*$', '', p)
        p = re.sub(r'\s*\*?\s*Đáp án:.*$', '', p, flags=re.DOTALL)
        p = re.sub(r'^\s*:\s*', '', p)
        p = p.strip()
        if p != orig.strip():
            group['passage'] = p
            fixes += 1
            print(f"  [FIX] Bai {li+1} TF{gi+1}: Cleaned passage")

# ═══════════════════════════════════════════════════════
# FIX 5: Specific broken TF groups - Bài 24 (1-statement groups)
# ═══════════════════════════════════════════════════════
for li, lesson in enumerate(data['lessons']):
    if 'QUÁ TRÌNH TỔNG HỢP VÀ PHÂN GIẢI' in lesson['name']:
        groups = lesson.get('questionGroups', [])
        
        # TF Group 2 - Sữa chua (index 1)
        if len(groups) > 1 and len(groups[1].get('statements', [])) == 1:
            groups[1]['passage'] = "Sữa chua là một chế phẩm sữa được sản xuất bằng cách lên men sữa bò tươi, sữa bột hay sữa động vật nói chung. Sữa chua là một thực phẩm rất thơm ngon và bổ dưỡng cho con người. Dựa trên thông tin và kiến thức đã học, phát biểu sau đây là Đúng hay Sai về quá trình làm sữa chua."
            groups[1]['statements'] = [
                {"question": "Quá trình làm sữa chua thực chất là quá trình phân giải carbohydrate của vi sinh vật.", "correct": True},
                {"question": "Lên men sữa chua là lên men ethanol.", "correct": False},
                {"question": "Quá trình lên men sữa chua có sự tham gia của vi khuẩn lactic dị hình.", "correct": False},
                {"question": "Quá trình lên men sữa chua có tạo ra ethanol và acetic acid.", "correct": False}
            ]
            fixes += 1
            print(f"  [FIX] Bai {li+1} TF2: Rebuilt sữa chua → 4 statements")
        
        # TF Group 3 - Tổng hợp carbohydrate (index 2)
        if len(groups) > 2 and len(groups[2].get('statements', [])) == 1:
            groups[2]['passage'] = "Các phát biểu sau là Đúng hay Sai về quá trình tổng hợp carbohydrate ở vi sinh vật:"
            groups[2]['statements'] = [
                {"question": "Ở vi khuẩn và tảo, việc tổng hợp tinh bột và glycogen không cần hợp chất mở đầu.", "correct": False},
                {"question": "Sản phẩm của quá trình tổng hợp carbohydrate là polypeptide.", "correct": False},
                {"question": "Một số vi sinh vật còn tổng hợp chitin và cellulose.", "correct": True},
                {"question": "Gôm bản chất là một loại polysaccharide mà vi sinh vật tiết vào môi trường.", "correct": True}
            ]
            fixes += 1
            print(f"  [FIX] Bai {li+1} TF3: Rebuilt carbohydrate → 4 statements")
        break

# ═══════════════════════════════════════════════════════
# FIX 6: Bài 25 TF group 1 - only 2 statements → 4
# ═══════════════════════════════════════════════════════
for li, lesson in enumerate(data['lessons']):
    if 'SINH TRƯỞNG VÀ SINH SẢN' in lesson['name']:
        groups = lesson.get('questionGroups', [])
        if len(groups) > 0 and len(groups[0].get('statements', [])) == 2:
            groups[0]['passage'] = "Sự sinh trưởng của một quần thể vi khuẩn được thể hiện như sơ đồ bên. Phân tích sơ đồ và cho biết mỗi nhận định sau đây là Đúng hay Sai?"
            groups[0]['statements'] = [
                {"question": "Đây là sự sinh trưởng của quần thể vi khuẩn trong môi trường nuôi cấy không liên tục.", "correct": True},
                {"question": "Để thu được sinh khối tối đa người ta sẽ thu ở cuối pha số (3).", "correct": False},
                {"question": "Tốc độ sinh trưởng của quần thể vi khuẩn ở pha số (2) cao hơn pha số (3).", "correct": True},
                {"question": "Pha số (1), vi khuẩn không sinh trưởng vì lượng chất dinh dưỡng rất ít.", "correct": False}
            ]
            fixes += 1
            print(f"  [FIX] Bai {li+1} TF1: Rebuilt sinh trưởng → 4 statements")
        break

# ═══════════════════════════════════════════════════════
# FIX 7: Correct wrong TF answer values using passage hints
# ═══════════════════════════════════════════════════════

# Bài 17
for li, lesson in enumerate(data['lessons']):
    if 'Bài 17' in lesson['name']:
        groups = lesson.get('questionGroups', [])
        # Group 2 (index 1): c="xa nhau tiếp xúc trực tiếp"→Sai, d="gần hệ tuần hoàn"→Sai
        if len(groups) > 1:
            for s in groups[1]['statements']:
                if 'xa nhau' in s['question'] and 'tiếp xúc trực tiếp' in s['question']:
                    s['correct'] = False; fixes += 1
                if 'gần' in s['question'] and 'hệ tuần hoàn' in s['question']:
                    s['correct'] = False; fixes += 1
        # Group 3 (index 2): b="glucagon giảm đường"→Sai (insulin mới giảm)
        if len(groups) > 2:
            for s in groups[2]['statements']:
                if 'glucagon' in s['question'] and 'giảm' in s['question']:
                    s['correct'] = False; fixes += 1
        break

# Bài 18: Fix all TF groups based on passage hints
for li, lesson in enumerate(data['lessons']):
    if 'Bài 18' in lesson['name']:
        groups = lesson.get('questionGroups', [])
        # a→Đ, b,c→S (chuyển tiếp), d→S (G2/M)
        if len(groups) > 0 and len(groups[0]['statements']) >= 4:
            groups[0]['statements'][0]['correct'] = True
            groups[0]['statements'][1]['correct'] = False
            groups[0]['statements'][2]['correct'] = False
            groups[0]['statements'][3]['correct'] = False
            fixes += 1; print(f"  [FIX] Bai {li+1} TF1: Fixed correct values")
        # a,c→Đ, b→S (chuyển tiếp), d→S (G1)
        if len(groups) > 1 and len(groups[1]['statements']) >= 4:
            groups[1]['statements'][0]['correct'] = True
            groups[1]['statements'][1]['correct'] = False
            groups[1]['statements'][2]['correct'] = True
            groups[1]['statements'][3]['correct'] = False
            fixes += 1; print(f"  [FIX] Bai {li+1} TF2: Fixed correct values")
        # a→S (pha G1), b→S (pha S), c,d→Đ
        if len(groups) > 2 and len(groups[2]['statements']) >= 4:
            groups[2]['statements'][0]['correct'] = False
            groups[2]['statements'][1]['correct'] = False
            groups[2]['statements'][2]['correct'] = True
            groups[2]['statements'][3]['correct'] = True
            fixes += 1; print(f"  [FIX] Bai {li+1} TF3: Fixed correct values")
        # a,b,c→Đ, d→S
        if len(groups) > 3 and len(groups[3]['statements']) >= 4:
            groups[3]['statements'][0]['correct'] = True
            groups[3]['statements'][1]['correct'] = True
            groups[3]['statements'][2]['correct'] = True
            groups[3]['statements'][3]['correct'] = False
            fixes += 1; print(f"  [FIX] Bai {li+1} TF4: Fixed correct values")
        # a→S (nhân sơ trực phân), b→S (gồm chuẩn bị+phân chia), c,d→Đ
        if len(groups) > 4 and len(groups[4]['statements']) >= 4:
            groups[4]['statements'][0]['correct'] = False
            groups[4]['statements'][1]['correct'] = False
            groups[4]['statements'][2]['correct'] = True
            groups[4]['statements'][3]['correct'] = True
            fixes += 1; print(f"  [FIX] Bai {li+1} TF5: Fixed correct values")
        # a→S, b→S (tạo 2 tb con), c,d→Đ
        if len(groups) > 5 and len(groups[5]['statements']) >= 4:
            groups[5]['statements'][0]['correct'] = False
            groups[5]['statements'][1]['correct'] = False
            groups[5]['statements'][2]['correct'] = True
            groups[5]['statements'][3]['correct'] = True
            fixes += 1; print(f"  [FIX] Bai {li+1} TF6: Fixed correct values")
        # a,b,d→Đ, c→S (G2/M)
        if len(groups) > 6 and len(groups[6]['statements']) >= 4:
            groups[6]['statements'][0]['correct'] = True
            groups[6]['statements'][1]['correct'] = True
            groups[6]['statements'][2]['correct'] = False
            groups[6]['statements'][3]['correct'] = True
            fixes += 1; print(f"  [FIX] Bai {li+1} TF7: Fixed correct values")
        break

# Bài 19 TF corrections
for li, lesson in enumerate(data['lessons']):
    if 'Bài 19' in lesson['name']:
        groups = lesson.get('questionGroups', [])
        # Group 2 (index 1): a→Đ, b→S (vùng sinh sản), c→S (GP1: 2 hàng, GPII: 1 hàng), d→S
        if len(groups) > 1 and len(groups[1]['statements']) >= 4:
            groups[1]['statements'][0]['correct'] = True
            groups[1]['statements'][1]['correct'] = False
            groups[1]['statements'][2]['correct'] = False
            groups[1]['statements'][3]['correct'] = False
            fixes += 1
        # Group 4 (index 3): a→Đ, b→Đ, c→S (16 tâm động, not correct), d→S
        if len(groups) > 3 and len(groups[3]['statements']) >= 4:
            groups[3]['statements'][0]['correct'] = True
            groups[3]['statements'][1]['correct'] = True
            groups[3]['statements'][2]['correct'] = False
            groups[3]['statements'][3]['correct'] = False
            fixes += 1
        # Group 5 (index 4): a→S (kì giữa), b→Đ, c→S, d→Đ
        if len(groups) > 4 and len(groups[4]['statements']) >= 4:
            groups[4]['statements'][0]['correct'] = False
            groups[4]['statements'][1]['correct'] = True
            groups[4]['statements'][2]['correct'] = False
            groups[4]['statements'][3]['correct'] = True
            fixes += 1
        # Group 6 (index 5): a,b→Đ, c→S (kì giữa), d→S (kì sau)
        if len(groups) > 5 and len(groups[5]['statements']) >= 4:
            groups[5]['statements'][0]['correct'] = True
            groups[5]['statements'][1]['correct'] = True
            groups[5]['statements'][2]['correct'] = False
            groups[5]['statements'][3]['correct'] = False
            fixes += 1
        break

# Bài 22 TF: "Vi khuẩn nhân thực" → Sai (nhân sơ)
for li, lesson in enumerate(data['lessons']):
    if 'Bài 22' in lesson['name']:
        groups = lesson.get('questionGroups', [])
        if len(groups) > 1:
            for s in groups[1]['statements']:
                if 'Vi khuẩn' in s['question'] and 'nhân th' in s['question']:
                    s['correct'] = False; fixes += 1
        break

# Bài 23 TF corrections
for li, lesson in enumerate(data['lessons']):
    if 'Bài 23' in lesson['name']:
        groups = lesson.get('questionGroups', [])
        # Group 1: b→S (que cấy gạt mô tả sai)
        if len(groups) > 0 and len(groups[0]['statements']) >= 4:
            groups[0]['statements'][1]['correct'] = False; fixes += 1
        # Group 2: d→S (chỉ cấy lactic)
        if len(groups) > 1 and len(groups[1]['statements']) >= 4:
            groups[1]['statements'][3]['correct'] = False; fixes += 1
        break

# Bài 27 TF: penicillin
for li, lesson in enumerate(data['lessons']):
    if 'Bài 27' in lesson['name']:
        groups = lesson.get('questionGroups', [])
        # Group 2: a→S (penicillin từ nấm, ko phải vi khuẩn), d→S (ko trị virus)
        if len(groups) > 1 and len(groups[1]['statements']) >= 4:
            groups[1]['statements'][0]['correct'] = False; fixes += 1
            groups[1]['statements'][3]['correct'] = False; fixes += 1
        # Group 3: b→S (enzyme protease/amylase, ko phải lipaza)
        if len(groups) > 2 and len(groups[2]['statements']) >= 4:
            groups[2]['statements'][1]['correct'] = False; fixes += 1
        # Group 4: d→S (vaccine chứa VS giảm độc lực, ko phải cao)
        if len(groups) > 3 and len(groups[3]['statements']) >= 4:
            groups[3]['statements'][3]['correct'] = False; fixes += 1
        break

# Bài 29 TF: HIV
for li, lesson in enumerate(data['lessons']):
    if 'Bài 29' in lesson['name']:
        groups = lesson.get('questionGroups', [])
        # Group 1: a→S (HIV là RNA), b→S (chỉ lây nhiễm tế bào CD4)
        if len(groups) > 0 and len(groups[0]['statements']) >= 4:
            groups[0]['statements'][0]['correct'] = False; fixes += 1
            groups[0]['statements'][1]['correct'] = False; fixes += 1
        break

# ═══════════════════════════════════════════════════════
# FIX 8: Bài 26 MCQ1 only 2 options → add missing options
# ═══════════════════════════════════════════════════════
for li, lesson in enumerate(data['lessons']):
    if 'Bài 26' in lesson['name']:
        q = lesson['questions'][0]
        if len(q.get('options', [])) == 2:
            q['options'] = [
                "nghiên cứu, ứng dụng vi sinh vật và hoặc các dẫn xuất để tạo ra sản phẩm phục vụ đời sống con người.",
                "nghiên cứu, ứng dụng vi sinh vật trong sản xuất, chế biến các sản phẩm xử lí ô nhiễm môi trường.",
                "nghiên cứu, phân loại các loại vi sinh vật trong tự nhiên.",
                "nghiên cứu cấu trúc di truyền của vi sinh vật."
            ]
            q['correct'] = 0
            fixes += 1
            print(f"  [FIX] Bai {li+1} MCQ1: Added missing options 2→4")
        break

# ═══════════════════════════════════════════════════════
# FIX 9: Bài 21 MCQ14 only 3 options
# ═══════════════════════════════════════════════════════
for li, lesson in enumerate(data['lessons']):
    if 'Bài 21' in lesson['name']:
        for qi, q in enumerate(lesson.get('questions', [])):
            if 'mô nào từ cơ thể thực vật' in q.get('question', '') and len(q.get('options', [])) == 3:
                q['options'] = [
                    "Mô phân sinh.",
                    "Mô phần vỏ.",
                    "Mô gỗ.",
                    "Mô biểu bì."
                ]
                q['correct'] = 0
                fixes += 1
                print(f"  [FIX] Bai {li+1} MCQ{qi+1}: Fixed 3→4 options")
        break

# Save
with open(r'D:\Ontap\data\sinh.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"\n✅ Total fixes applied: {fixes}")
print("File saved: sinh.json")
