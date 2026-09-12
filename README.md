# ITF Workspace

ITF Workspace is ITF's central application registry, staff authentication service and controlled launch portal for
enterprise child applications. It currently integrates ITF Flow in staging while broader access governance and
repeatable child-app onboarding remain under implementation.

## Documentation

Start at the [documentation hub](docs/README.md).

- [Developer guide](docs/developer-guide.md)
- [Administrator and support guide](docs/admin-support-guide.md)
- [Staff onboarding runbook](docs/runbooks/staff-onboarding.md)
- [Child-application onboarding runbook](docs/runbooks/child-app-onboarding.md)
- [Environment configuration reference](docs/environment-reference.md)
- [Implementation slice register](docs/implementation-slice-register.md)
- [Policy decision register](docs/policy-decision-register.md)
- [Child-app readiness gates](docs/child-app-readiness-gates.md)

The implementation and policy registers are authoritative. Guides describe current operation but do not convert a
planned feature or unresolved policy decision into an implemented capability.

## Local development

Requirements:

- a supported Node.js release for the pinned dependencies;
- PostgreSQL;
- environment values derived from `.env.example`;
- dependencies installed from the lockfile.

```bash
npm install
npm run config:check
npx prisma migrate dev
npm run dev
```

Before committing:

```bash
npm run verify
```

`npm run verify` validates runtime configuration, the Prisma schema, regression tests, documentation links, ESLint,
TypeScript through the production build, and deployment tracing for the organization workbook runtime.

Do not place real credentials, launch assertions, staff spreadsheets or production data in source control.

## Deployment

Workspace is deployed on Vercel with distinct staging and production configuration. Read the
[deployment guide](docs/vercel-deployment-environments.md) and [environment reference](docs/environment-reference.md)
before changing project settings. Production application launch remains blocked until the approved non-exportable
KMS/HSM signing adapter is implemented and operationally approved.

## Change governance

Every feature or fix must update its tests, applicable audience documentation, implementation slice and policy
records in the same delivery. Follow the [documentation governance standard](docs/documentation-governance.md).
