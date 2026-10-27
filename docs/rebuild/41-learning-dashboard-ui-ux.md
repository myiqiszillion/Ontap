# NTMK REBUILD — PHASE 03B LEARNING DASHBOARD UI/UX ARCHITECTURE & IMPLEMENTATION
## HUMAN-CENTERED DESIGN, ACCESSIBILITY, FOCUS MODE & ADAPTIVE STUDY VISUALIZATION

**Author:** Principal UI/UX Designer, Senior Full-Stack Engineer  
**Status:** IMPLEMENTED & BROWSER VERIFIED  
**Date:** 2026-10-11  

---

## 1. Executive Summary

Phase 03B turns NTMK into an active personal study coach. Instead of overwhelming the student with complex administrative menus or high-stress countdown timers, the Personalized Study Dashboard focuses on answering four fundamental questions immediately upon loading:

1. **Hôm nay tôi cần học gì?** (What do I need to study today?)
2. **Vì sao tôi cần học nội dung này?** (Why was this specific skill recommended?)
3. **Tôi đã hoàn thành đến đâu?** (Where am I relative to my target?)
4. **Tiếp theo tôi nên làm gì?** (What is my immediate next action?)

All visual components adhere to the established Phase 01 / Phase 03A design tokens (CSS custom properties, semantic color palettes, accessible contrasts, responsive flex/grid layouts, KaTeX mathematical typesetting, and complete dark/light mode compatibility).

---

## 2. Core Pedagogical & Psychological Principles

### 2.1 Anti-Stress & Non-Defeatist Communication
- **No punitive red alarms:** Deficit skills are categorized with supportive labels such as `Cần củng cố` (Needs consolidation) or `Cần kiểm tra thêm` (Needs further assessment) rather than "Yếu kém" or "Thất bại".
- **Strictly transparent reasoning:** Every task card displays a concrete pedagogical explanation (e.g. *"Lỗ hổng kiến thức nghiêm trọng (độ sâu 0.35). Kỹ năng này là tiên quyết cho 2 kỹ năng nâng cao"*).
- **Realistic workload boundaries:** The system strictly respects the student's self-declared daily study budget (15–180 minutes) and planned rest days. Overdue tasks are gracefully postponed rather than piled on to create an insurmountable backlog.

### 2.2 Cognitive Load Management
- Secondary data (raw formula parameters, matrix breakdowns, historical snapshots) are kept tucked in collapsible sections or detailed inspection tabs.
- Active practice occurs within an isolated **Focus Mode workspace**, hiding distracting navigation bars and unneeded interface chrome.

---

## 3. Screen Specifications & Architecture

### Screen A: Today's Learning Dashboard (`today` view)
- **Today's Metric Summary Bar:**
  - Tasks completed vs total scheduled for today (`X / Y hoàn thành`).
  - Total estimated study duration formatted in minutes (`30 phút`).
  - Active study streak and priority focus skill.
- **Priority Action Hero:** Direct call-to-action to begin the top-priority uncompleted task (`Bắt đầu ngay` or `Tiếp tục bài đang làm`).
- **Today's Task List:** Clean card stack displaying:
  - Subject badge (Toán, Vật lí, Hóa học, Tiếng Anh).
  - Task type badge (Luyện tập kỹ năng, Ôn kiến thức nền, Ôn câu sai, Kiểm tra đánh giá).
  - Skill title & pedagogical rationale badge (`Vì sao cần học?`).
  - Estimated duration (15m, 20m, 30m).
  - Task state (`Chưa làm`, `Đang làm`, `Hoàn thành`, `Bị khóa`).

### Screen B: My Study Plan (`plan` view)
- **Plan Meta Header:** Displays plan duration (7, 14, 30 days or Exam Target), daily time budget, active study days, and current plan version (`Phiên bản 1.0`).
- **Timeline / Daily Schedule:** Grouped daily agenda spanning the plan horizon:
  - Date header with weekday indication (e.g. `Thứ Hai, 12/10/2026`).
  - Rest-day indicator: Clearly shows `Ngày nghỉ theo lịch` when student configured a non-study day.
  - Task sequence preserving topological prerequisite order (foundations before advanced applications).
  - Quick action controls: `Bắt đầu`, `Dời ngày` (Postpone to next study day).

### Screen C: Focus Mode (`focus` view)
- **Distraction-Free Workspace:**
  - Active session header with task title, skill identifier, and exit/pause button.
  - Optional progress countdown / elapsed timer.
  - Question presentation supporting rich LaTeX formatting via KaTeX (`renderMathInElement`).
  - Accessible answer submission for MCQ, True/False statements, and Short Answer numerical inputs.
  - Immediate pedagogically sound feedback showing detailed step-by-step solutions without exposing authoritative answer keys prior to submission.
  - Completion summary screen celebrating practice completion, recording score accuracy, and inviting the student back to Today's Dashboard.

### Screen D: Skill Progress & Evidence (`progress` view)
- **Grounded Competency Meters:**
  - Displays skill mastery estimates categorized as `Chưa thành thạo` (< 0.50), `Đang phát triển` (0.50–0.69), `Thành thạo` (0.70–0.84), or `Rất vững` (≥ 0.85).
  - **Evidence Count Transparency:** Explicitly tags skills with low observation count (`Ít dữ liệu (< 3 câu) - cần kiểm tra thêm`).
  - Spaced Repetition Review Deck: Shows scheduled review dates, review intervals (1, 3, 7, 14, 30 days), and retention stability.

### Screen E: Learning Plan Settings (`settings` view)
- **Editable Profile Parameters:**
  - Priority subjects selection checkboxes.
  - Primary learning goal dropdown (`Củng cố kiến thức trên lớp`, `Ôn thi học kỳ`, `Luyện thi tốt nghiệp THPT`).
  - Optional target exam score (0.0 – 10.0 scale) and exam target date picker.
  - Daily time budget slider (15 to 180 minutes, default 45m).
  - Weekly study schedule checkboxes (Thứ 2 đến Chủ nhật).
  - Direct `Lưu & Tái lập kế hoạch` (Save & Regenerate Plan) action.

### Screen F: Plan Changes & Audit Log (`changes` view)
- **Transparent Adaptation Log:**
  - Explains the specific event triggering the plan change (e.g. `replan_after_practice`, `goal_changed`, `session_postponed`).
  - Before/after task comparison summary.
  - Displays which skills were prioritized, which were spaced out, and which tasks were rescheduled.

---

## 4. Accessibility & Responsive Specifications

| Dimension | Specification | Implementation in NTMK |
|:---|:---|:---|
| **Responsive Grid** | Mobile (320px–767px), Tablet (768px–1023px), Desktop (≥ 1024px) | CSS Flexbox & CSS Grid with fluid clamp units (`public/css/planner.css`) |
| **Color Contrast** | WCAG 2.2 AA (≥ 4.5:1 text, ≥ 3.0:1 UI components) | Semantic tokens with dedicated dark-mode overrides in `:root` and `[data-theme="dark"]` |
| **Keyboard Navigation** | Full TabIndex order, visible focus rings, Escape to exit Focus Mode | Native button elements, `tabindex="0"`, custom `:focus-visible` styling |
| **Screen Reader Semantics** | ARIA roles, progress indicators, accessible alert states | `role="region"`, `role="progressbar"`, `aria-valuenow`, `aria-label` |
| **Mathematical Typesetting** | KaTeX fast auto-render for formulas and equations | `renderMathInElement` integrated in `public/js/planner-view.js` |

---

## 5. Verification & Browser E2E Evidence

The interface was comprehensively tested in a live headless browser environment on port 3001:
- **E2E Flow Captured:** `planner_e2e_flow_1791734630580.webp` (Artifact).
- **Screenshots Preserved:**
  - `planner_view_1791734660894.png`: Full desktop rendering of Today's Learning Dashboard.
  - `resized_planner_view_1791734782535.png`: Mobile/Tablet responsive layout check.
  - `planner_bottom_view_1791734834313.png`: Timeline schedule and rest-day cards.
  - `diagnostic_and_planner_scrolled_1791734871038.png`: Seamless transition from Diagnostic Assessment report to Study Plan generation.
