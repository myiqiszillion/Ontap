# 14 — Source sync acceptance

## Baseline independently checked

Initial git status already contained modifications and untracked Phase 02A/02B modules; they were not reset or committed. No `.codegraph` directory existed. Reviewed schema, validator, scoring, session-manager, blueprint-generator, bank-loader, ingestion, API V2, quiz and formula renderer. Initial `npm test`: **70 tests, 69 pass, 1 fail** (coverage expected a published Math 12 record). Several passing tests asserted embedded provider samples were live data or allowed auto-verification; those were not valid live acceptance evidence.

## Deterministic tests

Run `npm test`. **77 tests passed, 0 failed** in the final run. Final output is saved in [evidence/test-results.txt](evidence/test-results.txt).

- Synthetic API fetch → extract → normalize → validate → fingerprint dedup → persistent queue → authorized evidence review → publish → sanitized public HTTP API → server-owned exam → submission.
- Cold restart reloads queue/bank/history; second sync yields one duplicate and zero new candidate records. No same-question reuse to fill a blueprint.
- Unapproved source, missing answer, incorrect classifications, schema changes, invalid/unsupported HTML, corrupt LaTeX, unsupported image and malicious markup fail closed.
- HTTP allowlist/private DNS/IPv6/redirect tests, size/content type, ETag cache, 429/503 retry, terminal failure, network timeout and DNS deadline.
- Admin missing key/default development key/query key rejected; request body reviewer identity cannot replace the server-configured identity; empty verification evidence and unverified publication rejected.
- Session bad token/invalid answer/expiry rejected; parallel double submission returns one identical stored aggregate result; a new ExamService replays persisted results.
- Actual ProfileStore deduplicates session IDs; timer uses wall time and immediately expires a reloaded overdue session.
- Vercel mode rejects the local store; this is a tested refusal, not a successful serverless persistence integration.

Old tests expecting fabricated provider datasets and automatic verification were replaced with explicit fixtures and negative checks. Unit pass counts do not constitute mathematical/pedagogical verification of the bundled bank.

## Browser evidence

Chrome DevTools checks performed against the running local Express server:

1. Onboarding progressed to dashboard; zero history displayed; selected Math 10 and started the existing nine-item bundled quiz.
2. Saved one answer and reloaded: the answer restored. Initial observation found timer reset to 20 minutes; this was corrected to use persisted wall-clock timer state, with deterministic immediate-persistence/overdue-reload tests. Final real-browser immediate reload preserved the original start timestamp, session ID and answer.
3. `/verified-practice.html` with the real empty bank reports `Insufficient verified published data`, zero displayed questions and allows retry.
4. `/question-admin.html` without credentials reports `Unauthorized` and displays no queue content.
5. With an explicitly synthetic browser session and a injected network-failure fetch double, two rapid submit clicks issued **one** request, retained answer `2`, showed retry text, and re-enabled the submit button. Reload restored that answer and one fixture question. This simulated failure is not live ingestion or an actual provider exam.

These browser checks are recorded in [evidence/browser-checks.json](evidence/browser-checks.json). Full authenticated-admin visual E2E and production-browser/Vercel E2E are not claimed; the authenticated pipeline was tested over real local HTTP with synthetic data.

## Live evidence

[source-access.json](evidence/source-access.json) contains actual metadata research fetches. Ministry robots/reference page and OpenStax robots/licensing page returned HTTP 200; Khan returned challenge HTML; CK-12 robots returned 403; VietJack robots returned 404; Loigiaihay robots returned 200. No restriction was bypassed. No question document was imported, no provider question extracted, no teacher verified, no database publication IDs exist. **LIVE VERIFIED applies to metadata accessibility only. Live source-to-bank integration is BLOCKED.**

## Migration/deployment

No Supabase credentials were available, no database migration executed, no production deployment or scheduler enabled. Private SQL proposals do not establish storage acceptance. Local persistence tested; multi-worker durable storage and production backup/rollback rehearsal remain outstanding.
