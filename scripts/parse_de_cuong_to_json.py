#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Parse de_cuong_LS10_bai12-17.txt thành JSON schema cho data/su.json"""

import json
import os
import re
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

SRC_TXT = r'd:\Ontap\de_cuong_LS10_bai12-17.txt'
DST_JSON = r'd:\Ontap\data\su.json'

LESSON_RE = re.compile(r'^BÀI\s*\d+', re.IGNORECASE)
QUESTION_RE = re.compile(r'^Câu\s*(\d+)\s*[:.]\s*(.*)', re.IGNORECASE)
OPTION_RE = re.compile(r'^(?:=>\s*)?([ABCD])\.\s*(.*)')
TF_MARK_RE = re.compile(r'^(.*)\(([ĐS])\)\s*$')


def clean_text(s: str) -> str:
    s = s.replace('\r', ' ').replace('\n', ' ').replace('\t', ' ')
    s = re.sub(r'\s+', ' ', s)
    return s.strip()


def is_section_header(line: str) -> bool:
    upper = line.upper()
    return 'PHẦN I' in upper or 'PHAN I' in upper or 'PHẦN II' in upper or 'PHAN II' in upper


def is_new_question(line: str) -> bool:
    return QUESTION_RE.match(line.strip()) is not None


def parse_mcq_question(lines, idx):
    line = lines[idx].strip()
    m = QUESTION_RE.match(line)
    if not m:
        return None, idx + 1

    question_parts = [clean_text(m.group(2))]
    j = idx + 1

    while j < len(lines):
        s = lines[j].strip()
        if not s:
            j += 1
            continue
        if OPTION_RE.match(s) or is_section_header(s) or LESSON_RE.match(s):
            break
        if is_new_question(s):
            break
        question_parts.append(clean_text(s))
        j += 1

    options = []
    correct_idx = None
    current_option = None

    while j < len(lines):
        s = lines[j].strip()
        if not s:
            j += 1
            continue

        opt = OPTION_RE.match(s)
        if opt:
            if current_option is not None:
                options.append(current_option)
            current_option = clean_text(opt.group(2))
            if s.startswith('=>'):
                correct_idx = len(options)
            j += 1
            continue

        if current_option is not None and not is_new_question(s) and not is_section_header(s) and not LESSON_RE.match(s):
            current_option = clean_text(current_option + ' ' + s)
            j += 1
            continue

        break

    if current_option is not None:
        options.append(current_option)

    return {
        'type': 'mcq',
        'question': clean_text(' '.join(question_parts)),
        'image': None,
        'options': options,
        'correct': correct_idx if correct_idx is not None else 0,
    }, j


def next_nonempty_line(lines, idx):
    j = idx
    while j < len(lines):
        s = lines[j].strip()
        if s:
            return s, j
        j += 1
    return None, j


def looks_like_tf_statement_start(line: str, next_line: str | None = None) -> bool:
    s = line.strip()
    if s.endswith('(Đ)') or s.endswith('(S)') or s in {'(Đ)', '(S)'}:
        return True
    if next_line in {'(Đ)', '(S)'}:
        return True
    return False


def parse_tf_statement(lines, idx):
    parts = []
    j = idx
    truth = None

    while j < len(lines):
        s = lines[j].strip()
        if not s:
            j += 1
            continue

        if s in {'(Đ)', '(S)'}:
            truth = (s == '(Đ)')
            j += 1
            break

        m = TF_MARK_RE.match(s)
        if m:
            text = clean_text(m.group(1))
            if text:
                parts.append(text)
            truth = (m.group(2) == 'Đ')
            j += 1
            break

        # Check if next line is the marker
        next_line, _ = next_nonempty_line(lines, j + 1)
        if next_line in {'(Đ)', '(S)'}:
            parts.append(clean_text(s))
            truth = (next_line == '(Đ)')
            j += 2
            break

        if is_new_question(s) or is_section_header(s) or LESSON_RE.match(s):
            break

        parts.append(clean_text(s))
        j += 1

    if truth is None or not parts:
        return None, idx + 1

    return {
        'question': clean_text(' '.join(parts)),
        'correct': truth,
    }, j


def parse_true_false_group(lines, idx):
    line = lines[idx].strip()
    if not is_new_question(line):
        return None, idx + 1

    m = QUESTION_RE.match(line)
    first_text = clean_text(m.group(2))
    passage_parts = [first_text] if first_text else []
    j = idx + 1

    while j < len(lines):
        s = lines[j].strip()
        if not s:
            j += 1
            continue
        next_line, _ = next_nonempty_line(lines, j + 1)
        if looks_like_tf_statement_start(s, next_line):
            break
        if is_new_question(s) and passage_parts:
            break
        if is_section_header(s) or LESSON_RE.match(s):
            break
        passage_parts.append(clean_text(s))
        j += 1

    statements = []
    while j < len(lines) and len(statements) < 4:
        s = lines[j].strip()
        if not s:
            j += 1
            continue
        if is_new_question(s) or is_section_header(s) or LESSON_RE.match(s):
            break
        stmt, next_j = parse_tf_statement(lines, j)
        if stmt:
            statements.append(stmt)
            j = next_j
        else:
            break

    if not passage_parts or not statements:
        return None, idx + 1

    return {
        'passage': clean_text(' '.join(passage_parts)),
        'statements': statements,
    }, j


def parse_lesson(lines, start_idx):
    first_line = lines[start_idx].strip()
    if not LESSON_RE.match(first_line):
        return None, start_idx + 1

    lesson_name = clean_text(first_line)
    questions = []
    question_groups = []
    in_part_i = False
    in_part_ii = False
    i = start_idx + 1

    while i < len(lines):
        s = lines[i].strip()
        if LESSON_RE.match(s):
            break
        upper = s.upper()
        if 'PHẦN II' in upper or 'PHAN II' in upper:
            in_part_i = False
            in_part_ii = True
            i += 1
            continue
        if 'PHẦN I' in upper or 'PHAN I' in upper:
            in_part_i = True
            in_part_ii = False
            i += 1
            continue
        if 'PHẦN III' in upper or 'PHAN III' in upper or 'CÂU HỎI TỰ LUẬN' in upper:
            break

        if in_part_i and is_new_question(s):
            q, next_i = parse_mcq_question(lines, i)
            if q and q['options']:
                questions.append(q)
            i = next_i
            continue

        if in_part_ii and is_new_question(s):
            g, next_i = parse_true_false_group(lines, i)
            if g and g['statements']:
                question_groups.append(g)
            i = next_i
            continue

        i += 1

    return {
        'name': lesson_name,
        'questions': questions,
        'questionGroups': question_groups,
    }, i


def main():
    if not os.path.exists(SRC_TXT):
        print(f'Không tìm thấy file: {SRC_TXT}')
        return

    with open(SRC_TXT, 'r', encoding='utf-8') as f:
        lines = f.read().split('\n')

    start_idx = 0
    for i, line in enumerate(lines):
        if line.strip().startswith('BÀI 12'):
            start_idx = i
            break

    lessons = []
    i = start_idx
    while i < len(lines):
        s = lines[i].strip()
        if not s:
            i += 1
            continue
        if LESSON_RE.match(s):
            lesson, next_i = parse_lesson(lines, i)
            if lesson and (lesson['questions'] or lesson['questionGroups']):
                lessons.append(lesson)
            i = next_i
        else:
            i += 1

    output = {'lessons': lessons}
    with open(DST_JSON, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f'Đã xuất ra: {DST_JSON}')
    print(f'Tổng số bài: {len(lessons)}')
    print(f'Tổng số câu trắc nghiệm: {sum(len(x["questions"]) for x in lessons)}')
    print(f'Tổng số bộ đúng/sai: {sum(len(x["questionGroups"]) for x in lessons)}')


if __name__ == '__main__':
    main()
