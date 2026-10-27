/**
 * Phase 03B Deterministic Study Plan Scenarios & Fixtures
 * NTMK Rebuild Phase 03B — Task 12
 *
 * Provides reproducible inputs and expected behaviors for:
 * Scenario 1:  Grade 10 student weak in Math foundational skills.
 * Scenario 2:  Grade 11 student strong in Chemistry but lacking Physics.
 * Scenario 3:  Grade 12 student graduation review with tight deadline.
 * Scenario 4:  Student proficient in some skills, others untested.
 * Scenario 5:  Student with minimal daily budget (20 minutes/day).
 * Scenario 6:  Student switching goals from foundation to graduation exam.
 * Scenario 7:  Student missing multiple study sessions.
 * Scenario 8:  Student improving steadily across sessions.
 * Scenario 9:  Student with an anomalous mistake amidst strong results.
 * Scenario 10: Question bank lacks verified content for target skill (fail-closed).
 * Scenario 11: Concurrent plan regeneration requests (race condition guard).
 * Scenario 12: Student completes practice session and reloads page (idempotency).
 */

const STUDY_PLAN_SCENARIOS = {
  // Scenario 1: Grade 10 student weak in Math foundational skills
  SCENARIO_1_G10_MATH_WEAK: {
    id: 'scenario_1_g10_math_weak',
    profile: {
      userId: 'student_s1_g10_weak',
      grade: 10,
      prioritySubjects: ['toan'],
      learningGoals: ['strengthen_foundation'],
      dailyStudyMinutes: 30,
      studyDaysPerWeek: [1, 2, 3, 4, 5, 6]
    },
    masteryMap: {
      'math-10-sets-logic': {
        skillId: 'math-10-sets-logic',
        status: 'needs_foundation',
        confidenceLevel: 'medium',
        evidenceCount: 3,
        estimatedMastery: 0.28,
        observedAccuracy: 0.25
      },
      'math-10-linear-ineq-2vars': {
        skillId: 'math-10-linear-ineq-2vars',
        status: 'developing',
        confidenceLevel: 'medium',
        evidenceCount: 3,
        estimatedMastery: 0.52,
        observedAccuracy: 0.50
      }
    },
    gapAnalysis: {
      criticalGaps: ['math-10-sets-logic'],
      remediationChain: ['math-10-sets-logic', 'math-10-linear-ineq-2vars']
    }

  },

  // Scenario 2: Grade 11 student strong in Chemistry, lacking Physics
  SCENARIO_2_G11_CHEM_STRONG_PHYSICS_WEAK: {
    id: 'scenario_2_g11_chem_physics',
    profile: {
      userId: 'student_s2_g11_mixed',
      grade: 11,
      prioritySubjects: ['hoahoc', 'vatli'],
      learningGoals: ['reinforce_concepts'],
      dailyStudyMinutes: 45,
      studyDaysPerWeek: [1, 2, 3, 4, 5, 6]
    },
    masteryMap: {
      'hoa-11-can-bang-01': {
        skillId: 'hoa-11-can-bang-01',
        status: 'strong',
        confidenceLevel: 'high',
        evidenceCount: 4,
        estimatedMastery: 0.90,
        observedAccuracy: 1.0
      },
      'vatli-11-dao-dong-01': {
        skillId: 'vatli-11-dao-dong-01',
        status: 'needs_foundation',
        confidenceLevel: 'medium',
        evidenceCount: 3,
        estimatedMastery: 0.35,
        observedAccuracy: 0.33
      }
    },
    gapAnalysis: {
      criticalGaps: ['vatli-11-dao-dong-01'],
      remediationChain: ['vatli-11-dao-dong-01']
    }
  },

  // Scenario 3: Grade 12 student graduation review with tight deadline
  SCENARIO_3_G12_GRADUATION_TIGHT_DEADLINE: {
    id: 'scenario_3_g12_grad_tight',
    profile: {
      userId: 'student_s3_g12_deadline',
      grade: 12,
      prioritySubjects: ['toan', 'vatli'],
      learningGoals: ['exam_preparation'],
      targetExamDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 days away
      dailyStudyMinutes: 60,
      studyDaysPerWeek: [1, 2, 3, 4, 5, 6, 7]
    },
    masteryMap: {},
    gapAnalysis: {}
  },

  // Scenario 4: Proficient in some skills, others untested
  SCENARIO_4_PARTIAL_TESTED_SKILLS: {
    id: 'scenario_4_partial_tested',
    profile: {
      userId: 'student_s4_partial',
      grade: 10,
      prioritySubjects: ['toan'],
      learningGoals: ['strengthen_foundation'],
      dailyStudyMinutes: 30,
      studyDaysPerWeek: [1, 2, 3, 4, 5, 6]
    },
    masteryMap: {
      'toan-10-menh-de-01': {
        skillId: 'toan-10-menh-de-01',
        status: 'proficient',
        confidenceLevel: 'high',
        evidenceCount: 4,
        estimatedMastery: 0.82,
        observedAccuracy: 0.85
      },
      'toan-10-vecto-01': {
        skillId: 'toan-10-vecto-01',
        status: 'not_assessed',
        confidenceLevel: 'none',
        evidenceCount: 0,
        estimatedMastery: null,
        observedAccuracy: 0
      }
    },
    gapAnalysis: {
      untestedSkills: ['toan-10-vecto-01']
    }
  },

  // Scenario 5: Minimal 20 minutes budget per day
  SCENARIO_5_MINIMAL_TIME_BUDGET: {
    id: 'scenario_5_minimal_time',
    profile: {
      userId: 'student_s5_minimal_time',
      grade: 10,
      prioritySubjects: ['toan'],
      learningGoals: ['strengthen_foundation'],
      dailyStudyMinutes: 20, // Strict lower limit
      studyDaysPerWeek: [1, 3, 5] // 3 days/week
    },
    masteryMap: {},
    gapAnalysis: {}
  },

  // Scenario 10: Skill with unavailable/unverified content in bank
  SCENARIO_10_CONTENT_UNAVAILABLE: {
    id: 'scenario_10_content_unavailable',
    profile: {
      userId: 'student_s10_no_content',
      grade: 10,
      prioritySubjects: ['toan'],
      learningGoals: ['strengthen_foundation'],
      dailyStudyMinutes: 30,
      studyDaysPerWeek: [1, 2, 3, 4, 5, 6]
    },
    targetSkillId: 'toan-rare-experimental-skill-unverified'
  }
};

module.exports = { STUDY_PLAN_SCENARIOS };
