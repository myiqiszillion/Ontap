# NTMK REBUILD — STUDY PLANNER & SCHEDULING ENGINE
## TOPOLOGICAL CONSTRAINTS, BUDGET COMPLIANCE & CONTENT VERIFICATION

**Document ID:** `docs/rebuild/39-study-planner-and-scheduling.md`  
**Engines:** `engine/planner/personalized-study-planner.js`, `engine/planner/study-schedule-optimizer.js`  
**Verification:** Tested in `tests/study-planner-scheduling.test.js`  

---

## 1. Plan Duration Resolving

The study planner dynamically resolves the plan duration:
- Explicit student request: 7, 14, or 30 days.
- Declared target exam date:
  - $\le 10$ days until exam: 7-day intensive plan.
  - $11 - 21$ days until exam: 14-day standard plan.
  - $> 21$ days until exam: 30-day extended plan.
- Default: 14 days (standard bi-weekly cycle).

---

## 2. Typed Study Task Schema

Every generated `StudyTask` strictly adheres to the authoritative schema:

| Property | Type | Description |
| :--- | :--- | :--- |
| `taskId` | `string` | Unique task ID: `task-{planId}-{seq}` |
| `planId` | `string` | Plan reference: `plan-{userId}-{timestamp}` |
| `subjectId` | `string` | Subject: `toan`, `vatli`, `hoahoc`, `tienganh` |
| `skillId` | `string` | Standardized curriculum skill ID |
| `topicId` | `string` | Topic / chapter identifier |
| `taskType` | `string` | `remediation`, `adaptive_practice`, `wrong_review`, `spaced_review`, `followup_assessment` |
| `title` | `string` | Human-readable title in Vietnamese |
| `reason` | `string` | Pedagogical explanation |
| `difficulty` | `string` | `easy`, `medium`, `hard` |
| `estimatedMinutes` | `number` | 15 - 30 minutes (bounded by daily budget) |
| `scheduledDate` | `string` | Calendar date (YYYY-MM-DD) in `Asia/Ho_Chi_Minh` |
| `questionSetReference` | `string[] \| null` | Array of verified question IDs (or `null` if blocked) |
| `prerequisiteReferences` | `string[]` | Array of prerequisite skill IDs |
| `status` | `string` | `pending`, `available`, `in_progress`, `completed`, `postponed`, `skipped`, `blocked` |
| `completionEvidence` | `object \| null` | Authenticated completion evidence payload |

---

## 3. Study Scheduling Constraints

The `StudyScheduleOptimizer` enforces 5 strict pedagogical constraints:

### Constraint 1: Strict Daily Time Budget
The sum of `estimatedMinutes` of tasks assigned to any calendar day never exceeds the student's declared `dailyStudyMinutes`:
$$\sum_{t \in \text{DayTasks}} t.\text{estimatedMinutes} \le \text{learningProfile.dailyStudyMinutes}$$
No cascading snowball effect occurs: uncompleted tasks are re-assigned to future available slots rather than dumped into the next day.

### Constraint 2: Rest-Day Compliance
Days not included in `learningProfile.studyDaysPerWeek` (e.g., Sundays) are marked `isStudyDay: false` with zero scheduled tasks.

### Constraint 3: Topological Prerequisite Ordering
Before scheduling, candidate tasks are topologically sorted via depth-first search on the prerequisite DAG. If skill $A$ is a prerequisite for skill $B$, then:
$$\text{ScheduledDate}(A) \le \text{ScheduledDate}(B)$$
Foundational tasks always appear on the same day earlier or on an earlier calendar date than dependent tasks.

### Constraint 4: Verified Question Guard (Fail Closed)
The planner queries `BankStorage` for verified questions with valid license evidence. If fewer than 2 verified questions are available:
- The task is marked `status = 'blocked'`.
- `questionSetReference` is set to `null` (never points to non-existent or unverified questions).
- `contentNotice` explains: *"Nội dung câu hỏi chưa đủ điều kiện thẩm định bản quyền (verified). Đang chờ cập nhật ngân hàng."*
- Fictitious tasks with non-functioning "Start" buttons are strictly prevented.
