import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { WorkspaceRole } from "../lib/generated/prisma/client";
import { resolveWorkspaceSessionPolicy } from "../lib/config/workspace-environment";
import {
  classifyWorkspaceSession,
  createSessionTiming,
  nextIdleExpiry,
} from "../lib/auth/session-policy";

describe("approved Workspace session policy", () => {
  test("uses the approved configurable defaults", () => {
    assert.deepEqual(resolveWorkspaceSessionPolicy({}), {
      staffIdleSeconds: 1200,
      privilegedIdleSeconds: 600,
      warningSeconds: 120,
      absoluteSeconds: 10800,
      maxConcurrentSessions: 2,
      recoveryGrantSeconds: 300,
    });
  });

  test("accepts valid deployment overrides", () => {
    const policy = resolveWorkspaceSessionPolicy({
      WORKSPACE_STAFF_IDLE_TIMEOUT_SECONDS: "1800",
      WORKSPACE_PRIVILEGED_IDLE_TIMEOUT_SECONDS: "900",
      WORKSPACE_SESSION_WARNING_SECONDS: "180",
      WORKSPACE_ABSOLUTE_TIMEOUT_SECONDS: "14400",
      WORKSPACE_MAX_CONCURRENT_SESSIONS: "3",
      WORKSPACE_SESSION_RECOVERY_TTL_SECONDS: "420",
    });
    assert.equal(policy.staffIdleSeconds, 1800);
    assert.equal(policy.maxConcurrentSessions, 3);
    assert.equal(policy.recoveryGrantSeconds, 420);
  });

  test("rejects unsafe warning and absolute timeout relationships", () => {
    assert.throws(
      () => resolveWorkspaceSessionPolicy({ WORKSPACE_SESSION_WARNING_SECONDS: "600" }),
      /must be shorter than both idle timeouts/
    );
    assert.throws(
      () => resolveWorkspaceSessionPolicy({
        WORKSPACE_STAFF_IDLE_TIMEOUT_SECONDS: "3600",
        WORKSPACE_ABSOLUTE_TIMEOUT_SECONDS: "1800",
      }),
      /must be longer than both idle timeouts/
    );
  });

  test("creates 20-minute staff and 10-minute privileged idle windows", () => {
    const original = { ...process.env };
    delete process.env.WORKSPACE_STAFF_IDLE_TIMEOUT_SECONDS;
    delete process.env.WORKSPACE_PRIVILEGED_IDLE_TIMEOUT_SECONDS;
    delete process.env.WORKSPACE_ABSOLUTE_TIMEOUT_SECONDS;
    try {
      const now = new Date("2026-08-23T09:00:00.000Z");
      const staff = createSessionTiming(WorkspaceRole.STAFF, now);
      const administrator = createSessionTiming(WorkspaceRole.SYSTEM_ADMIN, now);
      assert.equal(staff.idleExpiresAt.toISOString(), "2026-08-23T09:20:00.000Z");
      assert.equal(administrator.idleExpiresAt.toISOString(), "2026-08-23T09:10:00.000Z");
      assert.equal(staff.absoluteExpiresAt.toISOString(), "2026-08-23T12:00:00.000Z");
    } finally {
      process.env = original;
    }
  });

  test("fails closed at the exact idle and absolute boundaries", () => {
    const now = new Date("2026-08-23T09:20:00.000Z");
    assert.equal(classifyWorkspaceSession({
      idleExpiresAt: now,
      absoluteExpiresAt: new Date("2026-08-23T12:00:00.000Z"),
    }, now), "IDLE_EXPIRED");
    assert.equal(classifyWorkspaceSession({
      idleExpiresAt: new Date("2026-08-23T13:00:00.000Z"),
      absoluteExpiresAt: now,
    }, now), "ABSOLUTE_EXPIRED");
  });

  test("revocation takes precedence over time-based state", () => {
    assert.equal(classifyWorkspaceSession({
      revokedAt: new Date("2026-08-23T09:05:00.000Z"),
      idleExpiresAt: new Date("2026-08-23T09:20:00.000Z"),
      absoluteExpiresAt: new Date("2026-08-23T12:00:00.000Z"),
    }, new Date("2026-08-23T09:06:00.000Z")), "REVOKED");
  });

  test("activity never extends a session beyond its absolute limit", () => {
    const original = { ...process.env };
    delete process.env.WORKSPACE_STAFF_IDLE_TIMEOUT_SECONDS;
    try {
      const absolute = new Date("2026-08-23T12:00:00.000Z");
      assert.equal(
        nextIdleExpiry(WorkspaceRole.STAFF, absolute, new Date("2026-08-23T11:55:00.000Z")).toISOString(),
        absolute.toISOString()
      );
    } finally {
      process.env = original;
    }
  });
});
