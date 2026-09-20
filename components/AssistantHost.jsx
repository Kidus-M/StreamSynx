/**
 * components/AssistantHost.jsx — the floating "what should I watch" pane.
 *
 * A launcher sits in the bottom-right corner on every page that is not a task
 * (login, a watch party). Opening it slides up a chat pane: type a mood, get
 * three to five picks that are one click from playing. Guests see the pane
 * too, but with a sign-in gate — the assistant needs an account, because it
 * reasons over that account's history.
 *
 * All data work lives in lib/assistant.js; this component holds the thread,
 * the input, and the drawing.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { AnimatePresence, motion } from "framer-motion";
import { FiArrowUp, FiPlay, FiRefreshCw, FiSearch, FiX } from "react-icons/fi";
import { FaCheck, FaPlus, FaStar } from "react-icons/fa";
import { HiOutlineSparkles } from "react-icons/hi2";
import toast from "react-hot-toast";
import { loginHref, useAuth } from "../lib/auth";
import {
  ASSISTANT_NAME,
  ASSISTANT_PROMPTS,
  ASSISTANT_TAGLINE,
  askAssistant,
  buildViewerContext,
  clearConversation,
  loadConversation,
  saveConversation,
} from "../lib/assistant";
import { posterUrl, watchHref } from "../lib/tmdb";
import { useWatchlist } from "../lib/watchlist";

/** Routes where a floating pane would sit on top of something that matters. */
const QUIET_ROUTES = ["/login", "/signup", "/rooms/[roomId]", "/open", "/download", "/404"];

const isQuiet = (pathname) =>
  !pathname || QUIET_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

/** The viewer picture is rebuilt at most this often within one open pane. */
const CONTEXT_TTL_MS = 3 * 60 * 1000;

const Avatar = ({ className = "" }) => (
  <span
    className={`flex shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent ring-1 ring-inset ring-accent/25 ${className}`}
  >
    <HiOutlineSparkles className="h-[55%] w-[55%]" />
  </span>
);

const PickCard = ({ pick, onOpen }) => {
  const { isSaved, toggle } = useWatchlist();
  const media = { id: pick.id, media_type: pick.media_type, title: pick.title, poster_path: pick.poster_path };
  const saved = isSaved(media);
  const poster = posterUrl(pick.poster_path);
  // A title TMDB could not match still gets a click: straight into search.
  const resolved = Boolean(pick.id);
  const href = resolved
    ? watchHref(media)
    : `/search?q=${encodeURIComponent(pick.title)}&type=${pick.media_type === "tv" ? "tv" : "movie"}`;

  return (
    <div className="flex gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-2.5 transition-colors hover:border-white/[0.12]">
      <Link
        href={href}
        onClick={onOpen}
        className="relative h-[84px] w-14 shrink-0 overflow-hidden rounded-lg bg-secondary"
        aria-label={`Play ${pick.title}`}
      >
        {poster ? (
          <img src={poster} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center px-1 text-center text-[10px] text-textsecondary">
            {pick.title}
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold leading-snug text-textprimary">{pick.title}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-textsecondary">
            <span>{pick.media_type === "tv" ? "Series" : "Film"}</span>
            {pick.year && (
              <>
                <span className="h-0.5 w-0.5 rounded-full bg-textsecondary/50" />
                <span>{pick.year}</span>
              </>
            )}
            {pick.vote_average > 0 && (
              <>
                <span className="h-0.5 w-0.5 rounded-full bg-textsecondary/50" />
                <span className="inline-flex items-center gap-1">
                  <FaStar className="h-2.5 w-2.5 text-accent" />
                  {Number(pick.vote_average).toFixed(1)}
                </span>
              </>
            )}
          </p>
        </div>
        {pick.why && (
          <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-textsecondary">{pick.why}</p>
        )}
        <div className="mt-auto flex items-center gap-1.5 pt-2">
          <Link
            href={href}
            onClick={onOpen}
            className={`${resolved ? "btn-primary" : "btn-ghost"} h-8 flex-1 px-3 py-0 text-[12px]`}
          >
            {resolved ? <FiPlay className="h-3 w-3" /> : <FiSearch className="h-3 w-3" />}
            {resolved ? "Play" : "Find it"}
          </Link>
          <button
            type="button"
            disabled={!resolved}
            onClick={() => toggle(media)}
            aria-label={saved ? "Remove from watchlist" : "Add to watchlist"}
            title={saved ? "Remove from watchlist" : "Add to watchlist"}
            className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-colors ${
              saved
                ? "border-accent/40 bg-accent/15 text-accent"
                : "border-white/[0.08] bg-white/[0.04] text-textsecondary hover:text-textprimary disabled:opacity-40"
            }`}
          >
            {saved ? <FaCheck size={10} /> : <FaPlus size={10} />}
          </button>
        </div>
      </div>
    </div>
  );
};

const Bubble = ({ message, onOpen }) => {
  const mine = message.role === "user";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[92%] ${mine ? "" : "flex gap-2.5"}`}>
        {!mine && <Avatar className="mt-0.5 h-7 w-7" />}
        <div className="min-w-0 flex-1">
          <div
            className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
              mine
                ? "rounded-br-md bg-accent text-primary"
                : "rounded-bl-md bg-white/[0.06] text-textprimary"
            }`}
          >
            {message.content}
          </div>
          {message.picks?.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.picks.map((pick) => (
                <PickCard key={`${pick.media_type}-${pick.id}`} pick={pick} onOpen={onOpen} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Thinking = () => (
  <div className="flex gap-2.5">
    <Avatar className="mt-0.5 h-7 w-7" />
    <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white/[0.06] px-3.5 py-3">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-textsecondary"
          style={{ animationDelay: `${index * 160}ms` }}
        />
      ))}
    </div>
  </div>
);

const GuestGate = ({ asPath }) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
    <Avatar className="h-12 w-12" />
    <h3 className="text-[15px] font-semibold text-textprimary">Sign in to talk to {ASSISTANT_NAME}</h3>
    <p className="max-w-[260px] text-[13px] leading-relaxed text-textsecondary">
      {ASSISTANT_NAME} picks from what you've watched, saved and finished — so it needs an account to
      go on.
    </p>
    <div className="mt-2 flex gap-2">
      <Link href={loginHref(asPath)} className="btn-primary px-4 py-2 text-[13px]">
        Sign in
      </Link>
      <Link href="/signup" className="btn-ghost px-4 py-2 text-[13px]">
        Create account
      </Link>
    </div>
  </div>
);

export default function AssistantHost() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [threadLoaded, setThreadLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  const context = useRef({ uid: null, at: 0, value: null });
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const uid = user?.uid || null;

  const hidden = isQuiet(router.pathname);

  // A new account (or signing out) means a new thread.
  useEffect(() => {
    setMessages([]);
    setThreadLoaded(false);
    context.current = { uid: null, at: 0, value: null };
  }, [uid]);

  // Pull the stored conversation the first time the pane opens for this user.
  useEffect(() => {
    if (!open || !uid || threadLoaded) return undefined;
    let active = true;
    loadConversation(uid).then((thread) => {
      if (!active) return;
      setMessages(thread);
      setThreadLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [open, uid, threadLoaded]);

  // Navigating away — to play a pick, usually — closes the pane.
  useEffect(() => {
    const close = () => setOpen(false);
    router.events.on("routeChangeStart", close);
    return () => router.events.off("routeChangeStart", close);
  }, [router.events]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // The pane is a full sheet on phones; keep the page behind it still.
  useEffect(() => {
    if (!open) return undefined;
    const mobile = window.matchMedia("(max-width: 639px)").matches;
    if (!mobile) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (open && uid) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open, uid]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [messages, thinking, open]);

  const getContext = useCallback(async () => {
    const cached = context.current;
    if (cached.uid === uid && cached.value && Date.now() - cached.at < CONTEXT_TTL_MS) {
      return cached.value;
    }
    const value = await buildViewerContext(uid);
    context.current = { uid, at: Date.now(), value };
    return value;
  }, [uid]);

  const send = useCallback(
    async (text) => {
      const content = (text ?? input).trim();
      if (!content || thinking || !user) return;

      const outgoing = { role: "user", content, at: new Date().toISOString() };
      const thread = [...messages, outgoing];
      setMessages(thread);
      setInput("");
      setThinking(true);

      try {
        const viewer = await getContext();
        const answer = await askAssistant({ user, messages: thread, context: viewer });
        const incoming = {
          role: "assistant",
          content: answer.reply,
          picks: answer.picks || [],
          at: new Date().toISOString(),
        };
        const next = [...thread, incoming];
        setMessages(next);
        saveConversation(user.uid, next);
      } catch (error) {
        console.error("Assistant error:", error);
        toast.error(error.message || "The assistant is unavailable right now.");
        // Put the text back so a retry is one keypress away.
        setMessages(messages);
        setInput(content);
      } finally {
        setThinking(false);
      }
    },
    [input, thinking, user, messages, getContext]
  );

  const reset = useCallback(async () => {
    if (!uid) return;
    setMessages([]);
    await clearConversation(uid);
    toast.success("Started fresh");
  }, [uid]);

  const onKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  const empty = useMemo(() => threadLoaded && messages.length === 0, [threadLoaded, messages.length]);

  if (hidden || authLoading) return null;

  return (
    <>
      {/* Launcher */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="launcher"
            type="button"
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => setOpen(true)}
            aria-label={`Ask ${ASSISTANT_NAME} what to watch`}
            className="glass-card-elevated fixed bottom-4 right-4 z-[46] flex h-12 items-center gap-2 rounded-full pl-2 pr-2 text-[13px] font-semibold text-textprimary transition-colors hover:border-accent/40 sm:bottom-5 sm:right-5 sm:pr-4"
          >
            <Avatar className="h-8 w-8" />
            <span className="hidden sm:inline">Ask {ASSISTANT_NAME}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Pane */}
      <AnimatePresence>
        {open && (
          <motion.section
            key="pane"
            role="dialog"
            aria-label={`${ASSISTANT_NAME} — what to watch`}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[60] flex flex-col bg-primary-soft sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(660px,calc(100vh-6rem))] sm:w-[400px] sm:rounded-2xl sm:border sm:border-white/[0.08] sm:bg-secondary/90 sm:shadow-lift sm:backdrop-blur-xl"
          >
            {/* Header */}
            <header className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
              <Avatar className="h-9 w-9" />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold leading-tight text-textprimary">{ASSISTANT_NAME}</p>
                <p className="truncate text-[11px] text-textsecondary">
                  {thinking ? "Thinking…" : "Picks from your history"}
                </p>
              </div>
              {uid && messages.length > 0 && (
                <button
                  type="button"
                  onClick={reset}
                  title="Start a new conversation"
                  aria-label="Start a new conversation"
                  className="p-2 text-textsecondary transition-colors hover:text-textprimary"
                >
                  <FiRefreshCw size={15} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="-mr-1 p-2 text-textsecondary transition-colors hover:text-textprimary"
              >
                <FiX size={18} />
              </button>
            </header>

            {!uid ? (
              <GuestGate asPath={router.asPath} />
            ) : (
              <>
                {/* Thread */}
                <div ref={listRef} className="custom-scrollbar flex-1 space-y-4 overflow-y-auto px-4 py-4">
                  {!threadLoaded && (
                    <div className="space-y-3">
                      <div className="skeleton h-12 w-3/4 rounded-2xl" />
                      <div className="skeleton ml-auto h-9 w-1/2 rounded-2xl" />
                    </div>
                  )}

                  {empty && (
                    <div className="flex flex-col items-center gap-3 px-2 pt-6 text-center">
                      <Avatar className="h-12 w-12" />
                      <div>
                        <p className="text-[15px] font-semibold text-textprimary">Hey, I'm {ASSISTANT_NAME}.</p>
                        <p className="mt-1 max-w-[280px] text-[13px] leading-relaxed text-textsecondary">
                          {ASSISTANT_TAGLINE} I look at what you've watched, saved and actually finished.
                        </p>
                      </div>
                      <div className="mt-2 flex flex-wrap justify-center gap-2">
                        {ASSISTANT_PROMPTS.map((prompt) => (
                          <button key={prompt} type="button" onClick={() => send(prompt)} className="chip">
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((message, index) => (
                    <Bubble key={`${message.at}-${index}`} message={message} onOpen={() => setOpen(false)} />
                  ))}

                  {thinking && <Thinking />}
                </div>

                {/* Composer */}
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    send();
                  }}
                  className="border-t border-white/[0.06] p-3"
                >
                  <div className="flex items-end gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-1.5 pl-3.5 transition-colors focus-within:border-accent/50">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={onKeyDown}
                      rows={1}
                      maxLength={1000}
                      placeholder={`Ask ${ASSISTANT_NAME} what to watch…`}
                      aria-label="Your message"
                      className="custom-scrollbar max-h-28 min-h-[36px] flex-1 resize-none bg-transparent py-2 text-[13.5px] text-textprimary placeholder-textsecondary/70 focus:outline-none"
                      style={{ height: "auto" }}
                      onInput={(event) => {
                        event.target.style.height = "auto";
                        event.target.style.height = `${Math.min(event.target.scrollHeight, 112)}px`;
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || thinking}
                      aria-label="Send"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-primary transition-all hover:bg-accent-hover disabled:opacity-40"
                    >
                      <FiArrowUp size={16} />
                    </button>
                  </div>
                  <p className="mt-2 px-1 text-center text-[10.5px] text-textsecondary/60">
                    {ASSISTANT_NAME} can be wrong about details. Picks open right here on StreamSynx.
                  </p>
                </form>
              </>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
