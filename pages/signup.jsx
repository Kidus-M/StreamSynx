import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AuthLayout from "../components/AuthLayout";
import SignUpForm from "../components/SignUp";
import { useAuth } from "../lib/auth";
import { safeNext } from "./login";

export default function SignUpPage() {
  const router = useRouter();
  const { user } = useAuth();
  const redirectTo = safeNext(router.query.next);

  useEffect(() => {
    if (user) router.replace(redirectTo);
  }, [user, redirectTo, router]);

  return (
    <AuthLayout
      eyebrow="Free account"
      title="Create your account"
      subtitle="Save titles, keep your history in sync and watch together with friends."
      pageTitle="Create account — StreamSynx"
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={`/login${router.query.next ? `?next=${encodeURIComponent(redirectTo)}` : ""}`}
            className="font-medium text-accent transition-colors hover:text-accent-hover"
          >
            Sign in
          </Link>
        </>
      }
    >
      <SignUpForm redirectTo={redirectTo} />
    </AuthLayout>
  );
}
