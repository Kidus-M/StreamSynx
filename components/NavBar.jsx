// /components/NavBar.js
import { useState, useEffect, useRef } from "react";
import { FaBars } from "react-icons/fa6";
import { IoClose } from "react-icons/io5";
import { RiAccountCircleFill, RiSearchLine } from "react-icons/ri";
import { useRouter } from "next/router";
import Link from 'next/link';
import SearchModal from './SearchModal'; // Assuming SearchModal is in the same directory

// Navigation Links Data
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

  // Effect for closing sidebar (Keep as is)
  useEffect(() => {
    const handleClickOutside = (event) => { if (isSidebarOpen && sidebarRef.current && !sidebarRef.current.contains(event.target)) { const menuButton = document.getElementById('mobile-menu-button'); if (!menuButton || !menuButton.contains(event.target)) { toggleSidebar(); } } };
    if (isSidebarOpen) { document.addEventListener('mousedown', handleClickOutside); document.body.style.overflow = 'hidden'; } else { document.body.style.overflow = 'auto'; }
    return () => { document.removeEventListener('mousedown', handleClickOutside); document.body.style.overflow = 'auto'; };
  }, [isSidebarOpen]);
  useEffect(() => { const handleRouteChange = () => { setIsSidebarOpen(false); }; router.events.on('routeChangeStart', handleRouteChange); return () => { router.events.off('routeChangeStart', handleRouteChange); }; }, [router.events]);

  // Render Nav Item with Active State and Themed Colors
  const renderNavItem = (link, isMobile = false) => {
    const isActive = router.pathname === link.path;
    return (
      <li key={link.path}>
        <Link
          href={link.path}
          className={`cursor-pointer transition-colors duration-200 ease-in-out
                    ${isMobile
                      ? `text-lg ${isActive ? 'text-accent font-semibold' : 'text-textprimary hover:text-accent'}`
                      : `text-sm ${isActive ? 'text-accent font-semibold' : 'text-textsecondary hover:text-textprimary'}`
                    }`}
          onClick={isMobile ? toggleSidebar : undefined}
        >
          {link.name}
        </Link>
      </li>
    );
  };

  return (
    <>
      {/* NavBar */}
      <div className="w-full fixed top-0 left-0 z-40 font-poppins">
        {/* Updated background, text colors */}
        <nav className="flex justify-between items-center bg-primary/80 backdrop-blur-lg text-textprimary w-full px-4 sm:px-6 lg:px-8 py-3 h-16 transition-all duration-300 shadow-md border-b border-secondary-light/50">

          {/* Left Side: Mobile Menu Button + Logo */}
          <div className="flex items-center gap-3">
             {/* Mobile Menu Button */}
             <button
                id="mobile-menu-button"
                onClick={toggleSidebar}
                className="lg:hidden text-2xl text-textsecondary hover:text-textprimary transition-colors duration-200 ease-in-out" // Themed icon color
                aria-label="Open menu"
             >
              <FaBars />
            </button>
             {/* Logo */}
            <Link href="/home" className="text-xl font-semibold cursor-pointer text-textprimary hover:text-accent transition-colors duration-200 ease-in-out"> {/* Themed logo color + hover */}
                StreamSynx.
            </Link>
          </div>

          {/* Center: Desktop Menu */}
          <ul className="hidden lg:flex flex-grow justify-center items-center space-x-8">
            {navLinks.map(link => renderNavItem(link, false))}
          </ul>

          {/* Right Side: Search Icon + Profile Icon */}
          <div className="flex items-center gap-4"> {/* Adjusted gap */}
             {/* Search Button */}
             <button
              onClick={openSearch}
              className="text-textsecondary hover:text-textprimary transition-colors duration-200 ease-in-out p-1" // Themed icon color + hover
              aria-label="Open search"
            >
              <RiSearchLine className="text-2xl" />
            </button>
             {/* Profile Icon */}
             <Link href="/profile" aria-label="View profile" className="hidden lg:block text-textsecondary hover:text-textprimary transition-colors duration-200 ease-in-out"> {/* Themed icon color + hover */}
                <RiAccountCircleFill className="text-3xl" />
             </Link>
          </div>
        </nav>
      </div>

      {/* --- Sidebar for Mobile --- */}
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-70 z-40 transition-opacity duration-300 lg:hidden ${ // Darker overlay
          isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!isSidebarOpen}
      />
      {/* Sidebar Panel */}
      <div
        ref={sidebarRef}
        // Updated background color
        className={`fixed top-0 left-0 w-72 h-full bg-secondary shadow-xl z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          {/* Updated border color */}
          <div className="flex justify-between items-center p-5 border-b border-secondary-light">
             <Link href="/home" className="text-xl font-semibold cursor-pointer text-textprimary hover:text-accent" onClick={toggleSidebar}> {/* Themed logo */}
                StreamSynx.
             </Link>
            <button onClick={toggleSidebar} className="text-textsecondary hover:text-textprimary transition-colors duration-200 ease-in-out" aria-label="Close menu"> {/* Themed close icon */}
              <IoClose className="text-3xl" />
            </button>
          </div>

          {/* Mobile Menu Links */}
          <ul className="flex flex-col p-5 space-y-5 flex-grow">
            {navLinks.map(link => renderNavItem(link, true))}
          </ul>

          {/* Profile Section */}
          {/* Updated border and text colors */}
           <div className="p-5 border-t border-secondary-light">
             <Link href="/profile" className="flex items-center space-x-3 group" onClick={toggleSidebar}>
                <RiAccountCircleFill className="text-4xl text-textsecondary group-hover:text-textprimary transition-colors duration-200 ease-in-out" />
                <span className="text-lg text-textprimary group-hover:text-accent transition-colors duration-200 ease-in-out">Profile</span>
             </Link>
           </div>
        </div>
      </div>
      {/* --- End Sidebar --- */}

      {/* Render the Search Modal */}
      <SearchModal isOpen={isSearchOpen} onClose={closeSearch} />
    </>
  );
}

export default NavBar;