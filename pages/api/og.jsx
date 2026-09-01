import { ImageResponse } from "next/og";

/**
 * The image a shared StreamSynx link unfurls into.
 *
 * A shared title used to travel as a PNG the app rendered on the phone, which
 * meant it arrived as a flat picture: nothing to tap, no title in the message,
 * no way to open it. It travels as a link now, and this is what a link needs to
 * be worth pasting — the same trick Letterboxd and Spotify use, a card drawn
 * per title and served to the crawler that asks for it.
 *
 * Edge runtime because `ImageResponse` streams; this route is on the hot path
 * for every preview a chat app builds.
 */
export const config = { runtime: "edge" };

const BG = "#0B0B0E";
const ACCENT = "#E9B949";
const TEXT = "#F4F4F5";
const MUTED = "#9B9BA5";

const truncate = (value, limit) =>
  value && value.length > limit ? `${value.slice(0, limit - 1).trimEnd()}…` : value || "";

export default async function handler(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");

  if (!["movie", "tv"].includes(type) || !/^\d+$/.test(id || "")) {
    return new Response("Bad request", { status: 400 });
  }

  const key = process.env.NEXT_PUBLIC_API_KEY;
  if (!key) return new Response("Not configured", { status: 500 });

  const response = await fetch(
    `https://api.themoviedb.org/3/${type}/${id}?api_key=${key}&language=en-US`
  );
  if (!response.ok) return new Response("Not found", { status: 404 });

  const data = await response.json();
  const title = truncate(data.title || data.name || "Untitled", 58);
  const date = data.release_date || data.first_air_date || "";
  const year = date ? date.slice(0, 4) : "";
  const rating = data.vote_average ? Number(data.vote_average).toFixed(1) : "";
  const overview = truncate(data.overview || "", 180);
  const genres = (data.genres || []).slice(0, 2).map((genre) => genre.name);

  const poster = data.poster_path
    ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
    : null;
  const backdrop = data.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`
    : null;

  const meta = [type === "tv" ? "Series" : "Film", year, ...genres].filter(Boolean);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: BG,
          fontFamily: "sans-serif",
        }}
      >
        {backdrop && (
          <img
            src={backdrop}
            width={1200}
            height={630}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 1200,
              height: 630,
              objectFit: "cover",
            }}
          />
        )}

        {/* The wash that keeps the type legible over any backdrop. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            background:
              "linear-gradient(90deg, rgba(11,11,14,0.98) 42%, rgba(11,11,14,0.86) 66%, rgba(11,11,14,0.62) 100%)",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 48,
            padding: "0 64px",
            width: "100%",
          }}
        >
          {poster && (
            <img
              src={poster}
              width={286}
              height={429}
              style={{
                width: 286,
                height: 429,
                objectFit: "cover",
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            />
          )}

          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: ACCENT,
                  color: BG,
                  fontSize: 24,
                }}
              >
                ▶
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 22,
                  letterSpacing: 3,
                  fontWeight: 700,
                  color: TEXT,
                }}
              >
                STREAM
                <span style={{ color: ACCENT }}>SYNX</span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                marginTop: 26,
                fontSize: title.length > 30 ? 54 : 66,
                fontWeight: 700,
                color: TEXT,
                lineHeight: 1.08,
              }}
            >
              {title}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginTop: 18,
                fontSize: 24,
                color: MUTED,
              }}
            >
              {rating && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    color: ACCENT,
                    fontWeight: 600,
                  }}
                >
                  ★ {rating}
                </div>
              )}
              {meta.map((part) => (
                <div key={part} style={{ display: "flex" }}>
                  · {part}
                </div>
              ))}
            </div>

            {overview && (
              <div
                style={{
                  display: "flex",
                  marginTop: 22,
                  fontSize: 23,
                  lineHeight: 1.45,
                  color: MUTED,
                }}
              >
                {overview}
              </div>
            )}

            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                marginTop: 30,
                padding: "13px 24px",
                borderRadius: 999,
                backgroundColor: ACCENT,
                color: BG,
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              Watch free on StreamSynx
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        // Crawlers refetch these constantly; a title's artwork does not change.
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}
