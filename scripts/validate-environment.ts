import "dotenv/config";

import {
  validateWorkspaceRuntimeEnvironment,
  type WorkspaceEnvironmentMode,
} from "../lib/config/workspace-environment";

const environmentArgument = process.argv.find((argument) =>
  argument.startsWith("--environment=")
);
const requestedMode = environmentArgument?.split("=", 2)[1];

if (
  requestedMode &&
  !["development", "test", "production"].includes(requestedMode)
) {
  throw new Error(
    "--environment must be development, test or production when provided."
  );
}

const configuration = validateWorkspaceRuntimeEnvironment(process.env, {
  mode: requestedMode as WorkspaceEnvironmentMode | undefined,
});

console.log(
  `Workspace ${configuration.mode} configuration is valid. Email: ${
    configuration.emailConfigured ? "configured" : "not configured"
  }. ITF Flow directory sync: ${
    configuration.itfFlowDirectorySyncConfigured ? "configured" : "not configured"
  }.`
);
