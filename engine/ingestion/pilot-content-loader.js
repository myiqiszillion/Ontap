/**
 * Pilot Question Content Loader & Verification Importer
 * NTMK Rebuild Phase 04A — Task 6
 *
 * Responsibilities:
 * - Load authentic, vetted Toán 10 pilot questions into Question Bank Storage
 * - Perform dual validation (QuestionValidator + ContentValidator)
 * - Record pedagogical audit log entries
 * - Synchronize to local persistent question bank
 */

const path = require('path');
const fs = require('fs');
const { PILOT_QUESTIONS } = require('../storage/pilot-questions-data.js');
const QuestionValidator = require('../validator.js');
const ContentValidator = require('./content-validator.js');
const BankStorage = require('../storage/bank-storage.js');

async function loadPilotQuestions(bankStorage = null, options = {}) {
  const bank = bankStorage || new BankStorage();
  const results = {
    total: PILOT_QUESTIONS.length,
    loaded: 0,
    skipped: 0,
    errors: []
  };

  for (const q of PILOT_QUESTIONS) {
    try {
      // Validate schema & deep content
      const baseVal = QuestionValidator.validate(q);
      const deepVal = ContentValidator.validate(q);

      if (!baseVal.valid || !deepVal.valid) {
        results.errors.push({
          id: q.id,
          errors: [...baseVal.errors, ...deepVal.errors]
        });
        continue;
      }

      await bank.save(q, {
        action: 'pilot_draft_import',
        by: 'Editorial Ingestion Pipeline',
        notes: 'Loaded pilot draft question into review queue awaiting human pedagogical review'
      });

      results.loaded++;
    } catch (err) {
      results.errors.push({ id: q.id, error: err.message });
    }
  }

  // Also sync to data/question-bank-v2.json if directory exists
  try {
    const dataBankPath = path.join(process.cwd(), 'data', 'question-bank-v2.json');
    const existing = fs.existsSync(dataBankPath) ? JSON.parse(fs.readFileSync(dataBankPath, 'utf8') || '{}') : {};
    const questionsObj = existing.questions || {};

    for (const q of PILOT_QUESTIONS) {
      questionsObj[q.id] = q;
    }

    fs.writeFileSync(dataBankPath, JSON.stringify({
      version: '2.0.0',
      curriculum: 'GDPT2018',
      updatedAt: new Date().toISOString(),
      count: Object.keys(questionsObj).length,
      questions: questionsObj
    }, null, 2), 'utf8');
  } catch (err) {
    // Non-fatal if data directory sync fails
  }

  return results;
}

if (require.main === module) {
  loadPilotQuestions()
    .then(res => {
      console.log('✅ Pilot Questions Load Complete:', res);
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Failed to load pilot questions:', err);
      process.exit(1);
    });
}

module.exports = {
  loadPilotQuestions
};
