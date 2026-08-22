# W00 — Production dependency advisory remediation

## Business outcome

Workspace must not enter a pilot or production environment with known critical vulnerabilities in its authentication
or web framework dependency chain. Remediation must preserve application behavior and be independently reviewable.

## Baseline captured

After a lockfile-reproducible `npm ci`, `npm audit --omit=dev --audit-level=low` reported:

- 24 production-tree advisories: 2 low, 8 moderate, 12 high and 2 critical;
- critical advisories in `@auth/core`, reached through the pinned `next-auth` beta;
- high advisories affecting the pinned Next.js version and its PostCSS/Sharp chain;
- additional transitive advisories requiring dependency-tree review.

The audit indicates that some fixes are available through ordinary updates, while the reported Next.js resolution
requires a version outside the current exact dependency declaration. No automatic fix or forced upgrade was applied.

## Scope

- Inventory direct and transitive production advisories and determine runtime applicability.
- Upgrade Auth.js, Next.js and other direct dependencies to patched compatible versions.
- Keep `next`, `eslint-config-next`, React and Auth.js compatibility explicit.
- Regenerate only the lockfile and generated artifacts required by the approved versions.
- Run authentication, authorization, launch, lint, type, build and relevant runtime regression checks.
- Record deferred advisories with an owner, applicability rationale and review date.

## Out of scope

- Changing ITF authentication policy, MFA policy or the future IdP selection.
- Running `npm audit fix --force` without reviewing the proposed major/out-of-range changes.
- Mixing feature development with dependency remediation.

## Acceptance criteria

- No known critical or high production advisory remains without an approved, documented exception.
- Login, logout, temporary-password enforcement, admin authorization and app launch still work.
- Full lint, TypeScript and production build pass.
- Lockfile changes contain no unrelated dependency additions.
- Rollback version and database compatibility are documented.

## Status

**In progress**: discovery and audit evidence are complete; dependency upgrades and compatibility verification have not
started. This slice is the first execution priority because it affects the authentication and request-processing trust
boundary.
