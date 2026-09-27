# W45 — Cross-application service subscription register

Status: **Implemented**  
Date: **2026-09-27**

Implementation commit: `1183ee2`

## Outcome

Workspace now owns a maintained, cross-application register of the external services and operational capabilities
needed by ITF Workspace and ITF Flow. It distinguishes production requirements from conditional features and from
open-source components whose software licence is free but whose operation still costs money.

## Changes

- Added the [service subscription register](../service-subscription-register.md), covering hosting, databases,
  document storage, email, scheduling, KMS/HSM, DNS, backups, observability, source control, scanning, OCR, EDMS,
  Office rendering, PKI, push notifications and independent assurance.
- Linked the register from the documentation hub and sources-of-truth table.
- Extended documentation governance so introducing or changing an external service requires the register,
  environment/deployment material, data-flow notes and implementation evidence to change together.

## Operational effect

There is no application UI, database, environment-variable or runtime behavior change. Project owners and procurement
can use one code-audited inventory to identify required accounts, licences and provider decisions. The register does
not approve a provider, plan, quotation or production risk acceptance.

## Verification

Run:

```bash
npm run docs:check
```

All local Markdown links must resolve. External provider pages are intentionally live references and must be checked
during procurement because plans and prices can change.

## Rollback

Revert the documentation commit. There is no runtime or data rollback.
