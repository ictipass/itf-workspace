import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  buildWorkspaceAppNavigationResponse,
  WORKSPACE_APP_NAVIGATION_VERSION,
} from "../lib/integrations/app-navigation-contract";

const request = {
  version: WORKSPACE_APP_NAVIGATION_VERSION,
  requestId: "caa55fef-730c-46c6-8fe6-57db80cf63c2",
  sourceAppSlug: "itf-flow",
  workspaceUserId: "workspace-user-1",
  workspaceSessionId: "workspace-session-1",
};

describe("entitled application navigation contract", () => {
  test("returns only other apps with an active matching role policy", () => {
    const response = buildWorkspaceAppNavigationResponse({
      request,
      workspaceOrigin: "https://workspace.example.test",
      generatedAt: new Date("2026-09-06T00:00:00.000Z"),
      accesses: [
        {
          appRole: "SYSTEM_ADMIN",
          app: {
            id: "flow-id",
            name: "ITF Flow",
            slug: "itf-flow",
            icon: "workflow",
            category: "WORKFLOW",
            rolePolicies: [{ roleCode: "SYSTEM_ADMIN", isActive: true }],
          },
        },
        {
          appRole: "OFFICER",
          app: {
            id: "reimbursement-id",
            name: "Reimbursement",
            slug: "itf-reimbursement",
            icon: "wallet-cards",
            category: "FINANCE",
            rolePolicies: [{ roleCode: "OFFICER", isActive: true }],
          },
        },
        {
          appRole: "USER",
          app: {
            id: "unclassified-id",
            name: "Unclassified",
            slug: "unclassified",
            icon: "file-text",
            category: "OTHER",
            rolePolicies: [{ roleCode: "OTHER", isActive: true }],
          },
        },
      ],
    });

    assert.deepEqual(response, {
      version: WORKSPACE_APP_NAVIGATION_VERSION,
      requestId: request.requestId,
      generatedAt: "2026-09-06T00:00:00.000Z",
      apps: [
        {
          id: "reimbursement-id",
          name: "Reimbursement",
          slug: "itf-reimbursement",
          icon: "wallet-cards",
          category: "FINANCE",
          launchUrl:
            "https://workspace.example.test/dashboard/apps/reimbursement-id/launch",
        },
      ],
    });
  });

  test("falls back from an unknown stored icon without exposing markup", () => {
    const response = buildWorkspaceAppNavigationResponse({
      request,
      workspaceOrigin: "https://workspace.example.test",
      accesses: [
        {
          appRole: "USER",
          app: {
            id: "app-id",
            name: "Another app",
            slug: "another-app",
            icon: "<svg onload=alert(1)>",
            category: "OTHER",
            rolePolicies: [{ roleCode: "USER", isActive: true }],
          },
        },
      ],
    });
    assert.equal(response.apps[0]?.icon, "app-window");
  });
});
