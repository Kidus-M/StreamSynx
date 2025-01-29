import { useState } from 'react';
import { FaBars } from "react-icons/fa6";
import { FaSearch } from "react-icons/fa";
import { FaXmark } from "react-icons/fa6";
import { RiAccountCircleFill } from "react-icons/ri";

export default function NavBar() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarOpen((prevState) => !prevState);
    };

    return (
        <>
            <div className="flex flex-wrap">
                <section className="relative mx-auto">
                    <nav className="flex justify-between bg-secondary text-primary w-screen">
                        <div className="px-5 xl:px-12 py-6 flex w-full items-center justify-between">
                            <a className="text-2xl text-primary font-dm-display" href="#">
                                StreamSync.
                            </a>
                            <ul className="max-xl:hidden flex px-4 mx-auto font-semibold font-heading space-x-12">
                                <li><a className="text-sm">Watch Later</a></li>
                                <li><a className="text-sm">Watch History</a></li>
                                <li><a className="text-sm">Favorites</a></li>
                                <li><a className="text-sm">Watch Buddies</a></li>
                            </ul>
                            <div className="flex justify-center items-center space-x-5">
                                <input
                                    type="text"
                                    className='h-8 w-80 rounded-2xl mr-4 outline bg-tertiary pl-7 font-sm' />
                                <FaSearch className="text-xl cursor-pointer hover:text-tertiary" />
                                <RiAccountCircleFill className='text-3xl cursor-pointer hover:text-tertiary' />
                            </div>
                        </div>

                        <a className="navbar-burger flex self-center mr-12 xl:hidden text-primary" href="#" onClick={toggleSidebar}>
                            <FaBars className='text-xl hover:text-tertiary' />
                        </a>
                    </nav>
                </section>
            </div>

            <div className={`fixed top-0 right-0 h-full bg-tertiary text-primary w-1/3 transform ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 ease-in-out`}>
                <ul className="flex flex-col p-4 space-y-8">
                    <li className='flex justify-between items-center'>
                        <a className="text-3xl"><FaXmark className='cursor-pointer hover:text-secondary' onClick={toggleSidebar} /></a>
                    </li>
                    <li><a className="text-md cursor-pointer hover:text-secondary">Home</a></li>
                    <li><a className="text-md cursor-pointer hover:text-secondary">Watch Later</a></li>
                    <li><a className="text-md cursor-pointer hover:text-secondary">Watch History</a></li>
                    <li><a className="text-md cursor-pointer hover:text-secondary">Favorites</a></li>
                    <li><a className="text-md cursor-pointer hover:text-secondary">Watch Buddies</a></li>
                    <li className='bottom-4 fixed flex items-center hover:text-secondary space-x-4'>
                        <a className="text-5xl"><RiAccountCircleFill className=' cursor-pointer' /></a>
                        <a className="text-md cursor-pointer">Profile</a>
                    </li>
                </ul>
            </div>
        </>
    );
}