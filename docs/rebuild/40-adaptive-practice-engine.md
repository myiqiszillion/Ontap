# NTMK REBUILD — ADAPTIVE PRACTICE & SPACED REPETITION ENGINE
## PRACTICE MODES, DIFFICULTY PROGRESSION & RETENTION OPTIMIZATION

**Document ID:** `docs/rebuild/40-adaptive-practice-engine.md`  
**Engines:** `engine/planner/adaptive-practice-engine.js`, `engine/planner/spaced-repetition-scheduler.js`  
**Verification:** Tested in `tests/adaptive-practice-repetition.test.js`  

---

## 1. Adaptive Practice Modes

The engine provides 5 distinct operational modes:

| Mode | Purpose | Selection Strategy |
| :--- | :--- | :--- |
| `weak_skill_practice` | Remediate skills with confirmed gaps | Focuses directly on the target deficient skill |
| `prerequisite_practice` | Repair foundational concepts | Looks up prerequisites in `SkillGraph` and drills root foundational skills |
| `mixed_review` | Interleaved consolidation | Interleaves questions across multiple previously studied skills |
| `wrong_answer_review` | Re-attempt missed concepts | Selects questions missed in previous diagnostic or practice attempts |
| `followup_assessment` | Checkpoint measurement | Evaluates mastery state to feed into `SkillMasteryEstimator` |

---

## 2. Dynamic Difficulty Adaptation

When a practice session begins, target difficulty is resolved based on past accuracy and mastery level:
- If `masteryLevel === 'needs_foundation'` or past accuracy $< 50\%$: selects **Easy** questions.
- If `masteryLevel === 'strong'` or past accuracy $\ge 85\%$: selects **Hard** questions.
- Otherwise: selects **Medium** questions.

Upon session submission:
- Accuracy $\ge 80\%$: difficulty progression recommended as **Increase** (`increase`).
- Accuracy $< 50\%$: difficulty progression recommended as **Decrease** (`decrease`, step back to prerequisite).
- Accuracy between $50\%$ and $79\%$: difficulty maintained (`maintain`).

---

## 3. Answer Key Sanitization & Client Security

Before delivering questions to the student:
1. `mcqPayload.correctOptionIndex` is deleted.
2. `tfPayload.statements[].isCorrect` is deleted.
3. `shortAnswerPayload.correctAnswer` and `acceptedAnswers` are deleted.
4. Explanations (`explanation`, `authoritativeExplanation`) are deleted.
5. Ingestion provenance and audit logs are deleted.

Only after authoritative server scoring (`submitSession`) does the client receive:
- Actual awarded points and correctness.
- Full step-by-step authoritative explanations.
- Verified completion evidence payload.

---

## 4. Spaced Repetition Algorithm

Implemented in `SpacedRepetitionScheduler`. Tracks:
- `consecutiveSuccesses`: Number of successive sessions with $\text{accuracy} \ge 80\%$.
- `currentIntervalDays`: Interval between reviews (default sequence: $1 \to 3 \to 7 \to 14 \to 30$ days).
- `retentionEvidence`: Categorized as `strong`, `moderate`, `lapsed`, or `untested`.

### Adaptation Rules:
- **Success ($\text{accuracy} \ge 80\%$)**: Advances to the next interval in the sequence ($1 \to 3 \to 7 \to 14 \to 30$ days). `retentionEvidence = 'strong'`.
- **Moderate ($50\% \le \text{accuracy} < 80\%$)**: Expands interval modestly ($\times 1.3$). `retentionEvidence = 'moderate'`.
- **Memory Lapse ($\text{accuracy} < 50\%$)**: Resets `consecutiveSuccesses = 0`, resets `currentIntervalDays = 1`, and flags `retentionEvidence = 'lapsed'`. Immediate foundation follow-up scheduled for the next day.
