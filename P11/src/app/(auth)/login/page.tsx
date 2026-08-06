import type { Metadata } from "next";

import { brand } from "@/config/brand";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; email?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="text-fg-muted mb-2 text-sm font-medium tracking-wide uppercase">
          {brand.name}
        </p>
        <h1 className="mb-6 text-2xl font-semibold">Sign in</h1>
        <LoginForm
          redirectTo={params.callbackUrl}
          defaultEmail={params.email}
        />
      </div>
    </main>
  );
}
