/**
 * Question Authoring & Review Workflow Tests
 * NTMK Rebuild Phase 04A — Tasks 4B & 7
 *
 * Requirements Tested:
 * 1. Internal authoring API (/api/admin/questions/draft) validates and enqueues questions.
 * 2. AI-assisted drafts are explicitly flagged and require human review.
 * 3. Reviewers can request revisions with pedagogical feedback.
 * 4. Curriculum Lead can rollback published questions with audit logging.
 * 5. Reviewer RBAC enforcement (auditor vs lead vs operator).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { adminHandlers, getSyncManager } = require('../api/v2/admin.js');
const { defaultDirectory, REVIEWER_ROLES } = require('../engine/auth/reviewer-directory.js');
const QuestionSchemaV2 = require('../engine/schema.js');

describe('Task 4B & 7 — Question Authoring, Review Workflow & Rollback', () => {
  process.env.ADMIN_API_KEY = 'test_admin_key_123456';
  const sm = getSyncManager();

  it('4.1 Authoring API: enqueues valid question draft into review queue', () => {
    const validDraft = {
      format: QuestionSchemaV2.FORMATS.MULTIPLE_CHOICE,
      subjectId: 'toan',
      grade: 10,
      topic: 'menh_de_tap_hop',
      skillId: 'math-10-sets-logic',
      cognitiveLevel: QuestionSchemaV2.COGNITIVE_LEVELS.UNDERSTAND,
      prompt: 'Cho tập hợp $A = \\{x \\in \\mathbb{R} \\mid x^2 - 4 = 0\\}$. Số phần tử của $A$ là:',
      explanation: 'Phương trình $x^2 - 4 = 0 \\iff x = \\pm 2$. Vậy $A = \\{-2; 2\\}$, có 2 phần tử.',
      mcqPayload: {
        options: ['2 phần tử', '1 phần tử', '4 phần tử', '0 phần tử'],
        correctOptionIndex: 0
      }
    };

    let statusCode = 0;
    let responseBody = null;
    const req = {
      headers: { 'x-admin-key': 'test_admin_key_123456' },
      body: validDraft
    };
    const res = {
      status(c) { statusCode = c; return this; },
      json(d) { responseBody = d; return this; }
    };

    adminHandlers.draftQuestion(req, res);

    assert.strictEqual(statusCode, 201, 'Should return 201 Created');
    assert.ok(responseBody.question, 'Should return enqueued question');
    assert.strictEqual(responseBody.question.reviewStatus, 'needs_review');
  });

  it('4.2 AI-assisted drafts: must be flagged with review reasons and human review requirement', () => {
    const aiDraft = {
      isAiAssisted: true,
      format: QuestionSchemaV2.FORMATS.MULTIPLE_CHOICE,
      subjectId: 'toan',
      grade: 10,
      topic: 'ham_so_bac_hai',
      skillId: 'math-10-quad-func',
      cognitiveLevel: QuestionSchemaV2.COGNITIVE_LEVELS.RECOGNIZE,
      prompt: 'Hàm số nào sau đây là hàm số bậc hai?',
      explanation: 'Hàm số $y = 2x^2 - 3x + 1$ có bậc cao nhất của biến là 2.',
      mcqPayload: {
        options: ['$y = 2x^2 - 3x + 1$', '$y = 2x + 1$', '$y = \\frac{1}{x^2}$', '$y = x^3 - 1$'],
        correctOptionIndex: 0
      }
    };

    let statusCode = 0;
    let responseBody = null;
    const req = {
      headers: { 'x-admin-key': 'test_admin_key_123456' },
      body: aiDraft
    };
    const res = {
      status(c) { statusCode = c; return this; },
      json(d) { responseBody = d; return this; }
    };

    adminHandlers.draftQuestion(req, res);

    assert.strictEqual(statusCode, 201);
    assert.strictEqual(responseBody.question.source.isAiAssisted, true);
    assert.ok(responseBody.question.reviewReasons.includes('ai_assisted_draft_unverified'));
  });

  it('7.1 Revision request workflow: updates question review status with feedback', () => {
    const mathToken = 'tok_fixture_auditor_toan_a89f3c7e12';

    // Create a draft
    const draftId = `q_rev_${Date.now()}`;
    sm.reviewQueue.enqueue({
      id: draftId,
      format: 'multiple_choice',
      subjectId: 'toan',
      grade: 10,
      topic: 'menh_de_tap_hop',
      prompt: 'Câu hỏi cần chỉnh sửa công thức',
      explanation: 'Lời giải',
      mcqPayload: { options: ['A', 'B', 'C', 'D'], correctOptionIndex: 0 }
    });

    let statusCode = 0;
    let responseBody = null;
    const req = {
      headers: {
        'x-admin-key': 'test_admin_key_123456',
        'x-reviewer-token': mathToken
      },
      params: { id: draftId },
      body: { feedback: 'Vui lòng bổ sung thêm giải thích chi tiết cho phương án sai' }
    };
    const res = {
      status(c) { statusCode = c; return this; },
      json(d) { responseBody = d; return this; }
    };

    adminHandlers.revisionQuestion(req, res);

    assert.strictEqual(statusCode, 200);
    assert.strictEqual(responseBody.question.reviewStatus, 'revision_requested');
  });

  it('7.2 Rollback publication: Curriculum Lead rolls back question to archived', async () => {
    const leadToken = 'tok_lead_curriculum_e19f8a3d90';
    const mathToken = 'tok_fixture_auditor_toan_a89f3c7e12';

    // Pick an existing published pilot question
    const qId = 'toan10_pilot_set_mcq_01';
    assert.ok(sm.bankStorage.getById(qId), 'Question must exist in bank');

    let statusCode = 0;
    let responseBody = null;
    const req = {
      headers: {
        'x-admin-key': 'test_admin_key_123456',
        'x-reviewer-token': leadToken
      },
      params: { id: qId },
      body: { reason: 'Cần cập nhật đề minh họa mới' }
    };
    const res = {
      status(c) { statusCode = c; return this; },
      json(d) { responseBody = d; return this; }
    };

    await adminHandlers.rollbackQuestion(req, res);

    assert.strictEqual(statusCode, 200);
    assert.strictEqual(responseBody.question.status, QuestionSchemaV2.PUBLISH_STATUS.ARCHIVED);

    // Auditor cannot perform rollback (only Curriculum Lead)
    const reqAuditor = {
      headers: {
        'x-admin-key': 'test_admin_key_123456',
        'x-reviewer-token': mathToken
      },
      params: { id: qId }
    };

    await adminHandlers.rollbackQuestion(reqAuditor, res);
    assert.strictEqual(statusCode, 403, 'Auditor must be forbidden from rolling back');

    // Restore back to published status for subsequent tests
    const q = sm.bankStorage.getById(qId);
    q.status = QuestionSchemaV2.PUBLISH_STATUS.PUBLISHED;
    await sm.bankStorage.save(q);
  });
});
