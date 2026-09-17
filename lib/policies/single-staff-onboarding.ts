import { z } from "zod";

// Workspace/app privilege fields are deliberately excluded from the manual entry contract.
export const singleStaffSchema = z.object({
  staffNumber: z.string().trim().min(1).max(100),
  fullName: z.string().trim().min(1).max(300),
  email: z.email().max(320).transform((value) => value.toLowerCase()),
  officeCode: z.string().trim().min(1).max(100),
  departmentCode: z.string().trim().max(100),
  divisionCode: z.string().trim().max(100),
  unitCode: z.string().trim().max(100),
  positionCode: z.string().trim().max(100),
  supervisorStaffNumber: z.string().trim().max(100),
  sourceReference: z.string().trim().min(1).max(300),
  hrConfirmed: z.literal("on"),
}).strict();
