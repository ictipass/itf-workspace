# ITF Workspace policy decision register

This register separates organizational policy from technical implementation. **Open** items are not authorization to
select a default. The accountable ITF owner and approval evidence must be recorded before a dependent slice moves to
Ready. Secrets and personal data must never be recorded here.

Plain-language scenarios and the information needed to answer every question are available in
[`policy-decision-guide.md`](policy-decision-guide.md). Examples in that guide explain impact; they are not defaults.

## Identity and sessions

| ID | Required decision | Status | Accountable owner | Approved outcome/evidence |
|---|---|---|---|---|
| D01 | Approved enterprise identity provider and whether Workspace is only an OIDC client or must also broker identities | Approved (interim) | Super administrator | Workspace directly authenticates staff during migration; HR master list is authoritative and ICT administers it; Workspace is not an identity broker. `2026-08-23`, project architecture directive |
| D02 | Workspace idle-session lifetime by user risk level | Approved | Super administrator | Staff: 20 minutes; privileged Workspace administrators: 10 minutes; two-minute warning; deliberate Workspace activity only. `2026-08-23`, project architecture directive |
| D03 | Workspace absolute-session lifetime and reauthentication conditions | Approved | Super administrator | Three hours for all roles; server-enforced full reauthentication; no trusted-device extension; preserve work outside the expired session. `2026-08-23`, project architecture directive |
| D04 | Concurrent-session/device policy and user-visible session termination | Approved | Super administrator | Maximum two Workspace sessions; no device restriction; restricted recovery screen at the limit; users terminate their sessions and administrators may terminate any. `2026-08-23`, project architecture directive |
| D05 | Required MFA methods and roles/actions that require step-up authentication | Open (partial direction) | ITF security policy owner | Random single-use temporary credentials, TOTP interim MFA and stronger authenticators accepted in principle; exact role/action coverage and step-up validity remain open. See the `2026-08-23` directive |
| D06 | Maximum app-launch assertion lifetime and clock-skew allowance during migration | Approved | Super administrator | Balanced option: 120-second redemption, 30-second skew, atomic single use, audience binding, return to Workspace after expiry. `2026-08-23`, project architecture directive |
| D07 | Production signing model, key custody, rotation interval and emergency rotation process | Open (partial direction) | ITF security/infrastructure owners | Asymmetric signing approved; custody/storage, rotation, overlap and emergency authority remain open. See the `2026-08-23` directive |
| D08 | Login throttling thresholds and dimensions: account, IP, device and network | Open | ITF security operations | — |
| D09 | Account lockout threshold, duration and unlock authority | Open | ITF security operations/HR | — |
| D10 | Password recovery and identity-proofing process during the local-login migration period | Open | ITF ICT service desk/security | — |
| D11 | Authentication alerts, recipients, escalation and incident thresholds | Open | ITF SOC/security operations | — |

## Network and deployment

| ID | Required decision | Status | Accountable owner | Approved outcome/evidence |
|---|---|---|---|---|
| D12 | Permitted application URL domains/networks and exception approval for reachability tests | Open | ITF network/security architecture | — |
| D13 | Production hosting, reverse proxy/CDN, TLS termination and trusted forwarded-header topology | Open | ITF infrastructure | — |
| D14 | Permitted framing, script, image, connection and integration origins for browser security policy | Open | ITF security architecture/application owners | — |

## Access governance

| ID | Required decision | Status | Accountable owner | Approved outcome/evidence |
|---|---|---|---|---|
| D15 | Who owns and approves each application's role and scope catalogue | Open | ITF business owner and ICT | — |
| D16 | Standard role/scope naming and versioning convention | Open | ITF architecture | — |
| D17 | Behavior when a child app no longer recognizes a provisioned role | Open | ITF architecture/application owner | — |
| D18 | Authoritative source and owners for access groups | Open | ITF HR/ICT/security | — |
| D19 | Precedence between direct, group, organizational and deny assignments | Open | ITF security governance | — |
| D20 | Organizational attributes permitted to grant or remove application access automatically | Open | ITF HR/business/security owners | — |
| D21 | Temporary-access maximum duration and renewal rules | Open | ITF security governance | — |
| D22 | Access approvers by application, role and organizational level | Open | ITF management/business owners | — |
| D23 | Break-glass eligibility, approval, monitoring and post-use review | Open | ITF security leadership | — |
| D24 | Who may request access for self or another staff member | Open | ITF management/HR | — |
| D25 | Required request justification and supporting evidence | Open | ITF security/business owners | — |
| D26 | Approval delegation and segregation-of-duties requirements | Open | ITF audit/security/management | — |
| D27 | Access-request SLA, escalation and expiry | Open | ITF service owner | — |
| D28 | Access-certification frequency | Open | ITF audit/security | — |
| D29 | Certification reviewers and escalation for non-response | Open | ITF audit/management | — |
| D30 | Incompatible application roles and combinations | Open | ITF audit/business owners | — |

## Provisioning, data and application boundaries

| ID | Required decision | Status | Accountable owner | Approved outcome/evidence |
|---|---|---|---|---|
| D31 | Approved provisioning standard: SCIM 2.0 or a governed versioned internal contract | Open | ITF architecture/security | — |
| D32 | SIWES identity boundary between ITF staff and students, institutions, employers, supervisors and regulators | Open | SIWES business owner/security/privacy | — |
| D33 | Workspace and integration audit retention, immutability and SIEM requirements | Open | ITF audit/legal/security | — |
| D34 | Personal data allowed in launch claims, provisioning payloads and central logs | Open | ITF privacy/legal/security | — |
| D35 | Availability targets, recovery time objective and recovery point objective | Open | ITF service owner/infrastructure | — |

## Decision procedure

For each decision, record the approved outcome, effective date, approving authority and policy/document reference.
If a decision changes, retain the earlier outcome as dated history and identify affected slices, migrations and applications.

Detailed evidence for the decisions above is retained in
[`policies/2026-08-23-session-and-launch-directive.md`](policies/2026-08-23-session-and-launch-directive.md).
