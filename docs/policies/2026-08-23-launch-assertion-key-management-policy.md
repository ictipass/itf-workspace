# Launch assertion signing-key management policy

## Approval and purpose

- Policy decision: D07
- Approving authority: Super administrator
- Effective date: 2026-08-23
- Reference: Project architecture directive follow-up
- Status: Approved interim policy for Workspace launch v2

This document is the operational reminder and launch checklist for Workspace signing keys. It contains no private
key, credential, provider account or other secret. Production launch is prohibited when a required item below is not
satisfied and evidenced.

## Approved cryptographic profile

- Workspace launch assertions use `RS256` with a 3072-bit RSA key.
- Verifiers allowlist `RS256`; they never select an algorithm solely from an untrusted token header and reject `none`
  or any other algorithm.
- Every assertion has an explicit launch-token type, immutable issuer, child-specific audience, unique `jti`, unique
  signing-key `kid`, issued-at time and expiry.
- The approved D06 timing remains 120 seconds with no more than 30 seconds of clock skew, audience binding and atomic
  one-time redemption.
- Launch signing keys are dedicated to that purpose. Session, email, encryption and other token uses have separate
  keys and validation rules.
- Development, staging and production use separate issuers and key pairs. A key is never copied between environments.

## Custody and authority

- ICT Security owns signing-key policy and authorizes normal rotation.
- Infrastructure Operations administers the approved custody platform and access controls.
- The Workspace production service identity receives only the permission needed to request signatures.
- System administrators may initiate an approved workflow but cannot retrieve or export private-key material.
- Child applications receive public verification keys only.
- Production private keys are non-exportable and held by a managed KMS/HSM or an approved Vault Transit/on-premises
  HSM implementation.
- Private keys are prohibited from source control, application databases, logs, support tickets and production
  environment variables.

W03 uses a vendor-neutral signer interface because the final hosting platform is not yet selected. Development and
test may use independently generated software keys kept in their environment's approved secret store. This exception
does not permit production use. Selecting and validating the production KMS/HSM provider is a production deployment
gate.

## Normal rotation

Normal rotation occurs every 90 days:

1. Infrastructure Operations generates the replacement key inside the approved custody platform.
2. The replacement receives a unique, non-reused `kid` and is recorded in the key inventory without private material.
3. Workspace publishes the new public JWK at least 24 hours before activation.
4. Automated connector notification and an operational ICT notice identify the activation time and affected issuer.
5. Contract and staging tests confirm that every child app accepts the new key and still validates the current key.
6. At activation, Workspace signs only with the new key.
7. The previous public key remains available for verification for 24 hours; the previous private key is not used for
   new signatures.
8. After overlap and verification, the previous public key is removed from the active JWKS and the rotation record is
   closed.

## Emergency rotation

The ICT Security lead or designated incident commander may order immediate rotation when compromise is confirmed or
reasonably suspected. A second authorized reviewer and incident record are required within 24 hours.

Emergency handling does not use the normal overlap:

1. Disable signing with the affected key immediately.
2. Add its `kid` to the revoked-key list and require child apps to reject it even when cached.
3. Generate and activate a replacement key in the custody platform.
4. Publish the replacement public key and send an immediate connector/security notification.
5. Reject outstanding assertions signed by the affected key and reconcile their one-time redemption records.
6. Verify all integrated child apps, investigate exposure, preserve audit evidence and document closure.

## JWKS and child-app behavior

- Workspace exposes public keys through a versioned HTTPS JWKS endpoint.
- Normal JWKS caching is limited to five minutes.
- When a child app receives an otherwise well-formed token with an unknown `kid`, it performs one immediate JWKS
  refresh and then fails closed if the key remains unknown.
- A known revoked `kid` is rejected without fallback.
- Child apps validate signature, fixed algorithm, token type, issuer, their exact audience, expiry, clock skew,
  one-time `jti`, current entitlement and the D05 assurance requirement.
- Public-key distribution never grants a child app authority to mint Workspace assertions.

## Audit and monitoring

Workspace and the custody platform record key generation, publication, activation, signing failures, scheduled
rotation, emergency revocation, JWKS changes and administrative approvals. Logs contain key identifiers and outcomes,
not private material. Alert routing and retention remain subject to D11 and G05.

## Production launch reminder

Before enabling a production issuer, the release owner must confirm and attach evidence for every item:

- [ ] Production KMS/HSM or approved Vault/HSM platform selected and security-approved.
- [ ] Non-exportability verified; no production private key exists in `.env`, database or repository.
- [ ] ICT Security owner, Infrastructure custodian and emergency delegates are named.
- [ ] Workspace production service identity has sign-only least privilege.
- [ ] Production issuer, audience registry and token type are approved and environment-specific.
- [ ] Active `kid`, next-rotation date and key inventory entry are recorded.
- [ ] HTTPS JWKS endpoint, five-minute caching, unknown-key refresh and revoked-key rejection are tested.
- [ ] New-key prepublication and 24-hour normal overlap are tested.
- [ ] Emergency no-overlap rotation is rehearsed in a production-like environment.
- [ ] ITF Flow and every onboarded child app pass signature, wrong-algorithm, wrong-issuer, wrong-audience, expiry,
  replay, unknown-key and revoked-key contract tests.
- [ ] D05 assurance claims and sensitive app/role rejection tests pass.
- [ ] Development, staging and production credentials and keys are demonstrably separate.
- [ ] Audit, alerting, incident response and rollback evidence are attached to production change approval.

The production release owner, ICT Security owner and Infrastructure custodian sign the completed checklist. Approval
of this policy does not mark the checklist complete and does not authorize production rollout by itself.
