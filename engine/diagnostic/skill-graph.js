/**
 * Skill Knowledge Graph (DAG) Engine
 * NTMK Rebuild Phase 03A — Task 1
 *
 * Responsibilities:
 * - Directed Acyclic Graph (DAG) modeling of curriculum skills.
 * - Cycle detection and validation to ensure strict topological ordering.
 * - Discovery of foundational vs advanced skills.
 * - Cross-grade prerequisite traversal (e.g. Grade 12 Calculus depending on Grade 10/11 algebra).
 * - Prerequisite diagnosis: pinpointing underlying prerequisite gaps when an advanced skill fails.
 */

class SkillGraph {
  constructor(curriculumRepository = null) {
    const CurriculumRepository = require('./curriculum-repository.js');
    this.repo = curriculumRepository || new CurriculumRepository();
    this.adjList = new Map();         // skillId -> Set of prerequisiteSkillIds
    this.reverseAdjList = new Map();  // skillId -> Set of dependentSkillIds (skills that require this skill)
    this._buildGraph();
  }


  getSkill(skillId) {
    return this.repo ? this.repo.getSkillById(skillId) : null;
  }

  _buildGraph() {

    this.adjList.clear();
    this.reverseAdjList.clear();

    const allSkills = this.repo.getAllSkills();
    for (const s of allSkills) {
      this.adjList.set(s.skillId, new Set(s.prerequisiteSkillIds || []));
      if (!this.reverseAdjList.has(s.skillId)) {
        this.reverseAdjList.set(s.skillId, new Set());
      }
    }

    // Populate reverse edges
    for (const [skillId, prereqs] of this.adjList.entries()) {
      for (const pId of prereqs) {
        if (!this.reverseAdjList.has(pId)) {
          this.reverseAdjList.set(pId, new Set());
        }
        this.reverseAdjList.get(pId).add(skillId);
      }
    }
  }

  /**
   * Validate DAG integrity: detects cycles and orphaned prerequisite references
   */
  validateGraph() {
    const orphanedPrerequisites = [];
    const allSkillIds = new Set(this.repo.getAllSkills().map(s => s.skillId));

    for (const [skillId, prereqs] of this.adjList.entries()) {
      for (const pId of prereqs) {
        if (!allSkillIds.has(pId)) {
          orphanedPrerequisites.push({ skillId, missingPrerequisiteId: pId });
        }
      }
    }

    const cycleResult = this.findCycles();

    return {
      isValid: cycleResult.hasCycle === false && orphanedPrerequisites.length === 0,
      hasCycle: cycleResult.hasCycle,
      cyclePath: cycleResult.cyclePath,
      orphanedPrerequisites
    };
  }

  /**
   * Detect cycles using depth-first search with 3-color marking (0=unvisited, 1=visiting, 2=visited)
   */
  findCycles() {
    const visited = new Map(); // 0: unvisited, 1: visiting, 2: visited
    const parentMap = new Map();
    let cyclePath = null;

    const dfs = (node) => {
      visited.set(node, 1);
      const prereqs = this.adjList.get(node) || new Set();

      for (const next of prereqs) {
        if (!this.adjList.has(next)) continue; // ignore orphaned nodes during cycle search

        const state = visited.get(next) || 0;
        if (state === 1) {
          // Cycle found
          cyclePath = [node, next];
          let curr = node;
          while (curr && curr !== next && parentMap.has(curr)) {
            curr = parentMap.get(curr);
            cyclePath.unshift(curr);
          }
          return true;
        }
        if (state === 0) {
          parentMap.set(next, node);
          if (dfs(next)) return true;
        }
      }

      visited.set(node, 2);
      return false;
    };

    for (const skillId of this.adjList.keys()) {
      if ((visited.get(skillId) || 0) === 0) {
        if (dfs(skillId)) {
          return { hasCycle: true, cyclePath };
        }
      }
    }

    return { hasCycle: false, cyclePath: null };
  }

  hasCycle() {
    return this.findCycles().hasCycle;
  }

  /**
   * Get direct prerequisites for a skill
   */
  getDirectPrerequisites(skillId) {
    const prereqs = this.adjList.get(skillId);
    if (!prereqs) return [];
    return Array.from(prereqs).map(id => this.repo.getSkillById(id)).filter(Boolean);
  }

  /**
   * Get all prerequisites (recursive or direct), optionally filtering cross-grade
   */
  getPrerequisites(skillId, { recursive = true, crossGradeOnly = false } = {}) {
    const targetSkill = this.repo.getSkillById(skillId);
    if (!targetSkill) return [];

    const result = new Map();
    const queue = Array.from(this.adjList.get(skillId) || []);

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (result.has(currentId)) continue;

      const pSkill = this.repo.getSkillById(currentId);
      if (pSkill) {
        if (!crossGradeOnly || pSkill.grade < targetSkill.grade) {
          result.set(currentId, pSkill);
        }
        if (recursive) {
          const nextPrereqs = this.adjList.get(currentId) || [];
          for (const n of nextPrereqs) {
            if (!result.has(n)) queue.push(n);
          }
        }
      }
    }

    return Array.from(result.values());
  }

  /**
   * Get all skills that depend on this skill
   */
  getDependents(skillId, { recursive = true } = {}) {
    const result = new Map();
    const queue = Array.from(this.reverseAdjList.get(skillId) || []);

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (result.has(currentId)) continue;

      const depSkill = this.repo.getSkillById(currentId);
      if (depSkill) {
        result.set(currentId, depSkill);
        if (recursive) {
          const nextDeps = this.reverseAdjList.get(currentId) || [];
          for (const n of nextDeps) {
            if (!result.has(n)) queue.push(n);
          }
        }
      }
    }

    return Array.from(result.values());
  }

  /**
   * Identifies foundational skills (have no prerequisites or all prerequisites belong to prior grades)
   */
  getRootSkills(subjectId, grade) {
    const skills = this.repo.querySkills({ subjectId, grade });
    return skills.filter(s => {
      const prereqs = this.getDirectPrerequisites(s.skillId);
      return prereqs.length === 0 || prereqs.every(p => p.grade < s.grade);
    });
  }

  /**
   * When a student fails or struggles with an advanced skill, diagnose which prerequisite
   * skills need follow-up assessment or remediation.
   *
   * Principle: Do NOT jump to the conclusion that student lacks prerequisite without evidence.
   * Flag prerequisite as 'needs_assessment' if not yet tested, or 'confirmed_gap' if tested & weak.
   */
  diagnosePrerequisiteGaps(failedSkillId, studentMasteryMap = {}) {
    const targetSkill = this.repo.getSkillById(failedSkillId);
    if (!targetSkill) return [];

    const prereqs = this.getPrerequisites(failedSkillId, { recursive: true });
    const diagnostics = [];

    for (const p of prereqs) {
      const mastery = studentMasteryMap[p.skillId] || { status: 'not_assessed', evidenceCount: 0 };
      const isCrossGrade = p.grade < targetSkill.grade;

      let diagnosisStatus = 'untested_suspect';
      let actionRecommendation = 'Đề xuất kiểm tra bổ trợ kỹ năng tiên quyết';

      if (mastery.status === 'needs_foundation') {
        diagnosisStatus = 'confirmed_prerequisite_gap';
        actionRecommendation = `Ưu tiên củng cố kỹ năng nền tảng [Lớp ${p.grade}]: ${p.title}`;
      } else if (mastery.status === 'proficient' || mastery.status === 'strong') {
        diagnosisStatus = 'prerequisite_mastered';
        actionRecommendation = 'Kỹ năng nền tảng đã vững; lỗi sai có thể do kỹ năng ứng dụng nâng cao';
      }

      diagnostics.push({
        prerequisiteSkillId: p.skillId,
        targetSkillId: failedSkillId,
        grade: p.grade,
        isCrossGrade,
        title: p.title,
        currentMasteryStatus: mastery.status,
        diagnosisStatus,
        actionRecommendation
      });
    }

    return diagnostics;
  }
}

SkillGraph.SkillGraph = SkillGraph;
module.exports = SkillGraph;
