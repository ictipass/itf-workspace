export async function register() {
  if (
    process.env.NEXT_RUNTIME !== "nodejs" ||
    process.env.NEXT_PHASE === "phase-production-build"
  ) {
    return;
  }

  const { validateWorkspaceRuntimeEnvironment } = await import(
    "@/lib/config/workspace-environment"
  );

  validateWorkspaceRuntimeEnvironment();
}
