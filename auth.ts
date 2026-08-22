import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  UserStatus,
  AuditAction,
  WorkspaceRole,
} from "@/lib/generated/prisma/client";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
  },

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

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: {
            office: true,
            department: true,
            division: true,
            unit: true,
            position: true,
          },
        });

        if (
          !user ||
          user.status !== UserStatus.ACTIVE ||
          !user.passwordHash
        ) {
          return null;
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);

        if (!validPassword) return null;

        await prisma.auditLog.create({
          data: {
            actorId: user.id,
            action: AuditAction.LOGIN,
            metadata: {
              email: user.email,
              workspaceRole: user.workspaceRole,
            },
          },
        });

        return {
          id: user.id,
          name: user.fullName,
          email: user.email,
          staffNumber: user.staffNumber,
          workspaceRole: user.workspaceRole,
          status: user.status,
          isTemporaryPassword: user.isTemporaryPassword,
          officeId: user.officeId,
          departmentId: user.departmentId,
          divisionId: user.divisionId,
          unitId: user.unitId,
          positionId: user.positionId,
        };
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
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.staffNumber = token.staffNumber as string | null;
        session.user.workspaceRole = token.workspaceRole as WorkspaceRole;
        session.user.status = token.status as UserStatus;
        session.user.isTemporaryPassword = token.isTemporaryPassword as boolean;
        session.user.officeId = token.officeId as string | null;
        session.user.departmentId = token.departmentId as string | null;
        session.user.divisionId = token.divisionId as string | null;
        session.user.unitId = token.unitId as string | null;
        session.user.positionId = token.positionId as string | null;
      }

      return session;
    },
  },
});
