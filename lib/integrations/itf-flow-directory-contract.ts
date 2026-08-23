export const ITF_FLOW_DIRECTORY_VERSION = "itf-workspace-directory-v1" as const;

export type ItfFlowDirectoryUser = {
  workspaceUserId: string;
  staffNumber: string | null;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  office: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
  division: { id: string; name: string } | null;
  unit: { id: string; name: string } | null;
  position: { id: string; name: string } | null;
  supervisorWorkspaceUserId: string | null;
};

export function buildItfFlowDirectoryBatch(input: {
  requestId: string;
  targetAppSlug: string;
  batchIndex: number;
  batchCount: number;
  users: readonly ItfFlowDirectoryUser[];
}) {
  return {
    version: ITF_FLOW_DIRECTORY_VERSION,
    requestId: input.requestId,
    source: "itf-workspace" as const,
    targetAppSlug: input.targetAppSlug,
    batch: { index: input.batchIndex, count: input.batchCount },
    users: input.users,
  };
}
