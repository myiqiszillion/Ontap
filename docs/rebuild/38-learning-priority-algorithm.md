# NTMK REBUILD — LEARNING PRIORITY ALGORITHM
## PEDAGOGICAL RANKING & TRANSPARENT MULTI-COMPONENT SCORING

**Document ID:** `docs/rebuild/38-learning-priority-algorithm.md`  
**Engine:** `engine/planner/learning-priority-engine.js`  
**Verification:** Tested in `tests/planner-profile-priority.test.js`  

---

## 1. Objectives & Principles

The Learning Priority Engine decides which skills a student should study first. Unlike black-box machine learning models or arbitrary hardcoded lists, the algorithm is:
1. **Deterministic & Reproducible**: Given identical inputs, always yields the exact same ranked sequence.
2. **Pedagogically Grounded**: Differentiates foundational prerequisites, knowledge gaps, and retention reviews.
3. **Honest About Evidence**: Never labels untested skills as weak. If evidence is lacking, recommends assessment rather than assuming deficiency.
4. **Transparent & Explainable**: Breaks down priority scores into 5 distinct mathematical components with human-readable rationale.

---

## 2. Three Categorical Learning Needs

Every skill evaluated for a student falls into exactly one category:

### A. Remediation
- **Condition**: Observed evidence demonstrates deficiency (`status === 'needs_foundation'` or `'developing'`).
- **Base Score**: 35 points (highest base priority).
- **Pedagogical Action**: Targeted remediation practice or prerequisite repair.

### B. Further Assessment
- **Condition**: Skill has not been tested (`'not_assessed'`) or evidence is below the minimum threshold (`'insufficient_evidence'`, $< 2$ questions).
- **Base Score**: 20 points.
- **Pedagogical Action**: Short diagnostic checkpoint to evaluate actual capability.

### C. Review / Consolidation
- **Condition**: Student has demonstrated proficiency or mastery (`status === 'proficient'` or `'strong'`).
- **Base Score**: 15 points.
- **Pedagogical Action**: Spaced repetition to consolidate long-term memory.

---

## 3. Mathematical Priority Score Formulation

$$\text{PriorityScore} = \text{needScore} + \text{severityScore} + \text{blockerScore} + \text{goalScore} + \text{retentionScore}$$

Where:

### 1. Need Base Score ($\text{needScore}$)
- Remediation (`needs_foundation`): 35 points
- Remediation (`developing`): 28 points ($35 \times 0.8$)
- Further Assessment: 20 points
- Review & Consolidation: 15 points

### 2. Severity Score ($\text{severityScore}$)
Applies only to skills needing remediation. Measures the degree of gap multiplied by measurement confidence:
$$\text{severityScore} = \min\left(25, \; (1 - \text{estimatedMastery}) \times \text{confidenceWeight} \times 25\right)$$
- If student scored 20% on 4 questions ($\text{confidence}=\text{high}$): $\text{severityScore} \approx 20$ points.

### 3. DAG Blocker Score ($\text{blockerScore}$)
Traverses the Directed Acyclic Graph (DAG) of prerequisites. Foundational skills that block multiple advanced skills receive higher priority:
$$\text{blockerScore} = \min\left(25, \; \text{dependentSkillsCount} \times 6\right)$$
- If a skill is also flagged in `gapAnalysis.criticalGaps`, an extra 10-point blocker bonus is added (capped at 25).

### 4. Goal Alignment Score ($\text{goalScore}$)
Rewards skills aligning with the student's current grade and preferred subjects:
- Same grade as student: $+10$ points
- In student's priority subjects: $+5$ points
$$\text{goalScore} = \min\left(15, \; \text{gradeBonus} + \text{subjectBonus}\right)$$

### 5. Retention Score ($\text{retentionScore}$)
Applies to mastered skills in the review cycle:
$$\text{retentionScore} = \min\left(10, \; \text{spacingAdjustment}\right)$$

---

## 4. Explainable Rationale Output

Every ranked item outputs human-readable pedagogical explanations, for example:
- *"Kỹ năng cần củng cố: tỉ lệ đúng quan sát 25% trên 3 câu hỏi đã kiểm tra."*
- *"Kỹ năng này là nền tảng tiên quyết cho 4 kỹ năng nâng cao tiếp theo."*
- *"Kỹ năng chưa được kiểm tra trong bài chẩn đoán; cần làm bài đánh giá ban đầu."*
- *"Kỹ năng đã đạt độ thành thạo tốt; xếp lịch ôn tập ngắt quãng để duy trì phản xạ."*
