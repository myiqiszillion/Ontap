/**
 * Strict Zero-Emoji Automated Audit Test Suite
 * Conforms to UI/UX Pro Max and WCAG AAA Guidelines:
 * Asserts that zero raw emojis exist across all JavaScript files in public/js/.
 * All visual iconography must strictly use Lucide vector SVGs via Icons.get(...)
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('Strict Zero-Emoji Audit across public/js/', () => {
  const publicJsDir = path.join(__dirname, '..', 'public', 'js');
  const jsFiles = fs.readdirSync(publicJsDir).filter(file => file.endsWith('.js'));

  // Standard Unicode emoji and dingbat ranges:
  // - Extended Pictographic (\p{Extended_Pictographic})
  // - Miscellaneous Symbols and Pictographs (\u{1F300}-\u{1FAFF})
  // - Miscellaneous Symbols and Dingbats (\u{2600}-\u{27BF})
  // - Regional Indicators / Flags (\u{1F1E6}-\u{1F1FF})
  const EMOJI_REGEX = /(?:\p{Extended_Pictographic}|[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|[\u{1F1E6}-\u{1F1FF}])/u;

  test('public/js directory contains valid JavaScript files', () => {
    assert.ok(jsFiles.length >= 20, `Found ${jsFiles.length} files in public/js`);
  });

  for (const file of jsFiles) {
    test(`Zero raw emojis in public/js/${file}`, () => {
      const filePath = path.join(publicJsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      const violations = [];

      lines.forEach((line, index) => {
        const lineNum = index + 1;
        const matches = line.match(new RegExp(EMOJI_REGEX.source, 'gu'));
        if (matches && matches.length > 0) {
          violations.push({
            line: lineNum,
            emojis: matches.join(', '),
            snippet: line.trim()
          });
        }
      });

      if (violations.length > 0) {
        const details = violations
          .map(v => `  - Line ${v.line}: [${v.emojis}] in "${v.snippet.slice(0, 100)}"`)
          .join('\n');
        assert.fail(
          `Found ${violations.length} raw emoji violation(s) in public/js/${file}:\n${details}\n` +
          `Replace all raw emojis with Lucide vector SVGs via Icons.get('icon-name', ...) or semantic text.`
        );
      }

      assert.equal(violations.length, 0, `File ${file} must have 0 raw emojis`);
    });
  }
});
