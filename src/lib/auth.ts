/**
 * Kevtech authentication -- NextAuth credentials provider.
 * Tenant is ALWAYS resolved from the authenticated session, never from
 * a client-supplied business_id.
 */
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db, ensureDatabase } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/auth" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const email = creds?.email?.toString().trim().toLowerCase();
        const password = creds?.password?.toString();
        if (!email || !password) return null;

        // Ensure database tables exist (auto-creates them on first call)
        await ensureDatabase();

        const user = await db.user.findFirst({
          where: { email, status: "ACTIVE" },
          include: { business: true },
        });
        if (!user || !user.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          // custom fields carried in JWT
          businessId: user.businessId,
          businessName: user.business.name,
          businessType: user.business.type,
          role: user.role,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as any;
        token.businessId = u.businessId;
        token.businessName = u.businessName;
        token.businessType = u.businessType;
        token.role = u.role;
      }
      // Always refresh businessName + businessType from DB so the session
      // picks up onboarding changes without requiring a re-login.
      if (token.businessId) {
        const biz = await db.business.findUnique({
          where: { id: token.businessId },
          select: { name: true, type: true, agentName: true },
        });
        if (biz) {
          token.businessName = biz.name;
          token.businessType = biz.type;
          token.agentName = biz.agentName;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).businessId = token.businessId;
        (session.user as any).businessName = token.businessName;
        (session.user as any).businessType = token.businessType;
        (session.user as any).role = token.role;
        (session.user as any).agentName = token.agentName;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "ares-dev-secret-change-in-production",
};

export async function hashPassword(p: string) {
  return bcrypt.hash(p, 12);
}

export async function verifyPassword(p: string, hash: string) {
  return bcrypt.compare(p, hash);
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      businessId: string;
      businessName: string;
      businessType: string;
      role: string;
      agentName?: string;
    };
  }
  interface User {
    businessId: string;
    businessName: string;
    businessType: string;
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    businessId: string;
    businessName: string;
    businessType: string;
    role: string;
    agentName?: string;
  }
}
