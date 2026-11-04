import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("keeps ICT Helpdesk available from the public Workspace landing page", async () => {
  const [page, support] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/support/ict-helpdesk.ts", import.meta.url), "utf8"),
  ]);

  assert.match(support, /https:\/\/ictdhelpdesk\.itf\.gov\.ng/);
  assert.match(page, /ICT_HELPDESK_URL/);
  assert.match(page, /Need ICT support\?/);
  assert.match(page, /target="_blank"/);
  assert.match(page, /rel="noopener noreferrer"/);
  assert.doesNotMatch(page, /ICT_HELPDESK_URL.*app registry/i);
});
