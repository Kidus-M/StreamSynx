import { useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import { getLastEpisode } from "../../lib/localStore";

/**
 * Legacy entry point (`/watchTv?tv_id=123`). The series player lives at
 * /watchTv/[id]/[season]/[episode]; this resumes the last episode watched on
 * this device, or starts at S1 E1.
 */
export default function WatchTvRedirect() {
  const router = useRouter();
  const showId = router.isReady ? router.query.tv_id || null : null;

  useEffect(() => {
    if (!router.isReady) return;
    if (!showId) return;

    const resume = getLastEpisode(showId);
    router.replace(
      `/watchTv/${showId}/${resume?.season || 1}/${resume?.episode || 1}`,
      undefined,
      { shallow: false }
    );
  }, [router, showId]);

  return (
    <div className="flex min-h-screen flex-col bg-primary text-textprimary">
      <Head>
        <title>Loading series — StreamSynx</title>
        <meta name="robots" content="noindex" />
      </Head>
      <NavBar />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        {showId ? (
          <>
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-accent" />
            <p className="text-sm text-textsecondary">Opening the series…</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">No series selected</h1>
            <Link href="/" className="btn-primary">
              Browse titles
            </Link>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
