import "dotenv/config";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceEmailConfiguration } from "@/lib/config/workspace-environment";
import { sendWorkspaceWelcomeEmail } from "@/lib/email/send-workspace-welcome-email";
import {
  InitialAdministratorBootstrapError,
  parseInitialAdministratorArguments,
} from "@/lib/policies/initial-admin-bootstrap";
import { generateTemporaryPassword } from "@/lib/security/password";
import {
  activatePendingInitialAdministrator,
  preparePendingInitialAdministrator,
} from "@/lib/services/initial-admin-bootstrap-prisma";
import { bootstrapInitialAdministrator } from "@/lib/services/initial-admin-bootstrap.service";

const USAGE =
  'npm run db:bootstrap-admin -- --email "administrator@itf.gov.ng" --full-name "Approved Administrator" --staff-number "00000"';

async function main() {
  const identity = parseInitialAdministratorArguments(process.argv.slice(2));
  const result = await bootstrapInitialAdministrator(identity, {
    deploymentStage: process.env.WORKSPACE_DEPLOYMENT_STAGE,
    assertEmailDeliveryConfigured: () => {
      resolveWorkspaceEmailConfiguration();
    },
    generateTemporaryPassword,
    hashPassword: (password) => bcrypt.hash(password, 10),
    preparePendingAdministrator: preparePendingInitialAdministrator,
    sendWelcomeEmail: sendWorkspaceWelcomeEmail,
    activatePendingAdministrator: activatePendingInitialAdministrator,
  });

  console.log(
    `Initial SYSTEM_ADMIN activated for ${result.email}. A single-use temporary password was sent to the official email address.`
  );
}

main()
  .catch((error) => {
    const message =
      error instanceof Error ? error.message : "Unknown bootstrap failure.";
    console.error(`Initial administrator bootstrap failed: ${message}`);
    if (error instanceof InitialAdministratorBootstrapError) {
      console.error(`Usage: ${USAGE}`);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
