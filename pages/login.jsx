import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AuthLayout from "../components/AuthLayout";
import SignIn from "../components/SignIn";
import { useAuth } from "../lib/auth";

/** Where to land after signing in: `?next=` if it is a safe internal path. */
export const safeNext = (next) =>
  typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";

export default function LoginPage() {
  const router = useRouter();
  const { user } = useAuth();
  const redirectTo = safeNext(router.query.next);

  // Already signed in: skip the form.
  useEffect(() => {
    if (user) router.replace(redirectTo);
  }, [user, redirectTo, router]);

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in to StreamSynx"
      subtitle="Pick up your watchlist, history and watch parties where you left them."
      pageTitle="Sign in — StreamSynx"
      footer={
        <>
          New here?{" "}
          <Link
            href={`/signup${router.query.next ? `?next=${encodeURIComponent(redirectTo)}` : ""}`}
            className="font-medium text-accent transition-colors hover:text-accent-hover"
          >
            Create an account
          </Link>
        </>
      }
    >
      <SignIn redirectTo={redirectTo} />
    </AuthLayout>
  );
}
