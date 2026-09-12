import { z } from "zod";
import { OfficeType } from "@/lib/generated/prisma/enums";

export const setupEntitySchema = z.enum([
  "office",
  "department",
  "division",
  "unit",
  "position",
]);

export type SetupEntity = z.infer<typeof setupEntitySchema>;

export const referenceCodeSchema = z
  .string()
  .trim()
  .min(2, "Code must be at least 2 characters.")
  .max(64, "Code must not exceed 64 characters.")
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9_-]*$/,
    "Code may contain letters, numbers, underscores, and hyphens only."
  )
  .transform((value) => value.toUpperCase());

export const updateSetupRecordSchema = z
  .object({
    entity: setupEntitySchema,
    id: z.string().min(1, "Record ID is required."),
    displayName: z
      .string()
      .trim()
      .min(2, "Display name must be at least 2 characters.")
      .max(200, "Display name must not exceed 200 characters."),
    code: referenceCodeSchema,
    officeType: z.nativeEnum(OfficeType).optional(),
    officeId: z.string().trim().min(1).optional(),
    departmentId: z.string().trim().min(1).optional(),
    divisionId: z.string().trim().min(1).optional(),
    confirmHierarchyMove: z.literal("yes").optional(),
  })
  .superRefine((value, context) => {
    if (value.entity === "office" && !value.officeType) {
      context.addIssue({
        code: "custom",
        path: ["officeType"],
        message: "Office type is required.",
      });
    }
    const requiredParent: [string, string | undefined] | undefined =
      value.entity === "department"
        ? ["officeId", value.officeId]
        : value.entity === "division"
          ? ["departmentId", value.departmentId]
          : value.entity === "unit"
            ? ["divisionId", value.divisionId]
            : undefined;
    if (requiredParent && !requiredParent[1]) {
      context.addIssue({
        code: "custom",
        path: [requiredParent[0]],
        message: "Parent selection is required.",
      });
    }
  });
