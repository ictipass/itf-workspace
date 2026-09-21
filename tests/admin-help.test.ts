import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readFile } from "node:fs/promises";
import { ADMIN_HELP_TOPICS } from "../lib/support/admin-help-topics";

describe("in-product administrator support centre", () => {
  test("uses unique categories with actionable entries", () => {
    assert.ok(ADMIN_HELP_TOPICS.length >= 6);
    assert.equal(new Set(ADMIN_HELP_TOPICS.map((topic) => topic.id)).size, ADMIN_HELP_TOPICS.length);

    for (const topic of ADMIN_HELP_TOPICS) {
      assert.ok(topic.title.length > 0);
      assert.ok(topic.description.length > 0);
      assert.ok(topic.entries.length > 0);
      for (const entry of topic.entries) {
        assert.ok(entry.title.length > 0);
        assert.ok(entry.summary.length > 0);
        assert.ok(entry.steps.length > 1);
        if (entry.href) assert.match(entry.href, /^\/dashboard(?:\/|$)/);
      }
    }
  });

  test("covers the current administrator support domains", () => {
    const ids = new Set(ADMIN_HELP_TOPICS.map((topic) => topic.id));
    for (const required of [
      "authentication-sessions",
      "organization-setup",
      "staff-onboarding",
      "application-registry",
      "application-access",
      "flow-integration",
      "deployment-runtime",
    ]) {
      assert.equal(ids.has(required), true, required);
    }
  });
  test("documents governed factor recovery and exact Flow synchronization steps", () => {
    const entries = ADMIN_HELP_TOPICS.flatMap((topic) => topic.entries);
    const loss = entries.find((entry) => entry.title.includes("phone was lost"));
    const sync = entries.find((entry) => entry.title === "Synchronize entitled staff to ITF Flow");
    assert.ok(loss);
    assert.match(loss.steps.join(" "), /HR Identity Verifier/);
    assert.equal(loss.href, "/dashboard/admin/mfa-recovery");
    assert.match(loss.escalation ?? "", /independent authority/);
    assert.ok(sync);
    assert.equal(sync.href, "/dashboard/admin/users/import");
    assert.match(sync.steps.join(" "), /all active Flow entitlements/);
    assert.match(sync.escalation ?? "", /Only the ITF Flow connector/);
  });

  test("protects the page and renders topics as expandable accordions", async () => {
    const page = await readFile(
      new URL("../app/dashboard/admin/help/page.tsx", import.meta.url),
      "utf8",
    );

    assert.match(page, /WorkspaceRole\.SYSTEM_ADMIN/);
    assert.match(page, /redirect\("\/dashboard"\)/);
    assert.match(page, /<Accordion type="multiple"/);
    assert.match(page, /ADMIN_HELP_TOPICS\.map/);
  });
});
