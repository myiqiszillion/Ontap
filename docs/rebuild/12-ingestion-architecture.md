# 12 — Ingestion architecture

## Implemented boundary

SourceRegistry → SourceConnector (APIAdapter / explicit HTMLAdapter contract) → HTTPFetcher → QuestionExtractor → QuestionNormalizer → ContentValidator → persistent fingerprint gate → ReviewQueue → authorized review → QuestionPublisher → BankStorage → sanitized V2 API → ExamService.

Source registry entries are declarations, not live integrations. Ministry/OpenStax connectors are disabled placeholders; their previous embedded “authentic” datasets were removed. Fixture connector lives exclusively under tests/fixtures and is never registered by production defaults.

HTTPFetcher requires an explicit HTTPS host allowlist. Every redirect is checked; private/reserved IPv4 resolutions and IPv6 are denied, DNS answers are pinned to the request lookup, credentials in URLs are denied, and cross-host Authorization redirects are blocked. DNS/request deadlines, bounded response size, content type, retry/backoff for 429/5xx/network failures, per-host pacing, conditional cache and structured metadata logs are implemented. Query strings are omitted from logs. Pagination is explicit and bounded in APIAdapter; reaching its limit fails rather than publishing an incomplete response. In-process pacing/cache are not a distributed quota service.

Structured JSON preserves question subject/grade/topic and answer-policy fields. A missing grade fails normalization; unknown subjects fail schema validation. Missing answers remain missing. MCQ text options are assigned by A/B/C/D labels; missing TF answers remain null. Shared TF passages remain attached. HTMLAdapter accepts only a documented JSON block (`script type="application/json" id="ntmk-questions"`), without executing it. Arbitrary HTML/PDF/OCR/MathML/graphs are not implemented. Unsupported assets, markup or corrupt formulas cannot pass publication. Parser confidence never grants verification.

## Local persistence and trust

Default private files are `.ntmk/question-bank-v2.json`, its `.review.json` and `.jobs.json` companions, and `.ntmk/exam-sessions.json`. Temporary file + rename protects readers from partial JSON writes. Corrupt storage/write errors propagate. Pending candidates and history survive a new SyncManager, so fingerprint deduplication survives restart. **Support is limited to one Express process on one local filesystem**; no multi-process transaction guarantee is claimed. Candidate and published-bank writes are separate, with publication saved before the queue is marked published. Repeating publication can reconcile a queue-write failure. Local state files are not served by static routes.

`NTMK_BANK_PATH` and `NTMK_EXAM_PATH` override paths for deployments/tests. Back up all private files with the server stopped; restore together and check fingerprints/counts. Do not put private paths under public or data directories. No existing data was migrated automatically.

Admin operations require `X-Admin-Key` matching a configured `ADMIN_API_KEY`; no default secret or query-token authentication exists. Verification identity is supplied by server configuration `ADMIN_REVIEWER_ID`, not by request body. The operator must configure an actual authorized reviewer identity. Nonempty verification evidence, valid content, topic mapping and source permission are required. This is a local single-administrator credential model, not per-user SSO or multi-role RBAC. Production identity integration remains outstanding. Admin pages contain no stored key and use textContent to display imported records.

Trusted exam start snapshots private published questions, returns a random session token and sanitized questions, and sets a server expiry. Submission accepts only session ID/token/answers; client questions and grading options are ignored and cannot create a session. Results are stored once per session ID and replayed on duplicate submissions. Aggregate responses omit answer-bearing item breakdowns. Rate limiting, retention and distributed session locking are production follow-ups.

Legacy `/api/data` and bundled `/data` files remain openly available for local learning/review. Those questions are excluded from trusted V2 publication and exam pools. Local practice history also deduplicates by its session ID. UI identifies bundled timed quizzes as practice; `/verified-practice.html` is the server-scored flow.

## Serverless and scheduler

LocalState refuses to operate when `VERCEL` is set. This is an explicit **BLOCKED** response, not ephemeral persistence. Supabase credentials are absent in this environment, and the old silent camelCase upsert fallback was disabled. Draft SQL migrations exist; the durable Supabase repository and distributed transactions are **NOT IMPLEMENTED**. No migration was executed.

Migration 001 revokes public access to answer-bearing rows. Draft migration 002 proposes private source permissions, candidate fingerprints/versions, jobs, audit, sessions and unique session results; RLS is enabled with no public policies. Before rollout: back up, review existing schema/policies, run on staging, validate counts/access, implement the durable adapter and transaction RPC, then approve production changes. Restore a tested backup for rollback; do not drop populated tables.

External schedulers can POST an explicit connectorId to `/api/v2/sync`, with admin authentication. No scheduler is enabled, no Vercel cron configured, and background setInterval sync is disabled. Source-specific approved frequencies, distributed leases and persisted cursors still need implementation before production scheduled acquisition.

## Admin/API entry points

- `/question-admin.html`: source status, explicit source sync, history, all review states, evidence, verify/reject/publish, coverage.
- `/api/v2/manage?action=status|history|review|coverage|bank` (GET); `verify|reject|publish&id=...` (POST).
- `/api/v2/questions?subject=toan10`: verified published sanitized questions only.
- `/api/v2/questions?action=start|submit` (POST), plus Express `/api/v2/exam/start|submit` aliases.
- `/verified-practice.html`: reloadable answers, bounded fetch timeout, submission lock, retry without discarding session.

Browser schema/scoring copies are served from public/js. Keep them synchronized with engine/schema.js and engine/scoring.js; both browser copies were regenerated in this change.
