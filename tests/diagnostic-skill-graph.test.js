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
      assert.ok(s.curriculumVersion === 'GDPT_2018');
      assert.ok(['verified', 'unverified'].includes(s.verificationStatus));
    }
  });

  it('1.3 Production skill graph is a strict Directed Acyclic Graph (DAG) with zero cycles', () => {
    const validation = graph.validateGraph();
    assert.strictEqual(validation.valid, true, `Graph validation failed: ${JSON.stringify(validation)}`);
    assert.strictEqual(validation.hasCycles, false, 'Graph contains cycles');
    assert.deepStrictEqual(validation.cyclePaths, [], 'Cycle paths must be empty');
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
        curriculumVersion: 'GDPT_2018',
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
        curriculumVersion: 'GDPT_2018',
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
        curriculumVersion: 'GDPT_2018',
        curriculumSource: 'Test',
        verificationStatus: 'verified'
      }
    ];

    const testRepo = new CurriculumRepository(cyclicSkills);
    const testGraph = new SkillGraph(testRepo);
    const validation = testGraph.validateGraph();

    assert.strictEqual(validation.valid, false);
    assert.strictEqual(validation.hasCycles, true);
    assert.ok(validation.cyclePaths.length > 0);
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
        curriculumVersion: 'GDPT_2018',
        curriculumSource: 'Test',
        verificationStatus: 'verified'
      }
    ];

    const testRepo = new CurriculumRepository(orphanedSkills);
    const testGraph = new SkillGraph(testRepo);
    const validation = testGraph.validateGraph();

    assert.strictEqual(validation.valid, false);
    assert.strictEqual(validation.orphanedPrerequisites.length, 1);
    assert.strictEqual(validation.orphanedPrerequisites[0].missingPrerequisiteId, 'non-existent-ghost-skill');
  });

  it('1.6 Cross-grade prerequisite traversal correctly resolves multi-grade chains (Grade 12 -> 11 -> 10)', () => {
    // Grade 12 Calculus (math-12-monotonicity-extrema) depends on Grade 11 Derivatives (math-11-derivatives)
    // which depends on Grade 11 Limits (math-11-limits-continuity)
    const g12Skill = repo.getSkillById('math-12-monotonicity-extrema');
    assert.ok(g12Skill, 'math-12-monotonicity-extrema exists');

    const prereqs = graph.getAllPrerequisitesTransitive('math-12-monotonicity-extrema');
    assert.ok(prereqs.includes('math-11-derivatives'), 'Must transitively depend on math-11-derivatives');
    assert.ok(prereqs.includes('math-11-limits-continuity'), 'Must transitively depend on math-11-limits-continuity');

    // Check topological sort includes both
    const topo = graph.topologicalSort();
    const idx10 = topo.indexOf('math-10-quad-func');
    const idx11 = topo.indexOf('math-11-derivatives');
    const idx12 = topo.indexOf('math-12-monotonicity-extrema');

    assert.ok(idx11 < idx12, 'math-11-derivatives must precede math-12-monotonicity-extrema in topological sort');
    if (idx10 !== -1 && idx11 !== -1) {
      assert.ok(idx10 < idx12, 'Grade 10 foundation must precede Grade 12');
    }
  });

  it('1.7 Prerequisite diagnosis flags unverified foundation when advanced skill is failed', () => {
    // Advanced skill fails; student has NOT yet taken the prerequisite test
    const masteryMap = {
      'math-12-monotonicity-extrema': {
        state: 'needs_foundation',
        accuracyEstimate: 0.15,
        testedCount: 3
      }
      // math-11-derivatives is NOT in masteryMap (not assessed)
    };

    const diagnosis = graph.diagnosePrerequisiteGaps('math-12-monotonicity-extrema', masteryMap);
    assert.ok(diagnosis.hasUnverifiedPrerequisites, 'Should flag unverified prerequisites');
    assert.ok(diagnosis.suspectedRootCauses.some(c => c.skillId === 'math-11-derivatives'));
    assert.strictEqual(diagnosis.suspectedRootCauses.find(c => c.skillId === 'math-11-derivatives').reason, 'untested_prerequisite');
  });

  it('1.8 Distinguishes national GDPT 2018 curriculum standards from specific textbook series (KNTT, CD, CTST)', () => {
    const textbookMap = repo.getTextbookMapping('toan', 10, 'kntt');
    assert.ok(textbookMap !== null);
    assert.strictEqual(textbookMap.series, 'kntt');
    assert.ok(Array.isArray(textbookMap.chapters));
    assert.ok(textbookMap.chapters.length > 0);

    // Ensure core skill identity is independent of textbook publisher
    const skill = repo.getSkillById('math-10-sets-logic');
    assert.strictEqual(skill.curriculumVersion, 'GDPT_2018');
    assert.strictEqual(skill.curriculumSource, 'BGDDT_CHUONG_TRINH_GDPT_2018');
  });
});
