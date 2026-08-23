export type WorkspaceEnvironmentMode = "development" | "test" | "production";

export type WorkspaceEnvironmentSource = Readonly<
  Record<string, string | undefined>
>;

type ValidationOptions = {
  mode?: WorkspaceEnvironmentMode;
};

export type WorkspaceEmailConfiguration = {
  apiKey: string;
  from: string;
  loginUrl: string;
};

export type ItfFlowDirectorySyncConfiguration = {
  endpoint: string;
  secret: string;
};

export type WorkspaceSeedConfiguration = {
  mode: WorkspaceEnvironmentMode;
  email: string;
  password: string;
  fullName: string;
  staffNumber: string;
  itfFlowUrl: string;
};

export type WorkspaceRuntimeConfiguration = {
  mode: WorkspaceEnvironmentMode;
  databaseUrl: string;
  authSecret?: string;
  authUrl?: string;
  launchTokenSecret: string;
  emailConfigured: boolean;
  itfFlowDirectorySyncConfigured: boolean;
  sessionPolicy: WorkspaceSessionPolicyConfiguration;
};

export type WorkspaceSessionPolicyConfiguration = {
  staffIdleSeconds: number;
  privilegedIdleSeconds: number;
  warningSeconds: number;
  absoluteSeconds: number;
  maxConcurrentSessions: number;
  recoveryGrantSeconds: number;
};

const DEVELOPMENT_LAUNCH_TOKEN_SECRET =
  "development-only-workspace-launch-token-secret";
const DEVELOPMENT_LOGIN_URL = "http://localhost:3000/login";
const DEVELOPMENT_ITF_FLOW_URL = "http://localhost:3001/workspace/launch";

export class WorkspaceConfigurationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid Workspace configuration:\n- ${issues.join("\n- ")}`);
    this.name = "WorkspaceConfigurationError";
    this.issues = issues;
  }
}

function resolveMode(
  environment: WorkspaceEnvironmentSource,
  options: ValidationOptions
): WorkspaceEnvironmentMode {
  if (options.mode) return options.mode;

  const mode = environment.NODE_ENV;
  if (mode === "production" || mode === "test" || mode === "development") {
    return mode;
  }

  return "development";
}

function readValue(environment: WorkspaceEnvironmentSource, name: string) {
  const value = environment[name];
  return value && value.trim() ? value : undefined;
}

function requireValue(
  environment: WorkspaceEnvironmentSource,
  name: string,
  issues: string[]
) {
  const value = readValue(environment, name);

  if (!value) issues.push(`${name} is required.`);

  return value;
}

function resolveAlias(
  environment: WorkspaceEnvironmentSource,
  preferredName: string,
  legacyName: string,
  issues: string[]
) {
  const preferredValue = readValue(environment, preferredName);
  const legacyValue = readValue(environment, legacyName);

  if (preferredValue && legacyValue && preferredValue !== legacyValue) {
    issues.push(
      `${preferredName} and ${legacyName} must match when both are configured.`
    );
  }

  return preferredValue ?? legacyValue;
}

function validateSecret(
  name: string,
  value: string | undefined,
  mode: WorkspaceEnvironmentMode,
  issues: string[],
  minimumLength = 32
) {
  if (!value) return;

  if (mode === "production" && value.length < minimumLength) {
    issues.push(`${name} must contain at least ${minimumLength} characters in production.`);
  }

  if (
    mode === "production" &&
    /(replace[-_ ]?with|development[-_ ]?only|must[-_ ]?match|password123)/i.test(
      value
    )
  ) {
    issues.push(`${name} contains a documented placeholder value.`);
  }
}

function parseUrl(
  name: string,
  value: string | undefined,
  protocols: readonly string[],
  issues: string[]
) {
  if (!value) return undefined;

  try {
    const url = new URL(value);

    if (!protocols.includes(url.protocol)) {
      issues.push(`${name} must use ${protocols.join(" or ")}.`);
      return undefined;
    }

    if (name !== "DATABASE_URL" && (url.username || url.password)) {
      issues.push(`${name} must not contain embedded credentials.`);
      return undefined;
    }

    return url.toString();
  } catch {
    issues.push(`${name} must be a valid absolute URL.`);
    return undefined;
  }
}

function validateSender(name: string, value: string | undefined, issues: string[]) {
  if (!value) return;

  const address = value.match(/<([^<>]+)>\s*$/)?.[1] ?? value;
  if (
    /[\r\n]/.test(value) ||
    !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address)
  ) {
    issues.push(`${name} must be an email address with an optional display name.`);
  }
}

function throwIfInvalid(issues: string[]) {
  if (issues.length > 0) throw new WorkspaceConfigurationError(issues);
}

function readInteger(
  environment: WorkspaceEnvironmentSource,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
  issues: string[]
) {
  const value = readValue(environment, name);
  if (!value) return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    issues.push(`${name} must be an integer from ${minimum} to ${maximum}.`);
    return fallback;
  }

  return parsed;
}

export function resolveWorkspaceSessionPolicy(
  environment: WorkspaceEnvironmentSource = process.env
): WorkspaceSessionPolicyConfiguration {
  const issues: string[] = [];
  const staffIdleSeconds = readInteger(
    environment,
    "WORKSPACE_STAFF_IDLE_TIMEOUT_SECONDS",
    1200,
    300,
    7200,
    issues
  );
  const privilegedIdleSeconds = readInteger(
    environment,
    "WORKSPACE_PRIVILEGED_IDLE_TIMEOUT_SECONDS",
    600,
    300,
    3600,
    issues
  );
  const warningSeconds = readInteger(
    environment,
    "WORKSPACE_SESSION_WARNING_SECONDS",
    120,
    30,
    600,
    issues
  );
  const absoluteSeconds = readInteger(
    environment,
    "WORKSPACE_ABSOLUTE_TIMEOUT_SECONDS",
    10800,
    1800,
    86400,
    issues
  );
  const maxConcurrentSessions = readInteger(
    environment,
    "WORKSPACE_MAX_CONCURRENT_SESSIONS",
    2,
    1,
    10,
    issues
  );
  const recoveryGrantSeconds = readInteger(
    environment,
    "WORKSPACE_SESSION_RECOVERY_TTL_SECONDS",
    300,
    60,
    900,
    issues
  );

  if (warningSeconds >= Math.min(staffIdleSeconds, privilegedIdleSeconds)) {
    issues.push("WORKSPACE_SESSION_WARNING_SECONDS must be shorter than both idle timeouts.");
  }
  if (absoluteSeconds <= Math.max(staffIdleSeconds, privilegedIdleSeconds)) {
    issues.push("WORKSPACE_ABSOLUTE_TIMEOUT_SECONDS must be longer than both idle timeouts.");
  }

  throwIfInvalid(issues);

  return {
    staffIdleSeconds,
    privilegedIdleSeconds,
    warningSeconds,
    absoluteSeconds,
    maxConcurrentSessions,
    recoveryGrantSeconds,
  };
}

export function resolveWorkspaceLaunchTokenSecret(
  environment: WorkspaceEnvironmentSource = process.env,
  options: ValidationOptions = {}
) {
  const mode = resolveMode(environment, options);
  const issues: string[] = [];
  const configuredSecret = readValue(environment, "WORKSPACE_LAUNCH_TOKEN_SECRET");

  if (mode === "production" && !configuredSecret) {
    issues.push("WORKSPACE_LAUNCH_TOKEN_SECRET is required in production.");
  }

  validateSecret(
    "WORKSPACE_LAUNCH_TOKEN_SECRET",
    configuredSecret,
    mode,
    issues
  );
  throwIfInvalid(issues);

  return configuredSecret ?? DEVELOPMENT_LAUNCH_TOKEN_SECRET;
}

export function resolveWorkspaceDatabaseUrl(
  environment: WorkspaceEnvironmentSource = process.env
) {
  const issues: string[] = [];
  const databaseUrl = parseUrl(
    "DATABASE_URL",
    requireValue(environment, "DATABASE_URL", issues),
    ["postgresql:", "postgres:"],
    issues
  );
  throwIfInvalid(issues);

  return databaseUrl!;
}

export function resolveWorkspaceEmailConfiguration(
  environment: WorkspaceEnvironmentSource = process.env,
  options: ValidationOptions = {}
): WorkspaceEmailConfiguration {
  const mode = resolveMode(environment, options);
  const issues: string[] = [];
  const apiKey = requireValue(environment, "RESEND_API_KEY", issues);
  const from = requireValue(environment, "RESEND_FROM_EMAIL", issues);
  const authUrlValue = resolveAlias(
    environment,
    "AUTH_URL",
    "NEXTAUTH_URL",
    issues
  );
  const authUrl = parseUrl(
    "AUTH_URL",
    authUrlValue,
    ["https:", "http:"],
    issues
  );
  const configuredLoginUrl = readValue(environment, "APP_LOGIN_URL");
  const derivedLoginUrl = authUrl
    ? new URL("/login", authUrl).toString()
    : undefined;
  const loginUrlValue =
    configuredLoginUrl ??
    derivedLoginUrl ??
    (mode === "production" ? undefined : DEVELOPMENT_LOGIN_URL);

  if (!loginUrlValue) {
    issues.push(
      "APP_LOGIN_URL or AUTH_URL/NEXTAUTH_URL is required for production email delivery."
    );
  }

  validateSecret("RESEND_API_KEY", apiKey, mode, issues, 16);
  validateSender("RESEND_FROM_EMAIL", from, issues);
  const loginUrl = parseUrl(
    "APP_LOGIN_URL",
    loginUrlValue,
    ["https:", "http:"],
    issues
  );
  throwIfInvalid(issues);

  return {
    apiKey: apiKey!,
    from: from!,
    loginUrl: loginUrl!,
  };
}

export function resolveItfFlowDirectorySyncConfiguration(
  environment: WorkspaceEnvironmentSource = process.env,
  options: ValidationOptions = {}
): ItfFlowDirectorySyncConfiguration {
  const mode = resolveMode(environment, options);
  const issues: string[] = [];
  const explicitEndpoint = readValue(environment, "ITF_FLOW_DIRECTORY_SYNC_URL");
  const launchUrlValue = readValue(environment, "ITF_FLOW_URL");
  const secret = requireValue(
    environment,
    "WORKSPACE_DIRECTORY_SYNC_SECRET",
    issues
  );
  const launchUrl = parseUrl(
    "ITF_FLOW_URL",
    launchUrlValue,
    ["https:", "http:"],
    issues
  );
  const endpointValue =
    explicitEndpoint ??
    (launchUrl
      ? new URL("/api/integrations/workspace/directory-sync", launchUrl).toString()
      : undefined);

  if (!endpointValue) {
    issues.push("ITF_FLOW_URL or ITF_FLOW_DIRECTORY_SYNC_URL is required.");
  }

  const endpoint = parseUrl(
    "ITF_FLOW_DIRECTORY_SYNC_URL",
    endpointValue,
    ["https:", "http:"],
    issues
  );
  validateSecret("WORKSPACE_DIRECTORY_SYNC_SECRET", secret, mode, issues);
  throwIfInvalid(issues);

  return { endpoint: endpoint!, secret: secret! };
}

export function validateWorkspaceRuntimeEnvironment(
  environment: WorkspaceEnvironmentSource = process.env,
  options: ValidationOptions = {}
): WorkspaceRuntimeConfiguration {
  const mode = resolveMode(environment, options);
  const issues: string[] = [];
  let sessionPolicy: WorkspaceSessionPolicyConfiguration | undefined;
  try {
    sessionPolicy = resolveWorkspaceSessionPolicy(environment);
  } catch (error) {
    if (error instanceof WorkspaceConfigurationError) issues.push(...error.issues);
    else throw error;
  }
  let databaseUrl: string | undefined;
  try {
    databaseUrl = resolveWorkspaceDatabaseUrl(environment);
  } catch (error) {
    if (error instanceof WorkspaceConfigurationError) issues.push(...error.issues);
    else throw error;
  }
  const authSecret = resolveAlias(
    environment,
    "AUTH_SECRET",
    "NEXTAUTH_SECRET",
    issues
  );
  const authUrlValue = resolveAlias(
    environment,
    "AUTH_URL",
    "NEXTAUTH_URL",
    issues
  );
  const authUrl = parseUrl(
    "AUTH_URL",
    authUrlValue,
    ["https:", "http:"],
    issues
  );

  if (mode === "production") {
    if (!authSecret) issues.push("AUTH_SECRET or NEXTAUTH_SECRET is required in production.");
    if (!authUrlValue) issues.push("AUTH_URL or NEXTAUTH_URL is required in production.");
  }

  validateSecret("AUTH_SECRET", authSecret, mode, issues);

  const trustHost = readValue(environment, "AUTH_TRUST_HOST");
  if (trustHost && !["true", "false", "1", "0"].includes(trustHost.toLowerCase())) {
    issues.push("AUTH_TRUST_HOST must be true, false, 1 or 0 when configured.");
  }

  let launchTokenSecret = DEVELOPMENT_LAUNCH_TOKEN_SECRET;
  try {
    launchTokenSecret = resolveWorkspaceLaunchTokenSecret(environment, { mode });
  } catch (error) {
    if (error instanceof WorkspaceConfigurationError) issues.push(...error.issues);
    else throw error;
  }

  const emailValuesPresent = Boolean(
    readValue(environment, "RESEND_API_KEY") ||
      readValue(environment, "RESEND_FROM_EMAIL") ||
      readValue(environment, "APP_LOGIN_URL")
  );
  const emailRequired = mode === "production";

  if (emailRequired || emailValuesPresent) {
    try {
      resolveWorkspaceEmailConfiguration(environment, { mode });
    } catch (error) {
      if (error instanceof WorkspaceConfigurationError) issues.push(...error.issues);
      else throw error;
    }
  }

  const itfFlowValuesPresent = Boolean(
    readValue(environment, "ITF_FLOW_URL") ||
      readValue(environment, "ITF_FLOW_DIRECTORY_SYNC_URL") ||
      readValue(environment, "WORKSPACE_DIRECTORY_SYNC_SECRET")
  );

  if (mode === "production" && itfFlowValuesPresent) {
    try {
      resolveItfFlowDirectorySyncConfiguration(environment, { mode });
    } catch (error) {
      if (error instanceof WorkspaceConfigurationError) issues.push(...error.issues);
      else throw error;
    }
  } else {
    parseUrl(
      "ITF_FLOW_URL",
      readValue(environment, "ITF_FLOW_URL"),
      ["https:", "http:"],
      issues
    );
    parseUrl(
      "ITF_FLOW_DIRECTORY_SYNC_URL",
      readValue(environment, "ITF_FLOW_DIRECTORY_SYNC_URL"),
      ["https:", "http:"],
      issues
    );
  }

  throwIfInvalid(issues);

  return {
    mode,
    databaseUrl: databaseUrl!,
    authSecret,
    authUrl,
    launchTokenSecret,
    emailConfigured: emailRequired || emailValuesPresent,
    itfFlowDirectorySyncConfigured: Boolean(
      (readValue(environment, "ITF_FLOW_URL") ||
        readValue(environment, "ITF_FLOW_DIRECTORY_SYNC_URL")) &&
        readValue(environment, "WORKSPACE_DIRECTORY_SYNC_SECRET")
    ),
    sessionPolicy: sessionPolicy!,
  };
}

export function resolveWorkspaceSeedConfiguration(
  environment: WorkspaceEnvironmentSource = process.env,
  options: ValidationOptions = {}
): WorkspaceSeedConfiguration {
  const mode = resolveMode(environment, options);
  const issues: string[] = [];
  const production = mode === "production";
  const email =
    readValue(environment, "INITIAL_ADMIN_EMAIL") ??
    (production ? undefined : "admin@itf.gov.ng");
  const password =
    readValue(environment, "INITIAL_ADMIN_PASSWORD") ??
    (production ? undefined : "Password123!");
  const fullName =
    readValue(environment, "INITIAL_ADMIN_NAME") ??
    (production ? undefined : "System Administrator");
  const staffNumber =
    readValue(environment, "INITIAL_ADMIN_STAFF_NUMBER") ??
    (production ? undefined : "ITF-SYS-001");
  const itfFlowUrlValue =
    readValue(environment, "ITF_FLOW_URL") ??
    (production ? undefined : DEVELOPMENT_ITF_FLOW_URL);

  if (!email) issues.push("INITIAL_ADMIN_EMAIL is required in production.");
  if (!password) issues.push("INITIAL_ADMIN_PASSWORD is required in production.");
  if (!fullName) issues.push("INITIAL_ADMIN_NAME is required in production.");
  if (!staffNumber) {
    issues.push("INITIAL_ADMIN_STAFF_NUMBER is required in production.");
  }
  if (!itfFlowUrlValue) issues.push("ITF_FLOW_URL is required in production.");

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    issues.push("INITIAL_ADMIN_EMAIL must be a valid email address.");
  }
  validateSecret("INITIAL_ADMIN_PASSWORD", password, mode, issues, 1);
  const itfFlowUrl = parseUrl(
    "ITF_FLOW_URL",
    itfFlowUrlValue,
    ["https:", "http:"],
    issues
  );
  throwIfInvalid(issues);

  return {
    mode,
    email: email!,
    password: password!,
    fullName: fullName!,
    staffNumber: staffNumber!,
    itfFlowUrl: itfFlowUrl!,
  };
}
