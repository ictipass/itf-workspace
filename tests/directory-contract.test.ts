import assert from "node:assert/strict";
import test from "node:test";
import { buildItfFlowDirectoryBatch } from "../lib/integrations/itf-flow-directory-contract";

test("builds a versioned and idempotency-addressed Flow directory batch", () => {
  const batch = buildItfFlowDirectoryBatch({
    requestId: "f1a83545-6687-4aec-8644-c38d4e7f2722",
    targetAppSlug: "itf-flow",
    batchIndex: 1,
    batchCount: 2,
    users: [],
  });
  assert.equal(batch.version, "itf-workspace-directory-v1");
  assert.equal(batch.requestId, "f1a83545-6687-4aec-8644-c38d4e7f2722");
  assert.deepEqual(batch.batch, { index: 1, count: 2 });
});
