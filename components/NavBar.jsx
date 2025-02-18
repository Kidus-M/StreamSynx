import { useState, useEffect } from "react";
import { FaBars, FaXmark } from "react-icons/fa6";
import { RiAccountCircleFill } from "react-icons/ri";
import { RiSearchLine } from "react-icons/ri";
import { useRouter } from "next/router";

export default function NavBar() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchBarOpen, setIsSearchBarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleSidebar = () => {
    setIsSidebarOpen((prevState) => !prevState);
  };

  const toggleSearchBar = () => {
    setIsSearchBarOpen((prevState) => !prevState);
    setSearchQuery(""); // Clear search query when toggling
  };

  const handleSearch = (e) => {
    e.preventDefault(); // Prevent default form submission
    if (searchQuery.trim()) {
      router.push(`/search?query=${searchQuery}`);
      setIsSearchBarOpen(false); // Close search bar after search
    }
  };

  // Close search bar when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        isSearchBarOpen &&
        !e.target.closest(".search-bar") &&
        !e.target.closest(".search-icon")
      ) {
        setIsSearchBarOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSearchBarOpen]);

  return (
    <>
      {/* Navbar */}
      <div className="w-full fixed top-0 left-0 z-50">
        <nav className="flex justify-between items-center bg-black bg-opacity-30 backdrop-blur-md text-white w-full px-5 py-6 h-20">
          {/* Logo */}
          <button
            className="text-2xl font-dm-display cursor-pointer"
            onClick={() => router.push(`/home`)}
          >
            StreamSync.
          </button>

          {/* Desktop Menu */}
          <ul className="hidden xl:flex space-x-20 font-semibold">
            <li>
              <button
                onClick={() => router.push(`/watchlist`)}
                className="text-sm cursor-pointer hover:text-orange-500 transition-colors"
              >
                WatchList
              </button>
            </li>
            <li>
              <button
                onClick={() => router.push(`/history`)}
                className="text-sm cursor-pointer hover:text-orange-500 transition-colors"
              >
                History
              </button>
            </li>
            <li>
              <button
                onClick={() => router.push(`/favorites`)}
                className="text-sm cursor-pointer hover:text-orange-500 transition-colors"
              >
                Favorites
              </button>
            </li>
            <li>
              <button
                onClick={() => router.push(`/buddies`)}
                className="text-sm cursor-pointer hover:text-orange-500 transition-colors"
              >
                Buddies
              </button>
            </li>
          </ul>

          {/* Profile and Search Icon */}
          <div className="hidden xl:flex items-center gap-4">
            <button
              className="rounded-md p-1 bg-white hover:bg-orange-500 cursor-pointer search-icon transition-colors"
              onClick={toggleSearchBar}
            >
              <RiSearchLine className="text-black text-xl" />
            </button>
            <button
              onClick={() => router.push(`/profile`)}
              className="text-3xl cursor-pointer hover:text-orange-500 transition-colors"
            >
              <RiAccountCircleFill />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button className="xl:hidden text-2xl flex justify-between items-center gap-4">
            <button
              className="rounded-md p-1 bg-white hover:bg-orange-500 cursor-pointer search-icon transition-colors"
              onClick={toggleSearchBar}
            >
              <RiSearchLine className="text-black text-xl" />
            </button>
            <FaBars onClick={toggleSidebar} className="hover:text-orange-500 transition-colors" />
          </button>
        </nav>
      </div>

      {/* Sidebar for Mobile */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-50 transform ${
          isSidebarOpen ? "translate-x-0" : "translate-x-full"
        } transition-transform duration-300`}
      >
        <div className="w-64 h-full bg-gray-900 p-6 shadow-lg">
          {/* Close Button */}
          <div className="flex justify-end">
            <button onClick={toggleSidebar}>
              <FaXmark className="text-3xl cursor-pointer hover:text-orange-500 transition-colors" />
            </button>
          </div>

          {/* Mobile Menu */}
          <ul className="flex flex-col mt-10 space-y-6">
            <li>
              <button
                onClick={() => router.push(`/home`)}
                className="text-lg text-white cursor-pointer hover:text-orange-500 transition-colors"
              >
                Home
              </button>
            </li>
            <li>
              <button
                onClick={() => router.push(`/watchlist`)}
                className="text-lg text-white cursor-pointer hover:text-orange-500 transition-colors"
              >
                Watch Later
              </button>
            </li>
            <li>
              <button
                onClick={() => router.push(`/history`)}
                className="text-lg text-white cursor-pointer hover:text-orange-500 transition-colors"
              >
                Watch History
              </button>
            </li>
            <li>
              <button
                onClick={() => router.push(`/favorites`)}
                className="text-lg text-white cursor-pointer hover:text-orange-500 transition-colors"
              >
                Favorites
              </button>
            </li>
            <li>
              <button
                onClick={() => router.push(`/buddies`)}
                className="text-lg text-white cursor-pointer hover:text-orange-500 transition-colors"
              >
                Watch Buddies
              </button>
            </li>
          </ul>

          {/* Profile Section */}
          <div className="absolute bottom-6 left-6 flex items-center space-x-4 hover:text-orange-500 cursor-pointer transition-colors">
            <button
              onClick={() => router.push(`/profile`)}
              className="flex items-center space-x-2"
            >
              <RiAccountCircleFill className="text-5xl text-white" />
              <span className="text-lg text-white">Profile</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div
        className={`fixed top-0 left-0 w-full bg-gray-900 bg-opacity-95 backdrop-blur-md z-40 transform ${
          isSearchBarOpen ? "translate-y-0" : "-translate-y-full"
        } transition-transform duration-300 search-bar`}
      >
        <div className="flex justify-between items-center w-full px-6 py-4 gap-2">
          <form onSubmit={handleSearch} className="w-full flex gap-2">
            <input
              type="text"
              className="w-full text-md h-10 pl-4 shadow-lg rounded-md text-white bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Search for movies or TV shows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              className="h-10 px-4 rounded-md bg-orange-500 hover:bg-orange-600 text-white transition-all duration-300 cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>
      </div>
    </>
  );
}