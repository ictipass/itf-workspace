import { z } from "zod";

export const reportingLineChangeSchema = z.object({
  userId: z.string().min(1),
  expectedSupervisorId: z.string().min(1),
  supervisorStaffNumber: z.string().trim().max(100),
  sourceReference: z.string().trim().min(3).max(200),
  reason: z.string().trim().min(10).max(500),
});

export function reportingLineCreatesCycle(input: {
  targetUserId: string;
  proposedSupervisorId: string | null;
  supervisorByUserId: ReadonlyMap<string, string | null>;
}) {
  if (!input.proposedSupervisorId) return false;
  const visited = new Set<string>();
  let cursor: string | null = input.proposedSupervisorId;
  while (cursor) {
    if (cursor === input.targetUserId || visited.has(cursor)) return true;
    visited.add(cursor);
    cursor = input.supervisorByUserId.get(cursor) ?? null;
  }
  return false;
}
