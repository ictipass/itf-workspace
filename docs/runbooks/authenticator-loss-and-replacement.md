# Authenticator loss and replacement

Status: **Support guidance for current behavior; recovery/rotation implementation gated by D43**

## What changes when the phone/app changes?

Workspace stores an encrypted TOTP secret for the staff account. The authenticator holds the matching secret and
generates codes locally. Installing a new app or changing phone number/SIM does not register that secret automatically.
The staff identity, password, organization assignments and app entitlements are not deleted by loss of a phone.

Required MFA is still enforced: Workspace administrators and sensitive-app/role access need TOTP. Standard ordinary
access remains governed by D05; loss is not permission to downgrade a sensitive role. An existing signed-in session is
not permanent recovery and must not be used as a loophole. Password changes do not replace the TOTP secret.

## Current implementation limits

- No Workspace recovery codes, extra independently bound authenticators or approved break-glass UI.
- No self-service TOTP replacement, server-side rotation or administrator MFA-reset workflow.
- `/mfa/enroll` does not overwrite an already enrolled factor; it redirects to verification.
- Email is notification/recovery communication, not an approved MFA factor or sufficient identity proof by itself.
- Copying/restoring the same authenticator entry copies the same secret; it cannot revoke the old device separately.

These are operational gaps, especially if the only administrator loses the authenticator. Support must escalate rather
than pretend there is a reset button or issue an undocumented SQL bypass. D43 must be approved before implementation.

## Lost/stolen/unavailable phone

1. Report the incident to the approved ICT/security channel. State whether loss/theft/compromise is suspected, but do
   not provide a QR code, setup secret, six-digit code, password or launch URL.
2. An available authorized administrator opens **Users → Sessions** for the affected account, terminates affected
   Workspace sessions and reviews central-to-child event delivery. Suspected compromise follows the approved existing
   containment workflow, including account deactivation when authorized; session termination alone does not invalidate
   the lost TOTP secret. On an enabled integration, delivery must be verified, not assumed from the click.
3. Confirm identity and request recovery approval through ICT/security. The exact proofing evidence, reset approvers,
   sole-admin exception, factor backup permissions and expiry are unresolved D43 decisions—not invented requirements.
4. There is currently no supported Workspace reset operation. If an approved vendor backup can restore the entry, ICT
   must assess it; restored codes do not prove that the old/lost copy is safe or invalidated.
5. Where loss/compromise calls for a new secret, retain the incident/escalation until a governed replacement is approved
   and implemented. Do not clear MFA columns, delete/re-import the staff record, downgrade classifications, regenerate
   `WORKSPACE_MFA_ENCRYPTION_KEY_BASE64` or email old/new secrets as an emergency workaround.

## Planned change while the old authenticator still works

1. Keep the working entry/device. Obtain ICT approval for the new app and permitted migration/backup method.
2. If that approved vendor combination supports secure entry transfer, follow its official procedure privately. This
   is authenticator-side transfer, not a Workspace replacement feature. Do not assume cloud synchronization is approved.
3. Enable automatic time and verify a new Workspace TOTP challenge using the migrated entry. Workspace rejects reuse
   of an accepted code/time step; wait for a fresh code before a subsequent challenge.
4. Retire the old device/entry and protect/remove export material under approved procedures only after verification.
   Transfer retained the same secret. Removing an entry locally is not revocation of an untrusted/retained old copy.
5. If transfer is unsupported or a fresh secret is needed, do not delete the only working factor; request governed
   server-side replacement under D43, which is not yet implemented.

## Recommended future controls — not approved policy

An implementation should distinguish a voluntary change authorized with password plus recent current TOTP from lost
factor recovery requiring approved independent identity verification. It should bind/verify a new secret before
replacement, invalidate the old secret and sessions/step-up, revoke connected app sessions, notify the official address,
audit approvals and prohibit self-approval of privileged recovery. ITF must decide approvers/proofing, recovery codes or
secondary factors, vendor/cloud backup rules, and a separately controlled sole-admin recovery procedure.

These recommendations reflect [OWASP MFA lifecycle guidance](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
and [NIST authenticator lifecycle management](https://pages.nist.gov/800-63-4/sp800-63b.html). They do not claim NIST
assurance compliance or override ITF's approved policy. Support escalation must omit authentication secrets.
