import { requireCurrentUser } from "@/lib/auth/current-user";

export default async function DashboardPage() {
  const user = await requireCurrentUser();

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold tracking-tight">ITF Workspace</h1>
      <p className="mt-2 text-muted-foreground">
        Welcome, {user.name}. Role: {user.workspaceRole}
      </p>
    </main>
  );
}