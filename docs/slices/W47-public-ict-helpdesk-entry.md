# W47 — Public ICT Helpdesk entry

## Outcome

Staff can reach ITF ICT Helpdesk even when they cannot authenticate to Workspace. The Helpdesk is intentionally outside
the Workspace application registry and entitlement model.

## What changed

- Added a central, HTTPS-only Helpdesk URL constant for `https://ictdhelpdesk.itf.gov.ng`.
- Added an **ICT support** link in the landing-page header on wider screens.
- Added a prominent **Need ICT support?** panel in the public landing-page content for every screen size.
- Both links open a separate tab with `noopener noreferrer`, retaining the Workspace page and preventing the external
  site from obtaining an opener reference.

## Operational use case

Use the public Helpdesk entry for sign-in, MFA-enrollment and general ICT-support problems. It must remain outside the
app registry so users can lodge an issue before they have a Workspace session or any application entitlement.

## Verification and deployment

- Regression test verifies the exact HTTPS destination, public landing-page call to action and safe external-link
  attributes.
- No migration, seed or environment-variable change is required.
- After deployment, test the landing page while signed out, on a phone and desktop browser, and confirm the Helpdesk
  opens in a new tab at the approved host.
