import { z } from "zod";

// Workspace roles and child-app roles intentionally do not appear here. They have
// separate approval and entitlement workflows and must not be changed as a side
// effect of correcting HR-owned organizational data.
export const userOrganizationUpdateSchema = z
  .object({
    userId: z.string().min(1),
    expectedOfficeId: z.string(),
    expectedDepartmentId: z.string(),
    expectedDivisionId: z.string(),
    expectedUnitId: z.string(),
    expectedPositionId: z.string(),
    expectedSupervisorId: z.string(),
    officeId: z.string().min(1),
    departmentId: z.string(),
    divisionId: z.string(),
    unitId: z.string(),
    positionId: z.string(),
    supervisorStaffNumber: z.string().trim().max(100),
    sourceReference: z.string().trim().min(3).max(200),
    reason: z.string().trim().min(10).max(500),
  })
  .strict();
