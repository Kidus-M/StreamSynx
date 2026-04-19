// components/NavBar.js
import { useState, useEffect, useRef } from "react";
import { FaBars } from "react-icons/fa6";
import { IoClose } from "react-icons/io5";
import { RiAccountCircleFill, RiSearchLine } from "react-icons/ri";
import { useRouter } from "next/router";
import Link from 'next/link';
import SearchModal from './SearchModal'; // Assuming SearchModal is in the same directory
import { motion, AnimatePresence } from "framer-motion";

// Navigation Links Data - Added "Watch Parties"
const navLinks = [
    { name: "WatchList", path: "/watchList" },
    { name: "History", path: "/history" },
    { name: "Favorites", path: "/favorites" },
    { name: "Buddies", path: "/buddies" },
    { name: "Recommended", path: "/recommended" },
    { name: "Watch Parties", path: "/rooms" }, // <-- Added Room Link Here
];

function NavBar() {
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const sidebarRef = useRef(null);

    const toggleSidebar = () => {
        setIsSidebarOpen((prevState) => !prevState);
    };

    const openSearch = () => setIsSearchOpen(true);
    const closeSearch = () => setIsSearchOpen(false);

    // Detect scroll for navbar background change
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Effect for closing sidebar (Keep as is)
    useEffect(() => {
        const handleClickOutside = (event) => { if (isSidebarOpen && sidebarRef.current && !sidebarRef.current.contains(event.target)) { const menuButton = document.getElementById('mobile-menu-button'); if (!menuButton || !menuButton.contains(event.target)) { toggleSidebar(); } } };
        if (isSidebarOpen) { document.addEventListener('mousedown', handleClickOutside); document.body.style.overflow = 'hidden'; } else { document.body.style.overflow = 'auto'; }
        return () => { document.removeEventListener('mousedown', handleClickOutside); document.body.style.overflow = 'auto'; };
    }, [isSidebarOpen]);

    useEffect(() => { const handleRouteChange = () => { setIsSidebarOpen(false); }; router.events.on('routeChangeStart', handleRouteChange); return () => { router.events.off('routeChangeStart', handleRouteChange); }; }, [router.events]);

    // Render Nav Item with Active State and Themed Colors
    const renderNavItem = (link, isMobile = false) => {
        const isActive = router.pathname === link.path || (link.path === '/rooms' && router.pathname.startsWith('/rooms'));
        return (
            <li key={link.path}>
                <Link
                    href={link.path}
                    className={`relative cursor-pointer transition-all duration-200 ease-in-out
                        ${isMobile
                            ? `text-lg py-1 ${isActive ? 'text-accent font-semibold' : 'text-textprimary hover:text-accent'}`
                            : `text-[13px] font-medium py-1 ${isActive ? 'text-accent' : 'text-textsecondary hover:text-textprimary'}`
                        }`}
                    onClick={isMobile ? toggleSidebar : undefined}
                >
                    {link.name}
                    {/* Active indicator dot for desktop */}
                    {isActive && !isMobile && (
                        <motion.span
                            layoutId="nav-indicator"
                            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent"
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                    )}
                </Link>
            </li>
        );
    };

    return (
        <>
            {/* NavBar */}
            <div className="w-full fixed top-0 left-0 z-40 font-poppins">
                <nav className={`flex justify-between items-center w-full px-4 sm:px-6 lg:px-8 py-3 h-16 transition-all duration-500 ease-out
                    ${scrolled
                        ? 'bg-primary/90 backdrop-blur-xl shadow-lg shadow-black/20 border-b border-white/[0.06]'
                        : 'bg-transparent border-b border-transparent'
                    }`}
                >

                    {/* Left Side: Mobile Menu Button + Logo */}
                    <div className="flex items-center gap-3">
                        {/* Mobile Menu Button */}
                        <button
                            id="mobile-menu-button"
                            onClick={toggleSidebar}
                            className="lg:hidden text-xl text-textsecondary hover:text-textprimary transition-colors duration-200 ease-in-out p-1"
                            aria-label="Open menu"
                        >
                            <FaBars />
                        </button>
                        {/* Logo */}
                        <Link href="/home" className="text-lg font-semibold cursor-pointer text-textprimary hover:text-accent transition-colors duration-200 ease-in-out tracking-tight">
                            Stream<span className="text-accent">Synx</span>
                        </Link>
                    </div>

                    {/* Center: Desktop Menu */}
                    <ul className="hidden lg:flex flex-grow justify-center items-center space-x-7">
                        {navLinks.map(link => renderNavItem(link, false))}
                    </ul>

                    {/* Right Side: Search Icon + Profile Icon */}
                    <div className="flex items-center gap-3">
                        {/* Search Button */}
                        <button
                            onClick={openSearch}
                            className="text-textsecondary hover:text-textprimary transition-all duration-200 ease-in-out p-2 rounded-xl hover:bg-white/[0.06]"
                            aria-label="Open search"
                        >
                            <RiSearchLine className="text-xl" />
                        </button>
                        {/* Profile Icon */}
                        <Link href="/profile" aria-label="View profile" className="hidden lg:flex items-center justify-center text-textsecondary hover:text-textprimary transition-all duration-200 ease-in-out p-1.5 rounded-xl hover:bg-white/[0.06]">
                            <RiAccountCircleFill className="text-2xl" />
                        </Link>
                    </div>
                </nav>
            </div>

            {/* --- Sidebar for Mobile --- */}
            {/* Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
                        aria-hidden={!isSidebarOpen}
                    />
                )}
            </AnimatePresence>
            {/* Sidebar Panel */}
            <div
                ref={sidebarRef}
                className={`fixed top-0 left-0 w-72 h-full bg-secondary/95 backdrop-blur-xl shadow-2xl z-50 transform transition-transform duration-300 ease-in-out lg:hidden border-r border-white/[0.06] ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Sidebar Header */}
                    <div className="flex justify-between items-center p-5 border-b border-white/[0.06]">
                        <Link href="/home" className="text-lg font-semibold cursor-pointer text-textprimary hover:text-accent tracking-tight" onClick={toggleSidebar}>
                            Stream<span className="text-accent">Synx</span>
                        </Link>
                        <button onClick={toggleSidebar} className="text-textsecondary hover:text-textprimary transition-colors duration-200 ease-in-out p-1 rounded-lg hover:bg-white/[0.06]" aria-label="Close menu">
                            <IoClose className="text-2xl" />
                        </button>
                    </div>

                    {/* Mobile Menu Links */}
                    <ul className="flex flex-col p-5 space-y-4 flex-grow">
                        {navLinks.map(link => renderNavItem(link, true))}
                    </ul>

                    {/* Profile Section */}
                    <div className="p-5 border-t border-white/[0.06]">
                        <Link href="/profile" className="flex items-center space-x-3 group p-2 rounded-xl hover:bg-white/[0.06] transition-colors" onClick={toggleSidebar}>
                            <RiAccountCircleFill className="text-3xl text-textsecondary group-hover:text-textprimary transition-colors duration-200 ease-in-out" />
                            <span className="text-base text-textprimary group-hover:text-accent transition-colors duration-200 ease-in-out font-medium">Profile</span>
                        </Link>
                    </div>
                </div>
            </div>
            {/* --- End Sidebar --- */}

            {/* Render the Search Modal */}
            {/* Pass onMediaSelect={null} or don't pass it if SearchModal is only used for navigation from NavBar */}
            <SearchModal isOpen={isSearchOpen} onClose={closeSearch} />
        </>
    );
}

export default NavBar;