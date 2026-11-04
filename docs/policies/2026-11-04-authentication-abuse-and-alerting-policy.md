# Authentication abuse, lockout, recovery and alerting policy

Status: **Approved interim policy, 2026-11-04**  
Authority: **Super administrator**

## Purpose

This policy controls password-guessing resistance, temporary lockout, password recovery and authentication-security
alerting while Workspace directly authenticates ITF staff during the migration period.

## D08 — Login throttling

- Use durable database-backed controls; in-memory counters alone are not sufficient.
- Return one generic failure response for unknown account, invalid password, throttle and lock conditions.
- After five failures for the same account and source within 15 minutes, delay further attempts for 60 seconds.
- After 100 failures from one source within 15 minutes, throttle that source.
- Aggregate failures for an account across sources to resist distributed guessing.
- Do not apply a trusted-network bypass.

## D09 — Temporary account lockout

- Lock an account for 15 minutes after ten failures across sources within 30 minutes.
- Automatically release the lock at expiry; a successful authentication resets the relevant failure sequence.
- Only a SYSTEM_ADMIN may release a lock early, after HR/ICT verification and with audit evidence.
- Record lock and unlock actions. Do not reveal the lock condition to an anonymous browser.

## D10 — Password recovery and temporary-credential reissue

- HR performs in-person identity proofing.
- A different authorized SYSTEM_ADMIN issues a new cryptographically random temporary password to the official email.
- The credential expires after 24 hours and requires immediate password replacement.
- Issuing a replacement invalidates the old credential and every Workspace and connected child-app session.
- Workspace never retrieves or resends an existing password.
- Privileged-account recovery additionally needs ICT Security approval.

This process is a W25 lifecycle implementation. Until W25 is delivered, support officers must not create an informal
reset/reissue path.

## D11 — Authentication security events and escalation

- Record every authentication attempt in security audit data.
- Alert the ICT Security distribution/on-call process for an account lock, credential recovery/reissue, privileged
  authentication failure/lock, ten locked accounts in 15 minutes, or 100 failures from one source in 15 minutes.
- Acknowledge alerts within 15 minutes during business hours or one hour after hours.
- D33 will define the SIEM export and retention period.

## Operating boundaries

Do not include passwords, TOTP codes, recovery codes, QR provisioning data or private keys in logs, alerts, tickets or
approval references. This policy does not approve a trusted-proxy topology, browser Content Security Policy, or a
production SIEM; those remain subject to D13, D14 and D33.
