import { useState } from 'react';
import { FaBars, FaXmark } from "react-icons/fa6";
import { RiAccountCircleFill } from "react-icons/ri";

export default function NavBar() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarOpen((prevState) => !prevState);
    };

    return (
        <>
            <div className="w-full">
                <nav className="flex justify-between items-center bg-secondary text-primary w-full px-5 py-4">
                    {/* Logo */}
                    <a className="text-2xl font-dm-display" href="#">
                        StreamSync.
                    </a>

                    {/* Desktop Menu */}
                    <ul className="hidden xl:flex space-x-20 font-semibold">
                        <li><a href="#" className="text-sm cursor-pointer hover:text-tertiary">WatchList</a></li>
                        <li><a href="#" className="text-sm cursor-pointer hover:text-tertiary">History</a></li>
                        <li><a href="#" className="text-sm cursor-pointer hover:text-tertiary">Favorites</a></li>
                        <li><a href="#" className="text-sm cursor-pointer hover:text-tertiary">Buddies</a></li>
                    </ul>

                    {/* Profile Icon */}
                    <div className="hidden xl:flex items-center">
                        <RiAccountCircleFill className="text-3xl cursor-pointer hover:text-tertiary" />
                    </div>

                    {/* Mobile Menu Button */}
                    <button className="xl:hidden text-2xl" onClick={toggleSidebar}>
                        <FaBars />
                    </button>
                </nav>
            </div>

            {/* Sidebar for Mobile */}
            <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 transform ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300`}>
                <div className="w-4/5 sm:w-2/3 md:w-1/3 h-full bg-tertiary p-6 shadow-lg">
                    {/* Close Button */}
                    <div className="flex justify-end">
                        <button onClick={toggleSidebar}>
                            <FaXmark className="text-3xl cursor-pointer hover:text-secondary" />
                        </button>
                    </div>

                    {/* Mobile Menu */}
                    <ul className="flex flex-col mt-10 space-y-6">
                        <li><a href="#" className="text-lg cursor-pointer hover:text-secondary">Home</a></li>
                        <li><a href="#" className="text-lg cursor-pointer hover:text-secondary">Watch Later</a></li>
                        <li><a href="#" className="text-lg cursor-pointer hover:text-secondary">Watch History</a></li>
                        <li><a href="#" className="text-lg cursor-pointer hover:text-secondary">Favorites</a></li>
                        <li><a href="#" className="text-lg cursor-pointer hover:text-secondary">Watch Buddies</a></li>
                    </ul>

                    {/* Profile Section */}
                    <div className="absolute bottom-6 left-6 flex items-center space-x-4 hover:text-secondary cursor-pointer">
                        <RiAccountCircleFill className="text-5xl" />
                        <a href="#" className="text-lg">Profile</a>
                    </div>
                </div>
            </div>
        </>
    );
}
