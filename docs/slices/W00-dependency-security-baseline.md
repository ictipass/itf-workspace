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

The baseline audit indicated that some fixes were available through ordinary updates, while the reported Next.js
resolution required a version outside the previous exact dependency declaration. No automatic fix or forced upgrade
was applied.

## Implemented changes

- Next.js and `eslint-config-next`: `16.2.4` to `16.3.2`.
- Auth.js: `next-auth` `5.0.0-beta.31` to `5.0.0-beta.32`; `@auth/core` resolves to `0.41.3`.
- Prisma client, PostgreSQL adapter and CLI: `7.8.0` to matched version `7.9.1`.
- Resend: `6.12.2` to `6.22.0`, removing the vulnerable older Svix dependency chain.
- `shadcn` was moved from runtime dependencies to development dependencies because it is a scaffolding CLI, not an
  application runtime library.
- Auth.js claim casts now use the generated `WorkspaceRole` and `UserStatus` types rather than `any`.
- Carousel and mobile viewport state now use React external-store subscriptions, clearing synchronous-effect lint
  failures without lint suppression.

The direct versions above are exact so a fresh install cannot silently move the security-sensitive framework,
authentication or data-access boundary to an unverified release.

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
- Authentication endpoints start successfully and protected-route redirection remains active; complete authenticated
  role-flow automation belongs to W08.
- Full lint, TypeScript and production build pass.
- Lockfile changes contain no unrelated dependency additions.
- Rollback version and database compatibility are documented.

## Audit interpretation

`npm audit --omit=dev --omit=optional --audit-level=low` reports zero known vulnerabilities for the production runtime
tree. A default development-tree audit still reports advisories through local scaffolding and Prisma CLI/configuration
packages. Prisma documents the `@prisma/dev` transitive advisory addressed by 7.9.1 as not affecting the CLI. The
remaining scanner findings are confined to the local CLI/configuration graph rather than Workspace request handling.
npm's suggested Prisma `6.12.0` downgrade was rejected because it is a breaking, stale resolution and is not part of
the deployed runtime.

Production packaging must omit development and optional toolchain dependencies. If the deployment platform bundles
the complete development tree into the runtime image, that packaging must be corrected before production approval.

## Verification evidence

- Clean `npm ci`: passed; Prisma Client 7.9.1 generated successfully.
- `npm audit --omit=dev --omit=optional --audit-level=low`: passed, zero vulnerabilities.
- Full ESLint: passed with zero warnings/errors.
- Prisma schema validation and client generation: passed.
- Next.js 16.3.2 production build and TypeScript validation: passed.
- Runtime smoke test: `/login` returned 200, `/api/auth/providers` returned 200 and unauthenticated `/dashboard`
  returned a 307 login redirect.
- `git diff --check`: passed.

## Rollback

Revert commit `acf76c5` to restore the earlier dependency manifest, lockfile and subscription implementations. There is
no database migration or data rollback. Rollback would restore known critical/high framework and authentication
advisories, so it is not an approved production workaround.

## Status

**Implemented** in `acf76c5`. Authenticated end-to-end role and entitlement regression automation remains tracked by
W08 and does not change the completed dependency-remediation outcome.
