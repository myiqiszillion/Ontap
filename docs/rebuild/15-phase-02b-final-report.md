# 15 — Phase 02B final report

Date: 11 October 2026 (Asia/Saigon). **Overall acceptance: BLOCKED / incomplete.** Do not claim automatic Internet question acquisition or readiness for a standard graduation mock exam.

## Status separation

| Status | Evidence / scope |
|---|---|
| IMPLEMENTED | Local plugin pipeline; fail-closed source permissions; safe bounded HTTP fetcher; structured extraction/normalization; explicit JSON-in-HTML contract; bounded pagination; persistent local queue/history/fingerprints/bank; evidence review/publish gates; protected admin APIs/UI; sanitized published V2 delivery; server-owned sessions and persistent idempotent aggregate results; reload/retry practice UI; honest coverage and draft private SQL |
| TESTED | 77 passing tests, including deterministic unit and local HTTP acceptance tests, single-process restart/dedup/result persistence; negative source/content/security cases; browser empty-bank/admin/network-retry checks. See report 14 and test output |
| LIVE VERIFIED | Research metadata HTTP access only, with URL/time/status/robots evidence. Zero acquired/published provider questions |
| BLOCKED | Approved provider acquisition contract and source-specific quota; actual pedagogical reviewers/evidence; Supabase credentials/deployment integration; production migration backup/impact validation; all 12 combinations lack verified published questions |
| NOT IMPLEMENTED | Durable Supabase repository/transaction RPC, distributed leases/quota, persisted provider cursors and version-update reconciliation, full PDF/OCR/general-HTML/MathML/image/table/graph extraction, curriculum knowledge graph matching, blueprint versions by year, production SSO/multi-role authorization, automatic source discovery and a configured production scheduler |

## Registered versus connected

Ministry and OpenStax: registered disabled placeholders, not connected acquisition sources. NTMK internal source: declaration with ownership/review evidence still pending. Khan/CK-12/VietJack/Loigiaihay: research candidates only. `fixture_source`: tests only, absent from runtime default registry. Embedded provider-attributed datasets were removed instead of being relabeled live.

## Quality gate

| Required gate | Outcome |
|---|---|
| V2 engine/scoring | Tested local behavior; mathematical validation of actual source content outstanding |
| Connector framework runs | Fixture acceptance passed; source-specific live parsers blocked |
| One permitted real source E2E | **BLOCKED**, no claim of fulfillment |
| Dedup across runs | TESTED including restart for exact normalized fingerprints |
| Review prevents unverified publishing | TESTED; actual authorized human reviews not available |
| Persistence | TESTED local single-process; serverless **BLOCKED**, durable adapter NOT IMPLEMENTED |
| Published API and generation | TESTED over HTTP with fixtures; actual public bank intentionally empty |
| Coverage 12 combinations | IMPLEMENTED; 31 bundled unverified grade-10 questions/groups, zero approved V2 records |
| Tests and E2E executed | Saved test output; deterministic HTTP E2E and scoped browser evidence |
| Phase 01/02A compatibility | Existing local practice/API regression tests pass; V2 deliberately rejects client-supplied grading keys and excludes bundled unreviewed records |
| Secrets/admin access | Hard-coded fallback key and query authentication removed; announcement writes protected; browser hard-coded Supabase credential removed; private bank no longer under static data path; SQL public answer-bearing reads revoked in draft only |

## Local operation

`npm start`; bundled study at `/`; protected content console at `/question-admin.html`; reviewed-bank practice at `/verified-practice.html`. Configure a strong `ADMIN_API_KEY` and the actual authorized reviewer identifier `ADMIN_REVIEWER_ID` on the server. Do not publish credentials in client assets or URL parameters. The key alone does not establish provider permission or pedagogical verification.

Before enabling a source: obtain suitable permission, source endpoint/schema/quota, register approved evidence, implement source-specific parsing/assets/curriculum mapping, run a bounded live batch with traceable IDs, have an authorized reviewer inspect it, then publish. Before Vercel use: implement/test the durable repository and transactional result uniqueness on staging, rehearse backup/rollback, and validate RLS. No production migration, bulk sync, deployment or commits were made in this work.

See [source research](11-real-source-research.md), [architecture](12-ingestion-architecture.md), [quality/coverage](13-question-quality-report.md), and [acceptance evidence](14-source-sync-acceptance.md).
