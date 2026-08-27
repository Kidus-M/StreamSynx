import React from "react";
import Head from "next/head";
import Link from "next/link";
import NavBar from "./NavBar";
import Footer from "./Footer";
import { loginHref, useAuth } from "../lib/auth";

/** Standard page frame: nav, a centred column with the page title, footer. */
export const PageShell = ({ title, description, eyebrow, actions, children, wide = false }) => (
  <div className="flex min-h-screen flex-col bg-primary text-textprimary">
    <Head>
      <title>{`${title} — StreamSynx`}</title>
      {description && <meta name="description" content={description} />}
    </Head>

    <NavBar />

    <main className="flex-1 px-4 pb-16 pt-24 sm:px-6 lg:px-10">
      <div className={`mx-auto w-full ${wide ? "max-w-[1500px]" : "max-w-7xl"}`}>
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            {eyebrow && <p className="section-label mb-2">{eyebrow}</p>}
            <h1 className="heading-xl">{title}</h1>
            {description && (
              <p className="mt-2 max-w-2xl text-sm text-textsecondary">{description}</p>
            )}
          </div>
          {actions}
        </header>

        {children}
      </div>
    </main>

    <Footer />
  </div>
);

/** Blocks a page until auth resolves; guests get a sign-in prompt, not a flash. */
export const AuthGate = ({ children, message = "Sign in to see this page." }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index}>
            <div className="skeleton aspect-[2/3] w-full rounded-xl" />
            <div className="skeleton mt-2.5 h-3 w-4/5 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="surface flex flex-col items-center gap-4 px-6 py-20 text-center">
        <h2 className="text-lg font-semibold text-textprimary">{message}</h2>
        <p className="max-w-sm text-sm text-textsecondary">
          Browsing is open to everyone — an account is only needed to save things.
        </p>
        <div className="mt-2 flex gap-3">
          <Link href={loginHref(typeof window !== "undefined" ? window.location.pathname : "/")} className="btn-primary">
            Sign in
          </Link>
          <Link href="/signup" className="btn-ghost">
            Create account
          </Link>
        </div>
      </div>
    );
  }

  return typeof children === "function" ? children(user) : children;
};

/** Consistent empty state for the library pages. */
export const EmptyState = ({ icon: Icon, title, hint, action }) => (
  <div className="surface flex flex-col items-center gap-3 px-6 py-20 text-center">
    {Icon && <Icon className="h-7 w-7 text-textsecondary/50" />}
    <p className="text-base font-medium text-textprimary">{title}</p>
    {hint && <p className="max-w-sm text-sm text-textsecondary">{hint}</p>}
    {action}
  </div>
);

export default PageShell;
