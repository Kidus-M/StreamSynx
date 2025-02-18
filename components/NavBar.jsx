import { useState, useEffect } from "react";
import { FaBars, FaXmark } from "react-icons/fa6";
import { RiAccountCircleFill } from "react-icons/ri";
import { RiSearchLine } from "react-icons/ri";
import { useRouter } from "next/router";
// import SearchBar from "./SearchQuery";
useEffect(() => {
  const delayDebounce = setTimeout(() => {
    if (searchQuery.trim() !== "") {
        setSearchQuery(e.target.value);
      handleSearch();
    }
  }, 500); // Delay search execution

  return () => clearTimeout(delayDebounce); // Cleanup on re-render
}, [searchQuery]);
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
  };

  const handleSearch = () => {
    router.push(`/search?query=${searchQuery}`);
  };

  return (
    <>
      <div className="w-full">
        <nav className="flex justify-between items-center bg-secondary opacity-30 text-primary w-full px-5 py-4">
          {/* Logo */}
          <a
            className="text-2xl font-dm-display cursor-pointer"
            onClick={() => {
              router.push(`/home`);
            }}
          >
            StreamSync.
          </a>

          {/* Desktop Menu */}
          <ul className="hidden xl:flex space-x-20 font-semibold">
            <li>
              <a
                href="#"
                className="text-sm cursor-pointer hover:text-tertiary"
              >
                WatchList
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-sm cursor-pointer hover:text-tertiary"
              >
                History
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-sm cursor-pointer hover:text-tertiary"
              >
                Favorites
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-sm cursor-pointer hover:text-tertiary"
              >
                Buddies
              </a>
            </li>
          </ul>

          {/* Profile and Search Icon */}
          <div className="hidden xl:flex items-center gap-4">
            <div className="rounded-md p-1 bg-primary hover:bg-tertiary">
              <RiSearchLine
                className="text-secondary text-xl cursor-pointer"
                onClick={toggleSearchBar}
              />
            </div>
            <RiAccountCircleFill className="text-3xl cursor-pointer hover:text-tertiary" />
          </div>

          {/* Mobile Menu Button */}
          <button className="xl:hidden text-2xl flex justify-between items-center gap-4">
            <div className="rounded-md p-1 bg-primary hover:bg-tertiary">
              <RiSearchLine
                className="text-secondary text-xl cursor-pointer"
                onClick={toggleSearchBar}
              />
            </div>
            <FaBars onClick={toggleSidebar} />
          </button>
        </nav>
      </div>

      {/* Sidebar for Mobile */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-50 transform ${
          isSidebarOpen ? "translate-x-0" : "translate-x-full"
        } transition-transform duration-300`}
      >
        <div className="w-64 h-full bg-primary p-6 shadow-lg">
          {/* Close Button */}
          <div className="flex justify-end">
            <button onClick={toggleSidebar}>
              <FaXmark className="text-3xl cursor-pointer hover:text-secondary" />
            </button>
          </div>

          {/* Mobile Menu */}
          <ul className="flex flex-col mt-10 space-y-6">
            <li>
              <a
                href="#"
                className="text-lg text-secondary cursor-pointer hover:text-tertiary"
              >
                Home
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-lg text-secondary cursor-pointer hover:text-tertiary"
              >
                Watch Later
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-lg text-secondary cursor-pointer hover:text-tertiary"
              >
                Watch History
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-lg text-secondary cursor-pointer hover:text-tertiary"
              >
                Favorites
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-lg text-secondary cursor-pointer hover:text-tertiary"
              >
                Watch Buddies
              </a>
            </li>
          </ul>

          {/* Profile Section */}
          <div className="absolute bottom-6 left-6 flex items-center space-x-4 hover:text-secondary cursor-pointer">
            <RiAccountCircleFill className="text-5xl text-secondary" />
            <a href="#" className="text-lg text-secondary">
              Profile
            </a>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div
        className={`w-full bg-tertiary ${
          isSearchBarOpen ? "flex" : "hidden"
        } transition-all duration-300`}
      >
        <div className="flex justify-between items-center w-full px-6 py-3 gap-2">
          <input
            type="text"
            className="w-full text-md h-8 pl-4 shadow-lg rounded-md text-primary"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            className="h-8 px-4 rounded-md bg-secondary hover:bg-primary text-primary hover:text-secondary transition-all duration-300 cursor-pointer"
            onClick={handleSearch}
          >
            Search
          </button>
        </div>
      </div>
    </>
  );
}
