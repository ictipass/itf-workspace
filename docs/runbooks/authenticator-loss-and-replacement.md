# Authenticator loss, replacement and recovery

Status: **D43 approved; W43 governed recovery implemented, staging acceptance pending**

Workspace stores an encrypted TOTP secret; the authenticator stores the matching secret. A new phone, SIM or app does
not recreate it. Staff identity, organization placement and app grants remain intact when an authenticator changes.
Never downgrade a sensitive role, edit MFA columns or rotate the deployment encryption key to bypass recovery.

## Prepare recovery before loss

1. Open **Authenticator Security** after enrolling TOTP.
2. Generate a recovery-code set after fresh TOTP verification.
3. Store the once-displayed codes outside the current phone in an ICT-approved password manager or sealed secure
   record. Do not store them in email, screenshots, chat or a support ticket.
4. Generating a new set invalidates every unused code in the old set. Each code can be used once.

## Replace a working authenticator

1. Keep the old authenticator available and open **Authenticator Security**.
2. Enter the current Workspace password and a fresh code from the old authenticator.
3. Scan the new QR code (or privately enter its setup key) in the new authenticator.
4. Enter a code from the new authenticator. Workspace does not replace the old secret until this succeeds.
5. Store the new recovery-code set. Replacement invalidates the old factor/codes, terminates every Workspace session
   and emits connected-child session revocations. Sign in again.
6. Confirm the official-email security notice and report an unrecognized replacement immediately.

## Recover with a saved code

1. Sign in with the normal password. At authenticator verification choose **Use a saved recovery code**.
2. Enter the current password and one unused recovery code. Invalid attempts are rate-limited and temporarily locked.
3. Successful recovery consumes the code, invalidates the old authenticator/codes and terminates every Workspace and
   connected-child session.
4. Sign in again. Workspace forces enrollment and verification of a new authenticator before dashboard access.
5. Store the newly displayed recovery-code set and confirm the official-email security notice.

## Assisted recovery after loss or no valid code

1. Report loss/theft immediately through the approved ICT/security channel. Do not send any secret.
2. An appointed HR Identity Verifier identifies the person **in person** against the authoritative HR staff record,
   opens **MFA Recovery**, records a non-secret HR reference and creates the request.
3. For ordinary `STAFF`, the request becomes executable without ICT Security approval. For `APP_ADMIN` or
   `SYSTEM_ADMIN`, a different appointed ICT Security Approver records approval.
4. A different authorized `SYSTEM_ADMIN` executes recovery. If the only administrator is locked out, the appointed
   ICT Recovery Operator executes it. The executor cannot be the user, HR verifier or ICT Security approver.
5. Workspace clears the factor and codes, terminates all sessions, emits child-app revocations, audits the actors and
   sends an official-email security notice. A notification failure is shown and audited; contact the user through an
   approved channel rather than repeating recovery.
6. The user signs in with the existing password and is forced to enroll a new authenticator. Assisted MFA recovery
   does not reset a forgotten password; that remains D10.

Requests expire after 24 hours. Restart identity verification after expiry. Approval/reference fields must identify
approved records but contain no personal authentication data.

## Authority setup and sole-administrator readiness

A fresh-TOTP `SYSTEM_ADMIN` uses **MFA Recovery** to appoint three different active TOTP-enrolled staff: HR Identity
Verifier, ICT Security Approver and ICT Recovery Operator. Authority cannot be self-assigned, and one user cannot hold
multiple active recovery-authority roles. Complete this setup and a staging rehearsal before production; otherwise the
sole-administrator procedure is not operational.

## Secondary authenticators and cloud backup

Independent secondary authenticators are permitted by D43 but are not yet implemented as separately revocable
Workspace factors. Copying the same TOTP secret to several devices is not independent enrollment. Cloud backup is
permitted only with an ICT-approved provider, organizational account and device-control profile. A restored copied
secret may still exist on a lost device, so loss or suspected compromise requires the replacement/recovery steps above.

The policy basis is the [D43 directive](../policies/2026-09-21-authenticator-lifecycle-recovery-directive.md). The
design is informed by [OWASP MFA lifecycle guidance](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
and [NIST authenticator lifecycle guidance](https://pages.nist.gov/800-63-4/sp800-63b.html); this does not assert formal
compliance certification.
