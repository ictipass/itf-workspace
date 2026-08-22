import { Resend } from "resend";
import { resolveWorkspaceEmailConfiguration } from "@/lib/config/workspace-environment";

export function createWorkspaceEmailClient() {
  const configuration = resolveWorkspaceEmailConfiguration();

  return {
    configuration,
    client: new Resend(configuration.apiKey),
  };
}
