import Head from "next/head";
import Link from "next/link";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";

export default function Custom404() {
  return (
    <div className="flex min-h-screen flex-col bg-primary text-textprimary">
      <Head>
        <title>Page not found — StreamSynx</title>
        <meta name="robots" content="noindex" />
      </Head>

      <NavBar />

      <main className="flex flex-1 items-center justify-center px-4 py-24">
        <div className="max-w-md text-center">
          <p className="section-label text-accent">Error 404</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tighter">
            We could not find that page
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-textsecondary">
            The link may be old or mistyped. Everything else is still where you left it.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/" className="btn-primary">
              Back to home
            </Link>
            <Link href="/search" className="btn-ghost">
              Search titles
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
