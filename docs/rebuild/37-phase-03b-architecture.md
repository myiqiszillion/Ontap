# NTMK REBUILD — PHASE 03B ARCHITECTURE
## PERSONALIZED LEARNING PLANNER, ADAPTIVE PRACTICE & CONTINUOUS LEARNING OPTIMIZATION

**Author:** Principal EdTech Architect, Adaptive Learning Systems Engineer  
**Status:** IMPLEMENTED & TESTED  
**Date:** 2026-10-11  

---

## 1. Executive Summary

Phase 03B transforms the NTMK platform into a true adaptive learning system. Following the diagnostic evaluation of Phase 03A, Phase 03B introduces:
1. **Personalized Learning Profile (`LearningProfile`)**: Transparent, editable study parameters without PII.
2. **Learning Priority Engine (`LearningPriorityEngine`)**: Deterministic ranking of skills into Remediation, Further Assessment, and Review/Consolidation.
3. **Personalized Study Planner (`PersonalizedStudyPlanner`)**: Generation of structured 7, 14, 30-day study plans with concrete typed tasks.
4. **Study Schedule Optimizer (`StudyScheduleOptimizer`)**: Strict daily time-budget scheduling and topological DAG prerequisite ordering.
5. **Adaptive Practice Engine (`AdaptivePracticeEngine`)**: 5 practice modes, dynamic difficulty adaptation, answer sanitization, and authoritative scoring.
6. **Spaced Repetition Scheduler (`SpacedRepetitionScheduler`)**: Multi-interval retention scheduling with lapse handling.
7. **Adaptive Replanning Engine (`AdaptiveReplanningEngine`)**: Event-driven incremental plan readjustment with full plan versioning and audit trails.

---

## 2. Architectural Blueprint

```
                      ┌──────────────────────────────────────────────┐
                      │        Phase 03A Diagnostic Analytics        │
                      │  (Mastery Estimates, Gaps, Prerequisite DAG) │
                      └──────────────────────┬───────────────────────┘
                                             │
                                             ▼
┌─────────────────────────┐       ┌──────────────────────────────────┐
│   LearningProfile       │──────▶│   LearningPriorityEngine         │
│ (Time budget, Goals,    │       │ (Remediation, Further Assessment,│
│  Active days, Subjects) │       │  Review & Consolidation Ranking) │
└─────────────────────────┘       └──────────────────┬───────────────┘
                                                     │
                                                     ▼
┌─────────────────────────┐       ┌──────────────────────────────────┐
│   BankStorage (V2)      │──────▶│   PersonalizedStudyPlanner       │
│ (Verified published q's │       │ (Generates Typed Study Tasks:    │
│  with license evidence) │       │  Remediation, Adaptive Practice) │
└─────────────────────────┘       └──────────────────┬───────────────┘
                                                     │
                                                     ▼
                                  ┌──────────────────────────────────┐
                                  │   StudyScheduleOptimizer         │
                                  │ (Strict daily time budget,       │
                                  │  Topological DAG order, Asia/HCM)│
                                  └──────────────────┬───────────────┘
                                                     │
                                                     ▼
                                  ┌──────────────────────────────────┐
                                  │   Personalized Study Plan (v1)   │
                                  │   (Today's Dashboard, Calendar)  │
                                  └──────────────────┬───────────────┘
                                                     │
           ┌─────────────────────────────────────────┴──────────────────────┐
           ▼                                                                ▼
┌──────────────────────────────────┐                      ┌──────────────────────────────────┐
│   AdaptivePracticeEngine         │                      │   SpacedRepetitionScheduler      │
│ (Focus Mode, 5 Practice Modes,   │                      │ (Tracks retention evidence,      │
│  Difficulty adaptation, Scoring) │                      │  interval expansion & reset)     │
└──────────────────┬───────────────┘                      └──────────────────────────────────┘
                   │
                   ▼ (Authentic Completion Evidence)
┌────────────────────────────────────────────────────────┐
│             AdaptiveReplanningEngine                   │
│ (Increments planVersion, preserves history, preserves  │
│  completed tasks, explains additions/reschedules)      │
└────────────────────────────────────────────────────────┘
```

---

## 3. Core Engine Components

### 3.1 Learning Profile (`engine/planner/learning-profile.js`)
- **Fields**: `userId`, `grade` (10-12), `prioritySubjects`, `learningGoals`, `targetExamDate`, `dailyStudyMinutes` (15-180 min), `studyDaysPerWeek` (1-7).
- **Privacy**: Zero storage of non-educational personal identifiable information (PII).
- **Flexibility**: Editable at any time without forcing re-onboarding.

### 3.2 Learning Priority Engine (`engine/planner/learning-priority-engine.js`)
- Categorizes skills into:
  - **Remediation**: Skills with confirmed observed deficiency (`needs_foundation` or `developing`).
  - **Further Assessment**: Untested skills or insufficient evidence (`not_assessed` or `insufficient_evidence`). Never labeled weak by default.
  - **Review & Consolidation**: Mastered skills (`proficient` or `strong`) requiring retention review.
- Priority scoring formula:
  $$\text{PriorityScore} = \text{needScore} + \text{severityScore} + \text{blockerScore} + \text{goalScore} + \text{retentionScore}$$

### 3.3 Personalized Study Planner (`engine/planner/personalized-study-planner.js`)
- Resolves duration to 7, 14, 30 days or based on declared exam deadline.
- Produces typed `StudyTask` instances:
  - `remediation`
  - `adaptive_practice`
  - `wrong_review`
  - `spaced_review`
  - `followup_assessment`
- **Content Availability Guard**: Fails closed if verified questions are missing; marks task `blocked` rather than presenting broken "Start" buttons.

### 3.4 Study Schedule Optimizer (`engine/planner/study-schedule-optimizer.js`)
- Enforces strict daily time budget: scheduled task minutes on any day never exceed declared `dailyStudyMinutes`.
- Strictly respects rest days.
- Topologically sorts tasks to ensure foundational prerequisite tasks are scheduled on or before dependent tasks.

### 3.5 Adaptive Practice Engine (`engine/planner/adaptive-practice-engine.js`)
- 5 Practice Modes: `weak_skill_practice`, `prerequisite_practice`, `mixed_review`, `wrong_answer_review`, `followup_assessment`.
- Dynamic difficulty adjustment based on past student performance.
- Sanitizes answer keys and explanations before returning questions to client.
- Authoritatively scores responses via server-side scoring adapter.

### 3.6 Spaced Repetition Scheduler (`engine/planner/spaced-repetition-scheduler.js`)
- Tracks `reviewCount`, `consecutiveSuccesses`, `lastAccuracy`, `currentIntervalDays`, and `retentionEvidence`.
- Expands interval on success ($\ge 80\%$). Resets interval to 1 day on lapse ($< 50\%$).

### 3.7 Adaptive Replanning Engine (`engine/planner/adaptive-replanning-engine.js`)
- Incremental plan adjustment when events occur (practice completion, schedule miss, profile edit).
- Strictly preserves completed tasks and historical records.
- Manages `planVersion`, `changeReason`, and `beforeAfterSummary`.

---

## 4. Security & Data Integrity Gates

1. **Anti-Spoofing Gate**: Client cannot send arbitrary `completed: true` to bypass learning sessions. Task completion requires authentic practice submission signed by server session token.
2. **Mastery Immutability Gate**: Client cannot directly edit latent mastery or exam scores.
3. **Test Fixture Isolation Gate**: Test fixtures are strictly barred in production mode (`NODE_ENV === 'production'`), ignoring client-sent flags like `allowFixtures: true`.
4. **Failsafe Question Delivery**: Strips all correct options, accepted answers, and explanations from active test-taker payloads.
