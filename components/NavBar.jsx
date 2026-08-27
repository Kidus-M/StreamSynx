import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { signOut } from "firebase/auth";
import { AnimatePresence, motion } from "framer-motion";
import { FiSearch, FiMenu, FiX, FiLogOut, FiUser } from "react-icons/fi";
import toast from "react-hot-toast";
import SearchModal from "./SearchModal";
import { auth } from "../firebase";
import { loginHref, useAuth } from "../lib/auth";

const PRIMARY_LINKS = [
  { name: "Home", path: "/" },
  { name: "Watchlist", path: "/watchList", private: true },
  { name: "Watch Parties", path: "/rooms", private: true },
];

const LIBRARY_LINKS = [
  { name: "Continue watching", path: "/history" },
  { name: "Favorites", path: "/favorites" },
  { name: "Recommended", path: "/recommended" },
  { name: "Buddies", path: "/buddies" },
];

const Logo = ({ onClick }) => (
  <Link
    href="/"
    onClick={onClick}
    className="text-[17px] font-semibold tracking-tight text-textprimary transition-colors hover:text-accent"
  >
    Stream<span className="text-accent">Synx</span>
  </Link>
);

function NavBar() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const accountRef = useRef(null);

  const isActive = (path) =>
    path === "/" ? router.pathname === "/" : router.pathname.startsWith(path);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Cmd+K / Ctrl+K opens search from anywhere.
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const close = () => {
      setMenuOpen(false);
      setAccountOpen(false);
    };
    router.events.on("routeChangeStart", close);
    return () => router.events.off("routeChangeStart", close);
  }, [router.events]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success("Signed out");
      router.push("/");
    } catch {
      toast.error("Could not sign out.");
    }
  };

  const displayName = user?.displayName || user?.email?.split("@")[0] || "You";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40">
        <nav
          className={`flex h-16 items-center justify-between gap-4 px-4 transition-all duration-500 ease-out-expo sm:px-6 lg:px-10 ${
            scrolled
              ? "border-b border-white/[0.06] bg-primary/80 backdrop-blur-xl"
              : "border-b border-transparent bg-gradient-to-b from-primary/80 to-transparent"
          }`}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="-ml-1 p-2 text-textsecondary transition-colors hover:text-textprimary lg:hidden"
            >
              <FiMenu size={20} />
            </button>
            <Logo />
          </div>

          <ul className="hidden items-center gap-1 lg:flex">
            {PRIMARY_LINKS.map((link) => (
              <li key={link.path}>
                <Link
                  href={link.private && !user && !loading ? loginHref(link.path) : link.path}
                  className={`relative rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                    isActive(link.path)
                      ? "text-textprimary"
                      : "text-textsecondary hover:text-textprimary"
                  }`}
                >
                  {link.name}
                  {isActive(link.path) && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-3 -bottom-0.5 h-[2px] rounded-full bg-accent"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            {/* Desktop search field (opens the palette) */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2 pl-3 pr-2 text-[13px] text-textsecondary transition-all duration-200 hover:border-white/20 hover:text-textprimary md:flex"
            >
              <FiSearch size={15} />
              <span className="w-28 text-left">Search...</span>
              <kbd className="rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-sans text-[10px] text-textsecondary">
                &#8984;K
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="p-2 text-textsecondary transition-colors hover:text-textprimary md:hidden"
            >
              <FiSearch size={19} />
            </button>

            {loading ? (
              <div className="h-9 w-9 rounded-full bg-white/[0.06]" />
            ) : user ? (
              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  onClick={() => setAccountOpen((open) => !open)}
                  aria-label="Account menu"
                  aria-expanded={accountOpen}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent ring-1 ring-inset ring-accent/25 transition-all hover:bg-accent/25"
                >
                  {initial}
                </button>

                <AnimatePresence>
                  {accountOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                      className="glass-card-elevated absolute right-0 mt-2 w-60 overflow-hidden p-1.5"
                    >
                      <div className="px-3 py-2.5">
                        <p className="truncate text-sm font-medium text-textprimary">{displayName}</p>
                        <p className="truncate text-xs text-textsecondary">{user.email}</p>
                      </div>
                      <div className="my-1 h-px bg-white/[0.06]" />
                      {LIBRARY_LINKS.map((link) => (
                        <Link
                          key={link.path}
                          href={link.path}
                          className="block rounded-lg px-3 py-2 text-[13px] text-textsecondary transition-colors hover:bg-white/[0.06] hover:text-textprimary"
                        >
                          {link.name}
                        </Link>
                      ))}
                      <div className="my-1 h-px bg-white/[0.06]" />
                      <Link
                        href="/profile"
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-textsecondary transition-colors hover:bg-white/[0.06] hover:text-textprimary"
                      >
                        <FiUser size={14} /> Profile
                      </Link>
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-textsecondary transition-colors hover:bg-white/[0.06] hover:text-textprimary"
                      >
                        <FiLogOut size={14} /> Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href={loginHref(router.asPath)}
                  className="hidden rounded-xl px-3 py-2 text-[13px] font-medium text-textsecondary transition-colors hover:text-textprimary sm:block"
                >
                  Sign in
                </Link>
                <Link href="/signup" className="btn-primary px-4 py-2 text-[13px]">
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[82%] max-w-xs flex-col border-r border-white/[0.06] bg-primary-soft lg:hidden"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                <Logo onClick={() => setMenuOpen(false)} />
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className="p-1.5 text-textsecondary transition-colors hover:text-textprimary"
                >
                  <FiX size={20} />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-3 py-4">
                <p className="section-label px-3 pb-2">Browse</p>
                {PRIMARY_LINKS.map((link) => (
                  <Link
                    key={link.path}
                    href={link.private && !user ? loginHref(link.path) : link.path}
                    onClick={() => setMenuOpen(false)}
                    className={`block rounded-xl px-3 py-2.5 text-[15px] transition-colors ${
                      isActive(link.path)
                        ? "bg-white/[0.06] font-medium text-accent"
                        : "text-textprimary hover:bg-white/[0.04]"
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}

                <p className="section-label px-3 pb-2 pt-5">Your library</p>
                {LIBRARY_LINKS.map((link) => (
                  <Link
                    key={link.path}
                    href={user ? link.path : loginHref(link.path)}
                    onClick={() => setMenuOpen(false)}
                    className={`block rounded-xl px-3 py-2.5 text-[15px] transition-colors ${
                      isActive(link.path)
                        ? "bg-white/[0.06] font-medium text-accent"
                        : "text-textprimary hover:bg-white/[0.04]"
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
              </nav>

              <div className="border-t border-white/[0.06] p-4">
                {user ? (
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent">
                      {initial}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href="/profile"
                        onClick={() => setMenuOpen(false)}
                        className="block truncate text-sm font-medium text-textprimary"
                      >
                        {displayName}
                      </Link>
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="text-xs text-textsecondary transition-colors hover:text-accent"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Link
                      href={loginHref(router.asPath)}
                      onClick={() => setMenuOpen(false)}
                      className="btn-ghost flex-1"
                    >
                      Sign in
                    </Link>
                    <Link href="/signup" onClick={() => setMenuOpen(false)} className="btn-primary flex-1">
                      Sign up
                    </Link>
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

export default NavBar;
