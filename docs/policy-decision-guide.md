# ITF Workspace policy decision guide

This guide explains why each question in the policy decision register matters. The scenarios are examples, not ITF
policy or technical defaults. An answer may be "not yet decided"; the dependent implementation will remain gated.

For each decision, provide the approved outcome, accountable owner, effective date and policy or approval reference.

## Identity and sessions

### D01 — Enterprise identity provider and Workspace's role

**Use case:** A staff member already signs in to Microsoft 365 with an organizational account. ITF must decide whether
Workspace redirects that person to the same identity provider, or whether Workspace must also broker identities from
other sources. This determines who verifies identity, enforces MFA, disables departed staff and recovers accounts.

**Please provide:** Existing identity platforms, authoritative staff directory, intended identity provider, whether
non-staff identities are ever admitted, and whether Workspace is only a client or an identity broker.

### D02 — Idle-session lifetime

**Use case:** A staff member signs in and leaves a shared office computer unattended. The idle limit controls how long
the session remains usable without activity. Different risk levels may need different limits.

**Please provide:** Permitted inactivity period for ordinary staff and privileged administrators, what counts as
activity, and whether users receive a warning before expiry.

### D03 — Absolute-session lifetime and reauthentication

**Use case:** A staff member actively uses Workspace throughout the day. An absolute limit determines when login is
required again even if the person remains active, reducing the lifetime of a stolen session.

**Please provide:** Maximum signed-in duration, actions/events that force reauthentication, and whether trusted devices
may receive a different duration.

### D04 — Concurrent sessions and device management

**Use case:** A staff member signs in on an office computer and a mobile device. ITF must decide whether both sessions
are allowed, whether there is a maximum, and whether users or administrators can inspect and terminate sessions.

**Please provide:** Allowed concurrent sessions, device restrictions, behavior when the limit is reached, and who may
terminate one session or all sessions.

### D05 — MFA and step-up authentication

**Use case:** Opening the app catalogue may require normal login, while granting system-administrator access or viewing
sensitive information may require a recent second factor. This decision determines accepted factors and protected
actions.

**Please provide:** Approved MFA methods, roles required to use MFA, actions requiring fresh step-up, and how long a
successful step-up remains valid.

**Approved interim outcome (2026-08-23):** Standard applications and roles permit password-only authentication. TOTP
step-up is required when either the application or the user's assigned child-app role is classified sensitive; the
more restrictive classification wins. Workspace `SYSTEM_ADMIN` and `APP_ADMIN` roles always require TOTP and cannot be
downgraded through settings. Step-up remains fresh for ten minutes. Every app and child-app role requires an explicit
standard/sensitive classification before activation. Email remains a notification/recovery channel, not an MFA factor.
See the project architecture directive follow-up and D05 in the decision register.

### D06 — App-launch assertion lifetime and clock skew

**Use case:** Workspace issues a one-time handoff that ITF Flow redeems. A very long lifetime increases theft/replay
risk; a very short lifetime may reject legitimate launches when systems have slight clock differences or slow links.

**Please provide:** Maximum redemption period, tolerated clock difference, single-use requirement, and expected user
experience when a token expires.

### D07 — Signing keys, custody and rotation

**Use case:** If every app shares one signing secret, compromise of one child app may allow forged launches to another.
Asymmetric keys or per-app secrets reduce that blast radius but require an approved custody and rotation process.

**Please provide:** Approved signing model, key owner/storage system, rotation frequency, overlap period, emergency
rotation authority, and child-app notification process.

**Approved interim outcome (2026-08-23):** Launch v2 uses RS256 with 3072-bit RSA keys through a vendor-neutral signer.
Production requires a non-exportable managed KMS/HSM or approved Vault/HSM; ICT Security owns policy, Infrastructure
Operations administers custody, and Workspace receives sign-only access. Keys rotate every 90 days with 24-hour normal
public-key overlap. The ICT Security lead or incident commander may order no-overlap emergency rotation with a second
reviewer within 24 hours. Public keys and rotation state are delivered through versioned JWKS, five-minute caching,
automated connector events and ICT notifications. See the dedicated
[`launch assertion signing-key policy`](policies/2026-08-23-launch-assertion-key-management-policy.md).

### D08 — Login throttling

**Use case:** An attacker tries many passwords for one account or one common password across many staff accounts. Rate
limits can consider account, IP, device and network, but overly broad limits can block an entire ITF office.

**Please provide:** Thresholds/time windows, dimensions to measure, treatment of trusted ITF networks, and response to
distributed attempts.

### D09 — Account lockout

**Use case:** Repeated failures may indicate attack or a staff member mistyping a password. Permanent lockout can enable
denial of service, while no lockout increases guessing risk.

**Please provide:** Failure threshold, lock duration, automatic recovery behavior, unlock authority and audit/alert
requirements.

### D10 — Password recovery and identity proofing

**Use case:** During local-login migration, a staff member forgets a password. The service desk must verify the person's
identity before resetting it so a caller cannot take over another employee's account.

**Please provide:** Verification steps, authorized reset personnel, delivery channel for temporary credentials, expiry,
forced-change behavior and whether manager confirmation is required.

### D11 — Authentication alerts and escalation

**Use case:** Repeated failed logins, an administrator login from an unusual location, or mass lockouts may require SOC
attention. Undefined thresholds either create alert fatigue or leave incidents unnoticed.

**Please provide:** Alert events, severity thresholds, recipients, escalation times, after-hours process and retention.

## Network and deployment

### D12 — Permitted application URLs and networks

**Use case:** The app URL tester causes the Workspace server to contact a configured address. Without restrictions, a
compromised administrator could use it to reach internal services or cloud metadata endpoints.

**Please provide:** Approved public/internal domains, allowed ports/protocols, private-network policy, who approves
exceptions, and whether outbound access is restricted at the network layer.

### D13 — Hosting and trusted proxy topology

**Use case:** Workspace may sit behind a load balancer or CDN that terminates TLS and supplies client IP/host headers.
Trusting headers from an unapproved source can undermine secure cookies, redirects, throttling and audit evidence.

**Please provide:** Hosting platform, proxy/CDN/load balancer path, TLS termination point, trusted proxy addresses,
canonical hostname and production environments.

### D14 — Browser security origins

**Use case:** A Content Security Policy must permit the scripts, images, fonts and API endpoints Workspace genuinely
uses while blocking injection and framing. Unknown integrations lead either to breakage or an unsafe wildcard policy.

**Please provide:** Approved origins for scripts, styles, fonts, images and connections; framing requirements; analytics
or monitoring providers; and report-only rollout expectations.

## Access governance

### D15 — Application role ownership

**Use case:** ITF Flow's business owner understands what `DIRECTOR` may do, while ICT operates Workspace. Someone must
own role definitions and approve changes so ICT does not invent business authority.

**Please provide:** Business and technical owner for each app, role approver and required review/sign-off process.

### D16 — Role/scope naming and versioning

**Use case:** `ADMIN`, `APP_ADMIN` and `SYSTEM_ADMIN` can mean different things in different apps. A standard prevents
mis-provisioning and allows contracts to evolve safely.

**Please provide:** Naming convention, case/format rules, identifier stability and version/deprecation process.

### D17 — Removed or unknown child-app roles

**Use case:** Workspace still grants a role that a newly deployed child version has removed. Silently mapping it could
grant excessive access; silently accepting the user could undercut policy.

**Please provide:** Fail-closed behavior, administrator notification, migration period and who resolves mismatches.

### D18 — Authoritative access groups

**Use case:** Access may be assigned to groups such as Finance Directors. ITF must decide whether HR, an IdP directory,
Workspace administrators or application owners control membership.

**Please provide:** Authoritative source, group owners, membership update process, synchronization frequency and review.

### D19 — Entitlement precedence

**Use case:** A user receives access through a group but also has an explicit deny or expired direct grant. A defined
precedence rule prevents different parts of Workspace from reaching different decisions.

**Please provide:** Precedence among deny, direct, group, organizational and temporary grants, plus conflict handling.

### D20 — Organization-rule access

**Use case:** Moving a staff member from Finance to ICT may automatically add or remove apps. Automation is efficient,
but incorrect HR data could grant sensitive access without review.

**Please provide:** Attributes permitted to grant/revoke access, eligible apps/roles, approval exceptions and timing.

### D21 — Temporary access duration

**Use case:** A staff member joins a three-month project and needs an app temporarily. Without automatic expiry,
project access commonly becomes permanent by accident.

**Please provide:** Maximum duration, renewal rules, advance-expiry notice and post-expiry behavior.

### D22 — Access approvers

**Use case:** Reimbursement access might require a line manager and Finance owner, while a low-risk reporting app may
only require its owner. Approval authority must be explicit per app and role.

**Please provide:** Required approvers by app/role/risk, approval order, quorum and substitute approvers.

### D23 — Break-glass access

**Use case:** During an incident, a designated responder may need temporary privileged access when the normal approver
is unavailable. This must be exceptional, time-bound, monitored and reviewed.

**Please provide:** Eligible users, activation authority, maximum duration, notifications, logging and review deadline.

### D24 — Who may request access

**Use case:** ITF may allow self-service requests, manager-on-behalf requests, or only application-owner provisioning.
The choice changes privacy, approval and workload requirements.

**Please provide:** Eligible requesters, on-behalf rules and whether requests for privileged roles differ.

### D25 — Request justification

**Use case:** An approver needs enough information to decide whether access is job-related without collecting excessive
personal or sensitive information.

**Please provide:** Required fields/evidence, prohibited content, retention and whether attachments are allowed.

### D26 — Delegation and separation of duties

**Use case:** A requester should not approve their own privileged access, and a temporary acting manager may or may not
inherit approval authority.

**Please provide:** Self-approval prohibition, delegation eligibility/dates, incompatible requester/approver roles and
multi-approval requirements.

### D27 — Request SLA and expiry

**Use case:** An unanswered request should not remain valid indefinitely after the employee's job or project changes.

**Please provide:** Decision target time, escalation path, reminder schedule and pending-request expiry.

### D28 — Access certification frequency

**Use case:** Managers and app owners periodically confirm that users still need access, especially after transfers.

**Please provide:** Review frequency by risk/app/role and whether event-triggered reviews supplement the schedule.

### D29 — Certification reviewers

**Use case:** A manager may verify employment need while an app owner verifies application role. A reviewer may also be
absent or fail to respond.

**Please provide:** Reviewers, review sequence, delegation, non-response escalation and default outcome.

### D30 — Incompatible roles

**Use case:** The same reimbursement user may not be permitted to create and finally approve a payment. Cross-app role
combinations may also create conflicts.

**Please provide:** Prohibited combinations, exception authority, compensating controls and existing-user remediation.

## Provisioning, data and application boundaries

### D31 — Provisioning standard

**Use case:** Workspace must create/update/deactivate identities in first-party and third-party apps. SCIM improves
interoperability; an internal contract may be simpler initially but increases custom integration obligations.

**Please provide:** Approved standard, third-party requirements, supported operations, synchronization expectations and
contract ownership.

### D32 — SIWES identity boundary

**Use case:** SIWES serves ITF staff as well as students, institutions, employers, supervisors and regulators. Workspace
staff SSO must not accidentally make external identities ITF staff or expose staff-only applications.

**Please provide:** Identity populations, authoritative source for each, which use Workspace, account-linking rules and
staff/external separation requirements.

### D33 — Audit retention and immutability

**Use case:** Investigating an access grant or security incident may require logs years later. Operational database logs
alone may be mutable or expire too early.

**Please provide:** Retention periods, immutable/SIEM destination, authorized viewers, export/legal-hold requirements
and disposal process.

### D34 — Personal data in integrations

**Use case:** A child app may only need immutable user ID and role, while sending email, organizational hierarchy and
other attributes increases privacy exposure and stale-data risk.

**Please provide:** Allowed attributes by integration purpose, prohibited data, masking/logging rules and retention.

### D35 — Availability and recovery objectives

**Use case:** If Workspace is unavailable, staff may be unable to launch any enterprise application. ITF must decide how
long an outage and how much data loss are tolerable, and whether existing child-app sessions continue.

**Please provide:** Availability target, RTO, RPO, maintenance windows, degraded-mode expectations and recovery owner.

### D36 — HR master-list Workspace role boundary

**Use case:** HR supplies an authoritative staff spreadsheet. If that file can assign `SYSTEM_ADMIN` or `APP_ADMIN`, a
spreadsheet error or unauthorized alteration could create a privileged account without a separate security approval.

**Approved interim outcome (2026-08-23):** HR master-list imports create `STAFF` accounts only. Privileged Workspace
roles are granted separately by an approved super administrator through a governed action requiring fresh TOTP and
audit evidence. Privileged role values in a file are rejected rather than silently converted. See D36 in the decision
register and the staff onboarding role-boundary directive.
