export type InitialAdministratorIdentity = {
  email: string;
  fullName: string;
  staffNumber: string;
};

export type ExistingInitialAdministrator = InitialAdministratorIdentity & {
  id: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  isTemporaryPassword: boolean;
};

export type InitialAdministratorPreparationDecision =
  | { action: "CREATE" }
  | { action: "RESUME"; userId: string };

export type InitialAdministratorBootstrapTransactionTiming = {
  maxWait: number;
  timeout: number;
};

export class InitialAdministratorBootstrapError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "InitialAdministratorBootstrapError";
  }
}

function requireOption(
  options: Map<string, string>,
  option: string,
  label: string
) {
  const value = options.get(option)?.trim();
  if (!value) {
    throw new InitialAdministratorBootstrapError(`${label} is required.`);
  }
  return value;
}

export function parseInitialAdministratorArguments(
  arguments_: string[]
): InitialAdministratorIdentity {
  const permittedOptions = new Set(["--email", "--full-name", "--staff-number"]);
  const options = new Map<string, string>();

  for (let index = 0; index < arguments_.length; index += 2) {
    const option = arguments_[index];
    const value = arguments_[index + 1];

    if (!permittedOptions.has(option)) {
      throw new InitialAdministratorBootstrapError(
        `Unknown bootstrap option: ${option ?? "<missing>"}.`
      );
    }
    if (options.has(option)) {
      throw new InitialAdministratorBootstrapError(
        `Bootstrap option ${option} was supplied more than once.`
      );
    }
    if (value === undefined || value.startsWith("--")) {
      throw new InitialAdministratorBootstrapError(
        `Bootstrap option ${option} requires a value.`
      );
    }
    options.set(option, value);
  }

  return validateInitialAdministratorIdentity({
    email: requireOption(options, "--email", "Administrator email"),
    fullName: requireOption(options, "--full-name", "Administrator full name"),
    staffNumber: requireOption(
      options,
      "--staff-number",
      "Administrator staff number"
    ),
  });
}

export function validateInitialAdministratorIdentity(
  identity: InitialAdministratorIdentity
): InitialAdministratorIdentity {
  const email = identity.email.trim().toLowerCase();
  const fullName = identity.fullName.trim();
  const staffNumber = identity.staffNumber.trim();
  const issues: string[] = [];

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.includes("\\") ||
    email.length > 254
  ) {
    issues.push("Administrator email must be a valid email address.");
  }
  if (fullName.length < 2 || fullName.length > 200 || /[\u0000-\u001f]/.test(fullName)) {
    issues.push("Administrator full name must contain 2 to 200 printable characters.");
  }
  if (
    staffNumber.length < 1 ||
    staffNumber.length > 64 ||
    /[\u0000-\u001f]/.test(staffNumber)
  ) {
    issues.push("Administrator staff number must contain 1 to 64 printable characters.");
  }

  if (issues.length > 0) {
    throw new InitialAdministratorBootstrapError(issues.join(" "));
  }

  return { email, fullName, staffNumber };
}

function readBoundedDuration(
  environment: Record<string, string | undefined>,
  name: string,
  defaultValue: number
) {
  const value = environment[name]?.trim();
  if (!value) return defaultValue;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1_000 || parsed > 120_000) {
    throw new InitialAdministratorBootstrapError(
      `${name} must be an integer between 1000 and 120000 milliseconds.`
    );
  }
  return parsed;
}

export function resolveInitialAdministratorBootstrapTransactionTiming(
  environment: Record<string, string | undefined> = process.env
): InitialAdministratorBootstrapTransactionTiming {
  return {
    maxWait: readBoundedDuration(
      environment,
      "WORKSPACE_BOOTSTRAP_TRANSACTION_MAX_WAIT_MS",
      15_000
    ),
    timeout: readBoundedDuration(
      environment,
      "WORKSPACE_BOOTSTRAP_TRANSACTION_TIMEOUT_MS",
      30_000
    ),
  };
}

export function requireStagingInitialAdministratorBootstrap(
  deploymentStage: string | undefined
) {
  if (deploymentStage !== "staging") {
    throw new InitialAdministratorBootstrapError(
      "Initial-administrator bootstrap is permitted only when WORKSPACE_DEPLOYMENT_STAGE=staging."
    );
  }
}

function identitiesMatch(
  left: InitialAdministratorIdentity,
  right: InitialAdministratorIdentity
) {
  return (
    left.email.toLowerCase() === right.email.toLowerCase() &&
    left.fullName === right.fullName &&
    left.staffNumber === right.staffNumber
  );
}

export function decideInitialAdministratorPreparation(params: {
  identity: InitialAdministratorIdentity;
  existingAdministrators: ExistingInitialAdministrator[];
  conflictingUserExists: boolean;
}): InitialAdministratorPreparationDecision {
  const { identity, existingAdministrators, conflictingUserExists } = params;

  if (existingAdministrators.length > 1) {
    throw new InitialAdministratorBootstrapError(
      "Bootstrap refused because more than one SYSTEM_ADMIN already exists."
    );
  }

  const existing = existingAdministrators[0];
  if (existing) {
    if (
      existing.status === "INACTIVE" &&
      existing.isTemporaryPassword &&
      identitiesMatch(existing, identity)
    ) {
      return { action: "RESUME", userId: existing.id };
    }

    throw new InitialAdministratorBootstrapError(
      "Bootstrap refused because a SYSTEM_ADMIN already exists or the pending identity does not match exactly."
    );
  }

  if (conflictingUserExists) {
    throw new InitialAdministratorBootstrapError(
      "Bootstrap refused because the administrator email or staff number belongs to an existing user."
    );
  }

  return { action: "CREATE" };
}
