# Interim session and launch architecture directive

## Approval

- Approving authority: Super administrator
- Effective date: 2026-08-23
- Reference: Project architecture directive
- Status: Interim ITF policy for Workspace migration

## D01 - Identity authority during migration

- Workspace directly authenticates ITF staff during the migration period.
- HR supplies ICT with the authoritative staff spreadsheet; ICT imports and administers the resulting Workspace master
  list.
- Workspace is not currently an identity broker.
- Child applications must not receive or verify Workspace passwords.
- The implementation must retain immutable Workspace user identifiers and permit later migration to an approved
  standards-based identity provider.
- Non-staff identities are out of scope. Supporting them requires a separate approved identity and proofing decision.

## D02 - Idle-session policy

- Ordinary staff Workspace sessions expire after 20 minutes without qualifying activity.
- `APP_ADMIN` and `SYSTEM_ADMIN` Workspace sessions expire after 10 minutes without qualifying activity.
- Users receive a warning two minutes before idle expiry.
- Qualifying activity is a deliberate authenticated request to Workspace. Passive polling, background refresh, hidden
  windows and child-application activity do not extend the Workspace session.
- Expiry is enforced by the server. Client timers provide warning and navigation only.
- A child-app waffle may provide navigation but must not act as a hidden Workspace activity tracker.

## D03 - Absolute lifetime and reauthentication

- Every Workspace session expires three hours after authentication, regardless of activity or role.
- There is no trusted-device extension.
- The server requires full credential reauthentication and issues a new session before protected work resumes.
- Client UI may use a non-dismissible prompt, but the prompt is not the enforcement boundary.
- Work preservation must use drafts or autosave outside the expired session; an expired session is never kept valid to
  preserve unsaved work.
- Password change/reset, account recovery, administrator revocation and later-approved high-risk events also require
  reauthentication.

## D04 - Concurrent sessions and termination

- A user may hold at most two active Workspace sessions.
- Tabs sharing the same session cookie count as one session; another browser profile or device counts separately.
- There is no device-type restriction.
- After valid credentials are supplied at the limit, Workspace presents a restricted recovery screen without creating
  a third session. The user may terminate an existing session and continue sign-in.
- Users may inspect and terminate their own sessions. System administrators may inspect and terminate any user's
  sessions.
- Account deactivation, suspension, password reset/change and an explicit terminate-all operation revoke applicable
  active Workspace sessions.
- The initial inventory stores only identifiers and timestamps required for enforcement. Any expansion to IP address,
  detailed user-agent or location retention requires the applicable privacy/audit approval.

## D05 - Partial direction; remains open

- Default passwords derived from staff numbers are prohibited.
- Provisioning uses a unique cryptographically random, single-use temporary credential delivered to the staff member's
  official email and forces password replacement on first use.
- Email is not an MFA factor.
- TOTP is accepted as the interim MFA direction; WebAuthn/passkeys or hardware-backed authenticators are preferred for
  privileged access as capability permits.
- Required roles, protected actions and step-up validity are not yet approved. D05 remains Open.

## D06 - Launch assertion timing

- Redemption lifetime: 120 seconds.
- Permitted clock skew: 30 seconds.
- Assertions are audience-bound and atomically single-use.
- An expired assertion does not create a child-app session. The user returns to Workspace and deliberately launches the
  application again.

## D07 - Partial direction; remains open

- Production launch assertions will use asymmetric signing so child applications receive verification keys only.
- The private-key custody/storage platform, rotation frequency, verification-key overlap, emergency-rotation authority
  and child-app notification process remain unapproved. D07 remains Open and blocks W03.
