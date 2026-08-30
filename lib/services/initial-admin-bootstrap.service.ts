import {
  InitialAdministratorBootstrapError,
  InitialAdministratorIdentity,
  requireStagingInitialAdministratorBootstrap,
  validateInitialAdministratorIdentity,
} from "@/lib/policies/initial-admin-bootstrap";

export type PreparedInitialAdministrator = {
  userId: string;
  resumed: boolean;
};

export type InitialAdministratorBootstrapDependencies = {
  deploymentStage: string | undefined;
  assertEmailDeliveryConfigured: () => void;
  generateTemporaryPassword: () => string;
  hashPassword: (password: string) => Promise<string>;
  preparePendingAdministrator: (
    identity: InitialAdministratorIdentity,
    passwordHash: string
  ) => Promise<PreparedInitialAdministrator>;
  sendWelcomeEmail: (params: {
    to: string;
    fullName: string;
    temporaryPassword: string;
  }) => Promise<void>;
  activatePendingAdministrator: (userId: string) => Promise<void>;
};

export async function bootstrapInitialAdministrator(
  unvalidatedIdentity: InitialAdministratorIdentity,
  dependencies: InitialAdministratorBootstrapDependencies
) {
  requireStagingInitialAdministratorBootstrap(dependencies.deploymentStage);
  const identity = validateInitialAdministratorIdentity(unvalidatedIdentity);

  // Validate mail configuration before creating even an inactive database record.
  dependencies.assertEmailDeliveryConfigured();

  const temporaryPassword = dependencies.generateTemporaryPassword();
  const passwordHash = await dependencies.hashPassword(temporaryPassword);
  const prepared = await dependencies.preparePendingAdministrator(
    identity,
    passwordHash
  );

  try {
    await dependencies.sendWelcomeEmail({
      to: identity.email,
      fullName: identity.fullName,
      temporaryPassword,
    });
  } catch (error) {
    throw new InitialAdministratorBootstrapError(
      "Administrator email delivery failed. The pending account remains inactive; correct the mail configuration and rerun the exact same command.",
      { cause: error }
    );
  }

  try {
    await dependencies.activatePendingAdministrator(prepared.userId);
  } catch (error) {
    throw new InitialAdministratorBootstrapError(
      "The credential email was delivered, but administrator activation failed. The account remains inactive; rerun the exact same command to issue a replacement credential and retry activation.",
      { cause: error }
    );
  }

  return {
    userId: prepared.userId,
    email: identity.email,
    resumed: prepared.resumed,
  };
}
