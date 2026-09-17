export type AdminHelpEntry = {
  title: string;
  summary: string;
  steps: readonly string[];
  href?: string;
  linkLabel?: string;
  escalation?: string;
};

export type AdminHelpTopic = {
  id: string;
  title: string;
  description: string;
  entries: readonly AdminHelpEntry[];
};

export const ADMIN_HELP_TOPICS: readonly AdminHelpTopic[] = [
  {
    id: "authentication-sessions",
    title: "Authentication, MFA and sessions",
    description: "Login, authenticator verification, session expiry and concurrent-session recovery.",
    entries: [
      {
        title: "A privileged action requests fresh authenticator verification",
        summary:
          "Sensitive administrator changes require TOTP verified within the previous ten minutes.",
        steps: [
          "Complete the authenticator verification page opened by Workspace.",
          "Return to the administrator page and review the intended change.",
          "Submit the action again. Workspace does not automatically replay a sensitive or destructive action.",
        ],
      },
      {
        title: "A TOTP code is rejected",
        summary: "The common causes are device clock drift, a stale enrollment page or the wrong authenticator entry.",
        steps: [
          "Enable automatic date, time and time-zone settings on the authenticator device.",
          "Confirm the selected authenticator entry belongs to ITF Workspace.",
          "If enrollment is incomplete, restart it and scan the newly displayed QR code.",
          "Enter the current six-digit code without sharing or recording it.",
        ],
        escalation: "Escalate repeated failure without requesting the QR code, setup key or TOTP value.",
      },
      {
        title: "The concurrent-session limit is reached",
        summary: "Workspace currently allows at most two central sessions per user.",
        steps: [
          "Use the restricted recovery screen presented by Workspace.",
          "Identify and terminate an older session.",
          "Continue sign-in after a session slot becomes available.",
        ],
        href: "/dashboard/sessions",
        linkLabel: "Open My Sessions",
      },
      {
        title: "My authenticator phone was lost, stolen or replaced",
        summary: "The Workspace account and app grants remain, but a new authenticator installation does not recreate the enrolled TOTP secret.",
        steps: [
          "Report loss/theft immediately through the approved ICT/security channel; do not send a code, QR image or setup key.",
          "Have an available authorized administrator terminate affected Workspace sessions and review connected-app revocation delivery. If compromise is suspected, follow the approved account-containment process.",
          "Do not delete/re-import the staff account, downgrade sensitive roles, clear MFA fields in SQL or change the deployment MFA encryption key.",
          "Workspace currently has no recovery codes or supported authenticator reset/replacement screen. Escalate identity verification and recovery approval; email or a password alone must not bypass required MFA.",
          "Restoring an approved vendor backup may restore codes, but does not invalidate the lost device's secret. A compromised/lost authenticator needs a governed secret-replacement workflow, which is not yet implemented.",
        ],
        href: "/dashboard/admin/users",
        linkLabel: "Open User Directory for session containment",
        escalation: "D43 MFA recovery/replacement policy remains open. Loss of the only administrator's authenticator is an operational recovery blocker; no automatic break-glass bypass exists.",
      },
      {
        title: "Move to another phone or authenticator app while the old one still works",
        summary: "Use only an ITF-approved vendor migration method. Workspace does not yet offer TOTP rotation or re-enrollment for an enrolled account.",
        steps: [
          "Keep the old device/authenticator until migration is verified, and obtain ICT approval for the destination app and transfer/backup method.",
          "If the approved apps support secure transfer of the existing entry, follow that vendor's instructions privately. Do not export secrets through chat, email or support tickets.",
          "Enable automatic time on the new device and verify a fresh Workspace TOTP challenge with the migrated entry. Avoid repeated use of the same time-step code because Workspace rejects replay.",
          "After verifying the new entry, handle the old device and backup according to approved ICT procedures. Copying the entry preserves the same secret; it is not server-side revocation of the old authenticator.",
          "If transfer is unavailable, do not remove the only working entry. Request the governed replacement workflow under D43 before switching.",
        ],
        escalation: "Do not assume consumer cloud backup is approved. Authenticators that share a copied secret cannot be individually revoked by the current Workspace implementation.",
      },
    ],
  },
  {
    id: "organization-setup",
    title: "Organization setup",
    description: "Offices, departments, divisions, units, positions and controlled bulk setup.",
    entries: [
      {
        title: "Create organization references in the correct order",
        summary: "Child records require their active parent records before staff can be imported.",
        steps: [
          "Create offices first.",
          "Create departments under their offices.",
          "Create divisions under departments, then units under divisions.",
          "Create positions and download fresh Reference Codes before preparing a staff CSV.",
        ],
        href: "/dashboard/admin/setup",
        linkLabel: "Open Organization Setup",
      },
      {
        title: "Correct a wrong code, office type or hierarchy parent",
        summary: "Use Edit so immutable record IDs and existing relationships are preserved.",
        steps: [
          "Locate the record in its Organization Setup tab and select Edit.",
          "Correct the name, code, office type or immediate parent as applicable.",
          "For a hierarchy move, review the impact and explicitly confirm it.",
          "Save, then download fresh reference codes for future imports.",
        ],
        escalation: "Do not delete and recreate a referenced record or edit organization tables directly.",
      },
      {
        title: "Use the organization workbook safely",
        summary: "Large changes use the exact five-sheet XLSX or five named CSV files.",
        steps: [
          "Download a fresh template or current-data workbook.",
          "Run the mandatory dry run and correct every reported issue.",
          "Reselect the unchanged file before the validation receipt expires.",
          "Complete fresh TOTP and apply the file atomically.",
        ],
      },
    ],
  },
  {
    id: "staff-onboarding",
    title: "Staff onboarding",
    description: "HR spreadsheet preparation, validation, welcome delivery and first access.",
    entries: [
      {
        title: "Onboard ordinary staff",
        summary: "The HR import creates STAFF accounts only; privileged roles use a separate governed process.",
        steps: [
          "Confirm organization codes and required child-app roles already exist and are active/classified.",
          "Download fresh Reference Codes and the CSV Template.",
          "Prepare the HR file and run Validate only first.",
          "Correct every error, complete fresh TOTP and run the live import.",
          "Confirm welcome delivery, first password replacement and Workspace login.",
          "Synchronize entitled staff to ITF Flow before their first Flow launch.",
        ],
        href: "/dashboard/admin/users/import",
        linkLabel: "Open Bulk Import Users",
      },
      {
        title: "Add one HR-confirmed staff member without a spreadsheet",
        summary: "Add Staff uses the same ordinary-staff creation and first-password-change process, without granting app access.",
        steps: [
          "Open User Directory and choose Add Staff.",
          "Enter HR-confirmed official email, name, staff number and active organization references.",
          "Record the HR source reference and confirm the details come from the authoritative HR list.",
          "Complete fresh TOTP when requested and deliberately submit the reviewed form again.",
          "Confirm welcome delivery and password replacement; grant approved app access separately and synchronize Flow before launch.",
        ],
        href: "/dashboard/admin/users/new",
        linkLabel: "Open Add Staff",
        escalation: "If creation committed but email failed, do not add the user again. Escalate delivery/reissue under W25/D10.",
      },
      {
        title: "The welcome email did not arrive",
        summary: "A completed import cannot be repeated because the user now exists.",
        steps: [
          "Confirm the user and USER_CREATED audit event exist.",
          "Confirm the official email address through the approved HR/ICT channel.",
          "Record the time and redacted provider/runtime reference.",
          "Escalate under W25/D10; do not invent a credential or import the row again.",
        ],
        escalation:
          "Governed credential reissue and an operator-visible durable welcome-email retry workflow are not yet implemented.",
      },
    ],
  },
  {
    id: "application-registry",
    title: "Application registry and role classification",
    description: "Register apps, validate launch URLs and classify every assignable child role.",
    entries: [
      {
        title: "Register an application",
        summary: "A registry tile alone does not create a secure child-app integration.",
        steps: [
          "Obtain approved owners, environment, launch URL, audience, app assurance and role catalogue.",
          "Register the name, unique slug, curated icon and environment-specific launch values.",
          "Classify the application and every assignable child role as STANDARD or SENSITIVE.",
          "Test the URL and keep the app inactive until its integration acceptance is complete.",
        ],
        href: "/dashboard/admin/apps",
        linkLabel: "Open Manage Apps",
      },
      {
        title: "The catalogue says Role Classification Required",
        summary: "The entitlement role has no exact active assurance policy in the app registry.",
        steps: [
          "Confirm the exact role code on the user's App Access record.",
          "Obtain policy approval for that role's STANDARD or SENSITIVE classification.",
          "Add or update the exact role under Child-app role assurance.",
          "For ITF Flow, synchronize the directory before launching again.",
        ],
      },
    ],
  },
  {
    id: "application-access",
    title: "Application access and revocation",
    description: "Grant, find, change and remove child-app entitlements.",
    entries: [
      {
        title: "Grant or change access",
        summary: "Only active, explicitly classified app roles are assignable.",
        steps: [
          "Confirm the staff account, app and exact role are active.",
          "Use Grant App Access to select the staff member and app-role combination.",
          "Complete fresh TOTP when required.",
          "For a Flow role change, synchronize the directory before the next successful launch.",
        ],
        href: "/dashboard/admin/access",
        linkLabel: "Open App Access",
      },
      {
        title: "Revoke access safely",
        summary: "Flow revocation terminates all active Flow sessions for that entitlement.",
        steps: [
          "Filter by application and search for the staff member.",
          "Select Revoke on the active entitlement.",
          "If redirected for TOTP, verify, return, review and select Revoke again.",
          "Confirm the Workspace launch control is disabled and review the audit/event result.",
        ],
        escalation: "If a Flow session survives, treat it as a failed security event and escalate immediately.",
      },
    ],
  },
  {
    id: "flow-integration",
    title: "ITF Flow launch, navigation and sign-out",
    description: "Directory synchronization, Workspace launch, app switching and sign-out scope.",
    entries: [
      {
        title: "Flow rejects a Workspace launch",
        summary: "Common causes are unsynchronized identity, role mismatch or an invalid/expired assertion.",
        steps: [
          "Confirm the Workspace entitlement and exact active role policy.",
          "Run Synchronize entitled staff to ITF Flow.",
          "Start a new launch from My Apps instead of reusing a Flow launch URL.",
          "If it still fails, collect only the displayed support reference and find workspace_launch_failed with that reference in Flow runtime logs; never share the token URL.",
        ],
        href: "/dashboard/apps",
        linkLabel: "Open My Apps",
      },
      {
        title: "Synchronize entitled staff to ITF Flow",
        summary: "Workspace is authoritative, but Flow requires a matching active provisioned identity and exact role before launch. Grants and regrants do not synchronize automatically.",
        steps: [
          "Confirm the staff account, Flow app, entitlement and exact approved role policy are active/classified in Workspace.",
          "Review outstanding revocations before restoration. An old pending revocation can disable a restored Flow identity later.",
          "As SYSTEM_ADMIN, open Administration → Users → Bulk Import Users.",
          "Select Synchronize entitled staff to ITF Flow and review the total/batch and created/updated/inactive counts. It processes all active Flow entitlements, not just one selected user.",
          "Ask the user to launch freshly from My Apps. Confirm identity, role and organization placement; never reuse a token URL.",
          "Repeat after new Flow access, role changes or approved regrant/restoration. Do not synchronize to override an unapproved revocation.",
        ],
        href: "/dashboard/admin/users/import",
        linkLabel: "Open Flow directory synchronization",
        escalation: "Only the ITF Flow connector is implemented today. Registering another app does not provision its directory or add its synchronization capability.",
      },
      {
        title: "Run controlled staging duplicate-delivery and outage acceptance",
        summary: "A01-06/A01-07 deliberately revoke one pinned ordinary test user's Flow access; never use the administrator or production.",
        steps: [
          "Obtain the staging maintenance reference and configure matching temporary flags, test-user ID and expiry in Workspace and Flow.",
          "Launch Flow for the dedicated user and ensure OFFICER = STANDARD, the staging registry and intended endpoints are correct.",
          "Open Staging integration acceptance, complete fresh TOTP and explicitly confirm test-access revocation.",
          "For duplicates, confirm first duplicate=false, second duplicate=true and one durable Flow event. For outage, confirm RETRY, then check/retry only the recorded event after its due time.",
          "Record browser observations/evidence; after accepted delivery, regrant OFFICER, synchronize, confirm launch and disable diagnostic flags.",
        ],
        href: "/dashboard/admin/integrations/acceptance",
        linkLabel: "Open Staging integration acceptance",
        escalation: "A pending/dead-letter or uncertain result is not a pass. Do not edit rows or regrant before event delivery is resolved. A finite manual retry does not establish continuous scheduling.",
      },
      {
        title: "Choose the correct sign-out action",
        summary: "Flow-only and global Workspace sign-out intentionally have different effects.",
        steps: [
          "Use Flow's main sign-out to end only Flow and return to the Workspace catalogue.",
          "Use the app waffle to move to another eligible app without signing out.",
          "Use Sign out of Workspace and all apps when leaving the current device.",
          "Confirm the global action when Workspace displays its warning page.",
        ],
      },
    ],
  },
  {
    id: "deployment-runtime",
    title: "Deployment and runtime incidents",
    description: "Vercel readiness, configuration failures and safe diagnostic evidence.",
    entries: [
      {
        title: "Vercel says Ready but the page returns HTTP 500",
        summary: "A successful build does not prove runtime configuration or database reachability.",
        steps: [
          "Open the failed deployment's runtime logs and record the timestamp and request ID.",
          "Run the configuration check for the exact deployment environment.",
          "Verify complete HTTPS URLs, environment scoping and database reachability.",
          "Correct the setting and redeploy; never weaken production validation to expose the page.",
        ],
      },
      {
        title: "Collect a safe escalation record",
        summary: "Support evidence must help diagnosis without disclosing credentials or personal data.",
        steps: [
          "Record environment, public route, WAT/UTC time and deployed commit.",
          "Record the exact sanitized message, expected result and last successful action.",
          "Include a correlation/request ID or redacted log reference when available.",
          "Never include passwords, TOTP data, QR codes, API/private keys, database URLs or launch-token URLs.",
        ],
      },
    ],
  },
];
