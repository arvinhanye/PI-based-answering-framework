# Core verification

Run `npm test -- tests/integration/core.test.ts tests/integration/core-storage.test.ts tests/unit/objective.test.ts tests/unit/review-scheduler.test.ts` from project root.

Current evidence: 16 passing behavioral tests, including real node:sqlite subprocess concurrent writes and abrupt exit rollback. Initial dependency absence is not a red test. Two later boundary tests were observed failing before their fixes.

Question views use explicit fields and omit answer/rawAnswer/explanation. Only question-role assets are exposed. Importer must validate their content/role and keep answer-bearing page assets source-only. Direct user handlers own submit/reveal/skip authorization; audit origins are not authentication tokens. Refer to core-report.md for APIs and remaining full-v1 work.
