// /components/NavBar.js
import { useState, useEffect, useRef } from "react";
import { FaBars } from "react-icons/fa6";
import { IoClose } from "react-icons/io5";
import { RiAccountCircleFill, RiSearchLine } from "react-icons/ri";
import { useRouter } from "next/router";
import Link from 'next/link';
import SearchModal from './SearchModal';

// Navigation Links Data (assuming this is defined above or imported)
const navLinks = [
  { name: "WatchList", path: "/watchList" },
  { name: "History", path: "/history" },
  { name: "Favorites", path: "/favorites" },
  { name: "Buddies", path: "/buddies" },
  { name: "Recommended", path: "/recommended" },
];

function NavBar() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const sidebarRef = useRef(null);

  const toggleSidebar = () => {
    setIsSidebarOpen((prevState) => !prevState);
  };

  const openSearch = () => setIsSearchOpen(true);
  const closeSearch = () => setIsSearchOpen(false);

  // Effect for closing sidebar on clicking outside or route change (Keep as is)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isSidebarOpen && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
         const menuButton = document.getElementById('mobile-menu-button');
         if (!menuButton || !menuButton.contains(event.target)) {
            toggleSidebar();
         }
      }
    };
    if (isSidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'auto';
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    const handleRouteChange = () => {
      setIsSidebarOpen(false);
    };
    router.events.on('routeChangeStart', handleRouteChange);
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router.events]);

  const renderNavItem = (link, isMobile = false) => (
    <li key={link.path}>
      <Link
        href={link.path}
        className={`cursor-pointer transition-colors duration-200 ease-in-out
                    ${isMobile ? 'text-lg text-gray-200 hover:text-orange-500' : 'text-sm text-gray-300 hover:text-white'}
                    ${router.pathname === link.path ? (isMobile ? 'text-orange-500' : 'text-white font-medium') : ''}`}
        onClick={isMobile ? toggleSidebar : undefined}
      >
        {link.name}
      </Link>
    </li>
  );

  return (
    <>
      {/* NavBar */}
      <div className="w-full fixed top-0 left-0 z-40 font-poppins">
        <nav className="flex justify-between items-center bg-gray-900 bg-opacity-70 backdrop-blur-lg text-white w-full px-4 sm:px-6 lg:px-8 py-3 h-16 transition-all duration-300">

          {/* Left Side: Mobile Menu Button (LG Hidden) + Logo */}
          <div className="flex items-center gap-3"> {/* Increased gap slightly */}
             {/* Mobile Menu Button - MOVED TO LEFT */}
             <button
                id="mobile-menu-button"
                onClick={toggleSidebar}
                className="lg:hidden text-2xl text-gray-300 hover:text-white transition-colors duration-200 ease-in-out" // Show only on small screens
                aria-label="Open menu"
             >
              <FaBars />
            </button>
             {/* Logo */}
            <Link href="/home" className="text-xl font-semibold cursor-pointer hover:text-orange-500 transition-colors duration-200 ease-in-out">
                StreamSynx.
            </Link>
          </div>

          {/* Center: Desktop Menu (Hidden on Small Screens) */}
          <ul className="hidden lg:flex flex-grow justify-center items-center space-x-8">
            {navLinks.map(link => renderNavItem(link, false))}
          </ul>

          {/* Right Side: Search Icon (All Screens) + Profile Icon (LG Only) */}
          <div className="flex items-center gap-4"> {/* Adjusted gap */}
             {/* Search Button (Visible on All sizes) */}
             <button
              onClick={openSearch}
              className="text-gray-300 hover:text-white transition-colors duration-200 ease-in-out p-1"
              aria-label="Open search"
            >
              <RiSearchLine className="text-2xl" />
            </button>
             {/* Profile Icon (Visible LG and up) */}
             <Link href="/profile" aria-label="View profile" className="hidden lg:block text-gray-300 hover:text-white transition-colors duration-200 ease-in-out"> {/* Use hidden lg:block */}
                <RiAccountCircleFill className="text-3xl" />
             </Link>
          </div>
        </nav>
      </div>

      {/* --- Sidebar for Mobile --- */}
      {/* Overlay (No Changes Needed) */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-60 z-40 transition-opacity duration-300 lg:hidden ${
          isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!isSidebarOpen}
      />
      {/* Sidebar Panel (No Changes Needed - Still slides from left) */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 left-0 w-72 h-full bg-gray-900 shadow-lg z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Content (No Changes Needed) */}
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex justify-between items-center p-5 border-b border-gray-700">
             <Link href="/home" className="text-xl font-semibold cursor-pointer text-white" onClick={toggleSidebar}>
                StreamSynx.
             </Link>
            <button onClick={toggleSidebar} className="text-gray-400 hover:text-white transition-colors duration-200 ease-in-out" aria-label="Close menu">
              <IoClose className="text-3xl" />
            </button>
          </div>
          {/* Mobile Menu Links */}
          <ul className="flex flex-col p-5 space-y-5 flex-grow">
            {navLinks.map(link => renderNavItem(link, true))}
          </ul>
          {/* Profile Section */}
           <div className="p-5 border-t border-gray-700">
             <Link href="/profile" className="flex items-center space-x-3 group" onClick={toggleSidebar}>
                <RiAccountCircleFill className="text-4xl text-gray-300 group-hover:text-white transition-colors duration-200 ease-in-out" />
                <span className="text-lg text-gray-200 group-hover:text-white transition-colors duration-200 ease-in-out">Profile</span>
             </Link>
           </div>
        </div>
      </div>
      {/* --- End Sidebar --- */}

      {/* Render the Search Modal (No Changes Needed) */}
      <SearchModal isOpen={isSearchOpen} onClose={closeSearch} />
    </>
  );
}

export default NavBar;