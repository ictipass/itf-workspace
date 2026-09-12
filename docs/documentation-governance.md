# Documentation governance standard

Status: **Active engineering standard**

## Objective

Documentation must remain usable by developers, system administrators and support officers as Workspace evolves.
Documentation is part of the implementation, not a retrospective task.

## Ownership model

- The implementer updates technical and user-facing documentation in the same delivery as code.
- The approving ITF authority supplies policy outcomes; developers must not invent them.
- ICT operations validates runbooks during staging and records actual results without secrets or personal data.
- Reviewers reject a feature or fix whose affected documentation and slice evidence are missing.

## Mandatory update matrix

| Change type | Required documentation |
|---|---|
| New feature | Audience guide, relevant runbook, new/updated slice, implementation register and tests |
| Defect fix | Troubleshooting entry when operator-visible, affected slice, implementation register and regression test |
| Policy-dependent behavior | Policy decision register, plain-language guide, dated policy document and affected slice |
| Environment variable | `.env.example`, environment reference, configuration validation and tests |
| Database migration | Developer guide/runbook, slice migration and rollback sections, deployment sequence |
| Child-app contract | Child-app runbook, versioned contract document, both repositories' tests and readiness gate |
| Admin workflow/UI | Admin/support guide, relevant runbook, visible UI effect in slice and acceptance steps |
| Deployment/operations | Deployment guide, rollback, monitoring/diagnostic steps and readiness status |
| Security control | Threat/policy linkage, server-side enforcement evidence, negative tests and incident implications |

## Status language

Use only the status definitions in the [implementation slice register](implementation-slice-register.md). Clearly
distinguish:

- implemented code;
- local or staging verification;
- accepted staging behavior;
- policy or external gates;
- production approval.

Never describe a planned control as available. Never mark a slice complete because its happy path alone passed.

## Content rules

- Link to an authoritative document instead of copying volatile details into several files.
- Use exact UI labels, commands, route names and configuration-variable names.
- Include purpose, prerequisites, authorization, safe procedure, expected result, failure handling, rollback and
  escalation for operational workflows.
- Include architecture, contracts, validation, tests, migration, deployment and known limitations for developer work.
- Record dates and non-personal acceptance evidence in the relevant slice/runbook.
- Do not record passwords, API keys, private keys, database credentials, launch assertions, TOTP secrets, personal
  staff records or unredacted logs.
- Use synthetic identities in examples.

## Required checks

Run before commit:

```bash
npm run docs:check
npm run verify
```

`docs:check` confirms that the living-document set exists and that local Markdown links resolve inside the
repository. The optimized build runs the same documentation check so a broken documentation graph cannot deploy.
Automated checks do not establish factual correctness; review against the code, policy register and latest staging
evidence remains mandatory.

## Commit and handoff rule

Every completed implementation is committed. The handoff states:

1. what was implemented;
2. what changed;
3. the operational use case/effect;
4. whether visible UI changed;
5. verification results;
6. migration/configuration/deployment requirements;
7. commit hashes;
8. the next best implementable slice and its gates.

If a documentation-only correction changes no runtime behavior, state that explicitly and still commit it.
