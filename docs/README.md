# ITF Workspace documentation hub

This is the entry point for current Workspace technical, operational and governance documentation. Documentation is
maintained with the code; a guide never overrides the implementation register or an approved policy decision.

## Choose your path

### Administrators and support officers

1. [Administrator and support guide](admin-support-guide.md)
2. [Staff onboarding runbook](runbooks/staff-onboarding.md)
3. [Troubleshooting guide](troubleshooting.md)
4. [Current implementation status](implementation-slice-register.md)

### Developers and application integrators

1. [Developer guide](developer-guide.md)
2. [Environment configuration reference](environment-reference.md)
3. [Child-application onboarding runbook](runbooks/child-app-onboarding.md)
4. [Launch-token contract](workspace-launch-token.md)
5. [Deployment environments](vercel-deployment-environments.md)
6. [Child-app readiness gates](child-app-readiness-gates.md)

### Policy, security and project owners

1. [Policy decision register](policy-decision-register.md)
2. [Plain-language policy decision guide](policy-decision-guide.md)
3. [Implementation slice register](implementation-slice-register.md)
4. [Child-app readiness gates](child-app-readiness-gates.md)
5. [Approved policy documents](policies/)

## Sources of truth

| Subject | Authoritative source |
|---|---|
| Implemented, planned and blocked work | [Implementation slice register](implementation-slice-register.md) |
| Approved and unresolved organizational rules | [Policy decision register](policy-decision-register.md) |
| Whether another app may enter staging, pilot or production | [Child-app readiness gates](child-app-readiness-gates.md) |
| Exact launch assertion and JWKS contract | [Launch-token contract](workspace-launch-token.md) |
| Environment boundaries and Vercel deployment | [Deployment guide](vercel-deployment-environments.md) |
| Per-feature implementation evidence | [Slice documents](slices/) |
| Accepted ITF directives | [Policy documents](policies/) |
| Staging evidence | [Acceptance runbooks](acceptance/) |

## Current position

- Workspace directly authenticates staff during the migration period.
- Organization setup, ordinary-staff CSV creation, temporary-password replacement and TOTP for sensitive access are
  implemented.
- ITF Flow is the first integrated child app. Ordinary `OFFICER` provisioning and launch have passed staging.
- ITF Flow lifecycle cases for role/assurance change, entitlement revocation, duplicate delivery and outage recovery
  are not yet accepted.
- Repeatable onboarding of additional apps is not yet approved; Gate C requires configurable connectors and Phase 2
  access governance.
- Production launch signing remains blocked until the approved KMS/HSM adapter exists.

Always consult the implementation register for the latest detailed status.

## Documentation quality

Run the documentation check locally:

```bash
npm run docs:check
```

The production build also runs this check. Maintenance rules and the required change matrix are in the
[documentation governance standard](documentation-governance.md).
