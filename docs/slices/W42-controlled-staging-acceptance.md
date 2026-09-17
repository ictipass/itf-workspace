# W42 — Controlled staging acceptance

Implemented 2026-09-17; **live A01-06/A01-07 acceptance pending**. Cross-repository dependency: Flow S23E.

## Change and effect

SYSTEM_ADMIN/fresh-TOTP-only staging page with explicit maintenance reference and revocation consent. Pins one
ordinary test user to a configurable window of at most 24 hours. Creates entitlement revocation, outbox event and
start audit atomically. A01-06 delivers the same event body/ID twice and checks acknowledgements, durable event count
and session state. A01-07 injects one authenticated HTTP 503 before receiver side effects, inspects durable retry
state and later claims only the recorded due event through the real outbox worker.

Flow's authenticated read-only observation endpoint exposes only bounded diagnostic counts for the pinned identity.
Normal production delivery receives no diagnostic failure header. No arbitrary URLs/users/payloads, automatic
restoration, production diagnostic execution, general queue replays or new secrets are exposed.

## Deployment and verification

No migration. Three temporary non-secret variables in both apps; Flow also has an explicit deployment-stage selector.
Defaults remain disabled. See the [complete operator/deployment procedure](../acceptance/A01-staging-diagnostic-operations.md).

Regression coverage checks stage/window/target guards, explicit consent, response validation, filtered delivery,
fresh-MFA authorization and receiver failure ordering. Full verification runs tests, lint, types and production builds;
actual staging evidence is separate and must not be inferred from local tests.

UI effect: diagnostic page under `/dashboard/admin/integrations/acceptance`, linked from Admin Help; ordinary users
cannot access it. Expired/disabled configuration shows instructions rather than enabling controls.

Next: deploy both commits, explicitly configure the chosen ordinary test account/window, execute A01-06/A01-07 and
retain acceptance evidence. Continuous outbox scheduling and other pilot/production gates remain unresolved.

## Delivery evidence

Starting commits: Workspace `ae9649d`, Flow `5a55007`; both worktrees were clean before this operation.
Implementation commits: Workspace `b3a9ab5`, Flow `c4cef48`; all changes belong to W41/W42/S23E.
Workspace `npm run verify`, supplementary final security/lint checks and documentation checks passed:
100 regressions, 57 Markdown documents, successful production build and complete organization-workbook runtime traces.
Flow has 36 passing security cases; paired full-build evidence is recorded in the implementation register on commit.
No live diagnostic was executed: the test pin, window and operator consent have not been configured by ITF.
