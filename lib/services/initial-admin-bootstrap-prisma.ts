import {
  AuditAction,
  UserStatus,
  WorkspaceRole,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  decideInitialAdministratorPreparation,
  InitialAdministratorBootstrapError,
  InitialAdministratorIdentity,
  InitialAdministratorBootstrapTransactionTiming,
} from "@/lib/policies/initial-admin-bootstrap";

async function acquireBootstrapLock(
  transaction: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
) {
  // A transaction-scoped PostgreSQL advisory lock serializes concurrent bootstrap attempts.
  // Cast PostgreSQL's void return to text because Prisma cannot deserialize void columns.
  await transaction.$queryRaw<Array<{ lockResult: string }>>`
    SELECT pg_advisory_xact_lock(495446, 1)::text AS "lockResult"
  `;
}

export async function preparePendingInitialAdministrator(
  identity: InitialAdministratorIdentity,
  passwordHash: string,
  transactionTiming: InitialAdministratorBootstrapTransactionTiming
) {
  return prisma.$transaction(
    async (transaction) => {
      await acquireBootstrapLock(transaction);

      const existingAdministrators = await transaction.user.findMany({
        where: { workspaceRole: WorkspaceRole.SYSTEM_ADMIN },
        select: {
          id: true,
          email: true,
          fullName: true,
          staffNumber: true,
          status: true,
          isTemporaryPassword: true,
        },
        take: 2,
      });
      const conflictingUser = await transaction.user.findFirst({
        where: {
          OR: [
            { email: { equals: identity.email, mode: "insensitive" } },
            { staffNumber: identity.staffNumber },
          ],
        },
        select: { id: true },
      });

      const decision = decideInitialAdministratorPreparation({
        identity,
        existingAdministrators: existingAdministrators.map((administrator) => ({
          ...administrator,
          staffNumber: administrator.staffNumber ?? "",
        })),
        conflictingUserExists: Boolean(conflictingUser),
      });

      if (decision.action === "RESUME") {
        await transaction.user.update({
          where: { id: decision.userId },
          data: { passwordHash },
        });
        await transaction.auditLog.create({
          data: {
            action: AuditAction.USER_UPDATED,
            metadata: {
              mode: "INITIAL_ADMIN_BOOTSTRAP_RETRY",
              userId: decision.userId,
              credentialReplaced: true,
            },
          },
        });
        return { userId: decision.userId, resumed: true };
      }

      const administrator = await transaction.user.create({
        data: {
          email: identity.email,
          fullName: identity.fullName,
          staffNumber: identity.staffNumber,
          workspaceRole: WorkspaceRole.SYSTEM_ADMIN,
          status: UserStatus.INACTIVE,
          isTemporaryPassword: true,
          passwordHash,
        },
      });
      await transaction.auditLog.create({
        data: {
          action: AuditAction.USER_CREATED,
          metadata: {
            mode: "INITIAL_ADMIN_BOOTSTRAP_PENDING_EMAIL",
            userId: administrator.id,
            email: administrator.email,
            staffNumber: administrator.staffNumber,
          },
        },
      });

      return { userId: administrator.id, resumed: false };
    },
    transactionTiming
  );
}

export async function activatePendingInitialAdministrator(
  userId: string,
  transactionTiming: InitialAdministratorBootstrapTransactionTiming
) {
  await prisma.$transaction(
    async (transaction) => {
      await acquireBootstrapLock(transaction);

      const administrator = await transaction.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          workspaceRole: true,
          status: true,
          isTemporaryPassword: true,
        },
      });
      const anotherAdministrator = await transaction.user.findFirst({
        where: {
          workspaceRole: WorkspaceRole.SYSTEM_ADMIN,
          id: { not: userId },
        },
        select: { id: true },
      });

      if (
        !administrator ||
        administrator.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN ||
        administrator.status !== UserStatus.INACTIVE ||
        !administrator.isTemporaryPassword ||
        anotherAdministrator
      ) {
        throw new InitialAdministratorBootstrapError(
          "Pending administrator state changed before activation; bootstrap refused."
        );
      }

      await transaction.user.update({
        where: { id: userId },
        data: { status: UserStatus.ACTIVE },
      });
      await transaction.auditLog.create({
        data: {
          action: AuditAction.USER_UPDATED,
          metadata: {
            mode: "INITIAL_ADMIN_BOOTSTRAP_ACTIVATED",
            userId,
            temporaryPasswordRequired: true,
            totpEnrollmentRequired: true,
          },
        },
      });
    },
    transactionTiming
  );
}
