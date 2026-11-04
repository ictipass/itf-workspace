import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readFile } from "node:fs/promises";

async function source(relativePath: string) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

describe("application administration usability", () => {
  test("stacks registry and access forms above their full-width tables", async () => {
    const [appsPage, accessPage] = await Promise.all([
      source("app/dashboard/admin/apps/page.tsx"),
      source("app/dashboard/admin/access/page.tsx"),
    ]);

    for (const page of [appsPage, accessPage]) {
      assert.match(page, /<div className="space-y-6">/);
      assert.doesNotMatch(page, /xl:grid-cols-\[420px_1fr\]/);
      assert.match(page, /className="overflow-x-auto"/);
    }
  });

  test("filters access by app and user before bounded pagination", async () => {
    const accessPage = await source("app/dashboard/admin/access/page.tsx");

    assert.match(accessPage, /name="app"/);
    assert.match(accessPage, /name="q"/);
    assert.match(accessPage, /appId: selectedAppId/);
    assert.match(accessPage, /fullName: \{ contains: query/);
    assert.match(accessPage, /email: \{ contains: query/);
    assert.match(accessPage, /staffNumber: \{ contains: query/);
    assert.match(accessPage, /const PAGE_SIZE = 25/);
    assert.match(accessPage, /skip: \(page - 1\) \* PAGE_SIZE/);
    assert.match(accessPage, /take: PAGE_SIZE/);
  });

  test("redirects an expired app-role mutation through fresh TOTP", async () => {
    const [currentUser, appActions, accessActions, editPage, accessPage] = await Promise.all([
      source("lib/auth/current-user.ts"),
      source("app/dashboard/admin/apps/actions.ts"),
      source("app/dashboard/admin/access/actions.ts"),
      source("app/dashboard/admin/apps/[id]/edit/page.tsx"),
      source("app/dashboard/admin/access/page.tsx"),
    ]);

    assert.match(currentUser, /requireFreshMfaContextOrRedirect/);
    assert.match(currentUser, /FRESH_MFA_REQUIRED/);
    assert.match(currentUser, /redirect\(`\/mfa\/verify\?returnTo=/);
    assert.match(appActions, /requireFreshMfaContextOrRedirect\(returnTo\)/);
    assert.match(editPage, /Authenticator verification is fresh/);
    assert.match(accessActions, /requireFreshMfaContextOrRedirect\(returnTo\)/);
    assert.match(accessPage, /select Revoke again/);
  });

  test("provides a mobile dashboard navigation trigger instead of hiding all signed-in navigation", async () => {
    const [layout, mobileNavigation] = await Promise.all([
      source("app/dashboard/layout.tsx"),
      source("components/dashboard-mobile-navigation.tsx"),
    ]);

    assert.match(layout, /DashboardMobileNavigation/);
    assert.match(mobileNavigation, /aria-label="Open navigation menu"/);
    assert.match(mobileNavigation, /SheetContent side="left"/);
    assert.match(mobileNavigation, /className="lg:hidden"/);
    assert.match(mobileNavigation, /signOutWorkspaceAndAppsAction/);
  });

  test("keeps compact user actions and guards organizational corrections", async () => {
    const [usersPage, actionsMenu, organizationAction, organizationPolicy, organizationPage] = await Promise.all([
      source("app/dashboard/admin/users/page.tsx"),
      source("app/dashboard/admin/users/user-actions-menu.tsx"),
      source("app/dashboard/admin/users/[id]/organization/actions.ts"),
      source("lib/policies/user-organization-update.ts"),
      source("app/dashboard/admin/users/[id]/organization/page.tsx"),
    ]);

    assert.match(usersPage, /UserActionsMenu/);
    assert.match(actionsMenu, /EllipsisVertical/);
    assert.match(actionsMenu, /Edit organisation/);
    assert.match(actionsMenu, /Manage sessions/);
    assert.match(organizationAction, /requireFreshMfaContextOrRedirect/);
    assert.match(organizationAction, /reportingLineCreatesCycle/);
    assert.match(organizationAction, /ORGANIZATION_DETAILS_CORRECTED/);
    assert.match(organizationPolicy, /Workspace roles and child-app roles intentionally do not appear here/);
    assert.match(organizationPage, /Correct app role in App Access/);
  });
});
