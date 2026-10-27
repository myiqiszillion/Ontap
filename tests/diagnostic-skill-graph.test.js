/**
 * Diagnostic Skill Graph Tests
 * NTMK Rebuild Phase 03A — Task 11 (Items 1, 2, 3, 14)
 *
 * Requirements Tested:
 * 1. Curriculum taxonomy consistency across 4 subjects & 3 grades (GDPT 2018).
 * 2. Skill prerequisite graph cycle detection & orphaned node prevention (DAG integrity).
 * 3. Cross-grade prerequisite traversal (Grade 12 -> 11 -> 10).
 * 4. Prerequisite assessment suggestions when advanced skills fail.
 * 5. Curriculum vs textbook series mapping separation.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { CURRICULUM_DOMAINS, CURRICULUM_SKILLS } = require('../engine/diagnostic/curriculum-taxonomy-data.js');
const CurriculumRepository = require('../engine/diagnostic/curriculum-repository.js');
const SkillGraph = require('../engine/diagnostic/skill-graph.js');

describe('Task 1 — Curriculum Skill Knowledge Graph & Taxonomy', () => {
  const repo = new CurriculumRepository();
  const graph = new SkillGraph(repo);

  it('1.1 Curriculum taxonomy contains all 4 subjects across Grades 10, 11, and 12', () => {
    const subjects = ['toan', 'vatli', 'hoahoc', 'tienganh'];
    const grades = [10, 11, 12];

    for (const sub of subjects) {
      for (const gr of grades) {
        const skills = repo.querySkills({ subjectId: sub, grade: gr });
        assert.ok(skills.length > 0, `Expected skills for subject ${sub} Grade ${gr}, found 0`);
      }
    }
  });

  it('1.2 Every skill node satisfies mandatory schema properties and stable ID conventions', () => {
    const requiredProps = [
      'skillId',
      'subjectId',
      'grade',
      'domainId',
      'topicId',
      'topicTitle',
      'title',
      'description',
      'learningObjectives',
      'prerequisiteSkillIds',
      'cognitiveLevels',
      'curriculumVersion',
      'curriculumSource',
      'verificationStatus'
    ];

    const seenIds = new Set();

    for (const s of CURRICULUM_SKILLS) {
      for (const prop of requiredProps) {
        assert.ok(s[prop] !== undefined && s[prop] !== null, `Skill ${s.skillId} missing property: ${prop}`);
      }

      // Check stable ID format (no spaces, subject-prefixed)
      assert.match(s.skillId, /^[a-z]+-[0-9]+-[a-z0-9-]+$/, `Skill ID "${s.skillId}" violates naming convention`);
      assert.ok(!seenIds.has(s.skillId), `Duplicate skill ID found: ${s.skillId}`);
      seenIds.add(s.skillId);

      // Verify cognitive levels contain at least recognize or understand
      assert.ok(Array.isArray(s.cognitiveLevels) && s.cognitiveLevels.length > 0);
      assert.ok(Array.isArray(s.learningObjectives) && s.learningObjectives.length > 0);
      assert.ok(Array.isArray(s.prerequisiteSkillIds));
      assert.strictEqual(s.curriculumVersion, 'GDPT2018');
      assert.ok(['verified', 'unverified'].includes(s.verificationStatus));
    }
  });

  it('1.3 Production skill graph is a strict Directed Acyclic Graph (DAG) with zero cycles', () => {
    const validation = graph.validateGraph();
    assert.strictEqual(validation.isValid, true, `Graph validation failed: ${JSON.stringify(validation)}`);
    assert.strictEqual(validation.hasCycle, false, 'Graph contains cycles');
    assert.strictEqual(validation.cyclePath, null, 'Cycle path must be null');
    assert.deepStrictEqual(validation.orphanedPrerequisites, [], 'Found orphaned prerequisite IDs');
  });

  it('1.4 Cycle detector correctly detects and reports circular dependencies when introduced', () => {
    const cyclicSkills = [
      {
        skillId: 'test-skill-a',
        subjectId: 'toan',
        grade: 10,
        domainId: 'algebra',
        topicId: 'topic1',
        topicTitle: 'Topic 1',
        title: 'Skill A',
        description: 'Test A',
        learningObjectives: ['Obj A'],
        prerequisiteSkillIds: ['test-skill-c'], // Cycle: A -> C -> B -> A
        cognitiveLevels: ['understand'],
        curriculumVersion: 'GDPT2018',
        curriculumSource: 'Test',
        verificationStatus: 'verified'
      },
      {
        skillId: 'test-skill-b',
        subjectId: 'toan',
        grade: 10,
        domainId: 'algebra',
        topicId: 'topic1',
        topicTitle: 'Topic 1',
        title: 'Skill B',
        description: 'Test B',
        learningObjectives: ['Obj B'],
        prerequisiteSkillIds: ['test-skill-a'],
        cognitiveLevels: ['understand'],
        curriculumVersion: 'GDPT2018',
        curriculumSource: 'Test',
        verificationStatus: 'verified'
      },
      {
        skillId: 'test-skill-c',
        subjectId: 'toan',
        grade: 10,
        domainId: 'algebra',
        topicId: 'topic1',
        topicTitle: 'Topic 1',
        title: 'Skill C',
        description: 'Test C',
        learningObjectives: ['Obj C'],
        prerequisiteSkillIds: ['test-skill-b'],
        cognitiveLevels: ['understand'],
        curriculumVersion: 'GDPT2018',
        curriculumSource: 'Test',
        verificationStatus: 'verified'
      }
    ];

    const testRepo = new CurriculumRepository(cyclicSkills);
    const testGraph = new SkillGraph(testRepo);
    const validation = testGraph.validateGraph();

    assert.strictEqual(validation.isValid, false);
    assert.strictEqual(validation.hasCycle, true);
    assert.ok(Array.isArray(validation.cyclePath) && validation.cyclePath.length > 0);
  });

  it('1.5 Orphaned prerequisite detection catches non-existent prerequisite skill IDs', () => {
    const orphanedSkills = [
      {
        skillId: 'test-valid-skill',
        subjectId: 'toan',
        grade: 10,
        domainId: 'algebra',
        topicId: 'topic1',
        topicTitle: 'Topic 1',
        title: 'Valid Skill',
        description: 'Valid',
        learningObjectives: ['Obj'],
        prerequisiteSkillIds: ['non-existent-ghost-skill'],
        cognitiveLevels: ['understand'],
        curriculumVersion: 'GDPT2018',
        curriculumSource: 'Test',
        verificationStatus: 'verified'
      }
    ];

    const testRepo = new CurriculumRepository(orphanedSkills);
    const testGraph = new SkillGraph(testRepo);
    const validation = testGraph.validateGraph();

    assert.strictEqual(validation.isValid, false);
    assert.strictEqual(validation.orphanedPrerequisites.length, 1);
    assert.strictEqual(validation.orphanedPrerequisites[0].missingPrerequisiteId, 'non-existent-ghost-skill');
  });

  it('1.6 Cross-grade prerequisite traversal correctly resolves multi-grade chains (Grade 12 -> 11 -> 10)', () => {
    // Grade 12 Calculus (math-12-func-monotonicity) depends on Grade 11 Derivatives (math-11-derivatives)
    // which depends on Grade 11 Limits (math-11-limits-continuity) which depends on Grade 10 Quad Func
    const g12Skill = repo.getSkillById('math-12-func-monotonicity');
    assert.ok(g12Skill, 'math-12-func-monotonicity exists');

    const prereqs = graph.getPrerequisites('math-12-func-monotonicity', { recursive: true });
    const prereqIds = prereqs.map(p => p.skillId);

    assert.ok(prereqIds.includes('math-11-derivatives'), 'Must transitively depend on math-11-derivatives');
    assert.ok(prereqIds.includes('math-11-limits-continuity'), 'Must transitively depend on math-11-limits-continuity');
    assert.ok(prereqIds.includes('math-10-quad-func'), 'Must transitively depend on math-10-quad-func');

    // Test crossGradeOnly filter
    const crossGradePrereqs = graph.getPrerequisites('math-12-func-monotonicity', { recursive: true, crossGradeOnly: true });
    assert.ok(crossGradePrereqs.every(p => p.grade < 12), 'All cross-grade prerequisites must have grade < 12');
  });

  it('1.7 Prerequisite diagnosis flags unverified foundation when advanced skill is failed', () => {
    const studentMasteryMap = {
      'math-12-func-monotonicity': {
        status: 'needs_foundation',
        accuracyEstimate: 0.15,
        evidenceCount: 3
      }
      // Prerequisites untested
    };

    const diagnostics = graph.diagnosePrerequisiteGaps('math-12-func-monotonicity', studentMasteryMap);
    assert.ok(Array.isArray(diagnostics) && diagnostics.length > 0, 'Should return diagnostic records');

    const derivDiag = diagnostics.find(d => d.prerequisiteSkillId === 'math-11-derivatives');
    assert.ok(derivDiag, 'Should include math-11-derivatives');
    assert.strictEqual(derivDiag.diagnosisStatus, 'untested_suspect');
    assert.strictEqual(derivDiag.isCrossGrade, true);
  });

  it('1.8 Distinguishes national GDPT 2018 curriculum standards from specific textbook series (KNTT, CD, CTST)', () => {
    const textbookMap = repo.getTextbookMapping('toan', 10, 'kntt');
    assert.ok(textbookMap !== null);
    assert.strictEqual(textbookMap.series, 'kntt');
    assert.ok(Array.isArray(textbookMap.chapters));
    assert.ok(textbookMap.chapters.length > 0);

    // Ensure core skill identity is independent of textbook publisher
    const skill = repo.getSkillById('math-10-sets-logic');
    assert.strictEqual(skill.curriculumVersion, 'GDPT2018');
    assert.strictEqual(skill.subjectId, 'toan');
  });
});
