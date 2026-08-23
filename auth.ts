import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import {
  UserStatus,
  WorkspaceRole,
  WorkspaceSessionRevocationReason,
} from "@/lib/generated/prisma/client";
import { resolveWorkspaceSessionPolicy } from "@/lib/config/workspace-environment";
import {
  authenticateWorkspaceCredentials,
  createWorkspaceSession,
  recoverWorkspaceSession,
  revokeWorkspaceSession,
  WorkspaceSessionLimitError,
} from "@/lib/auth/workspace-session.service";

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const recoverySchema = z.object({
  grantToken: z.string().min(1),
  terminateSessionId: z.string().optional(),
});
const sessionPolicy = resolveWorkspaceSessionPolicy();

class SessionLimitSigninError extends CredentialsSignin {
  code = "session_limit";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: sessionPolicy.absoluteSeconds },
  jwt: { maxAge: sessionPolicy.absoluteSeconds },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const user = await authenticateWorkspaceCredentials(parsed.data.email, parsed.data.password);
        if (!user) return null;
        try {
          return await createWorkspaceSession(user);
        } catch (error) {
          if (error instanceof WorkspaceSessionLimitError) throw new SessionLimitSigninError();
          throw error;
        }
      },
    }),
    Credentials({
      id: "session-recovery",
      name: "Session recovery",
      credentials: {
        grantToken: { label: "Recovery grant", type: "password" },
        terminateSessionId: { label: "Session to terminate", type: "text" },
      },
      async authorize(credentials) {
        const parsed = recoverySchema.safeParse(credentials);
        if (!parsed.success) return null;
        return recoverWorkspaceSession(
          parsed.data.grantToken,
          parsed.data.terminateSessionId || undefined
        );
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.staffNumber = user.staffNumber;
        token.workspaceRole = user.workspaceRole;
        token.status = user.status;
        token.isTemporaryPassword = user.isTemporaryPassword;
        token.officeId = user.officeId;
        token.departmentId = user.departmentId;
        token.divisionId = user.divisionId;
        token.unitId = user.unitId;
        token.positionId = user.positionId;
        token.workspaceSessionId = user.workspaceSessionId;
        token.workspaceSessionIdleExpiresAt = user.workspaceSessionIdleExpiresAt.toISOString();
        token.workspaceSessionAbsoluteExpiresAt = user.workspaceSessionAbsoluteExpiresAt.toISOString();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        Object.assign(session.user, {
          id: token.id as string,
          staffNumber: token.staffNumber as string | null,
          workspaceRole: token.workspaceRole as WorkspaceRole,
          status: token.status as UserStatus,
          isTemporaryPassword: token.isTemporaryPassword as boolean,
          officeId: token.officeId as string | null,
          departmentId: token.departmentId as string | null,
          divisionId: token.divisionId as string | null,
          unitId: token.unitId as string | null,
          positionId: token.positionId as string | null,
          workspaceSessionId: token.workspaceSessionId as string,
          workspaceSessionIdleExpiresAt: token.workspaceSessionIdleExpiresAt as string,
          workspaceSessionAbsoluteExpiresAt: token.workspaceSessionAbsoluteExpiresAt as string,
        });
      }
      return session;
    },
  },
  events: {
    async signOut(message) {
      if ("token" in message && message.token?.workspaceSessionId && message.token.id) {
        await revokeWorkspaceSession(
          message.token.workspaceSessionId as string,
          message.token.id as string,
          WorkspaceSessionRevocationReason.USER_SIGN_OUT
        );
      }
    },
  },
});
