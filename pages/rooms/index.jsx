// pages/rooms/index.jsx
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db, auth } from '../../firebase'; // Adjust path
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth'; // Import standard Firebase auth listener
import NavBar from '../../components/NavBar'; // Adjust path
import Footer from '../../components/Footer'; // Adjust path
import CreateRoomModal from '../../components/CreateRoomModal'; // Adjust path
import { Mosaic } from 'react-loading-indicators';
import { FaPlus, FaUsers, FaClock } from 'react-icons/fa'; // Icons
import TimeAgo from 'react-timeago'; // For displaying time nicely
import toast, { Toaster } from 'react-hot-toast'; // Make sure Toaster is imported if toast is used

const RoomsPage = () => {
    // State for Firebase user and auth loading status
    const [currentUser, setCurrentUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true); // Start loading until auth state is determined

    const [rooms, setRooms] = useState([]);
    const [loadingRooms, setLoadingRooms] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Effect to listen for Firebase auth state changes
    useEffect(() => {
        setAuthLoading(true); // Indicate loading
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user); // Set the user object (null if not logged in)
            setAuthLoading(false); // Auth state determined, stop loading
        });

        // Cleanup listener on component unmount
        return () => unsubscribe();
    }, []); // Empty dependency array ensures this runs only once on mount

    // Effect to fetch rooms (remains the same)
    useEffect(() => {
        setLoadingRooms(true);
        const roomsCollectionRef = collection(db, 'rooms');
        const q = query(roomsCollectionRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const roomsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // Ensure createdAt is a Date object for TimeAgo if needed, Firestore Timestamps might need .toDate()
                createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : null
            }));
            setRooms(roomsData);
            setLoadingRooms(false);
        }, (error) => {
            console.error("Error fetching rooms:", error);
            toast.error("Could not load rooms."); // Make sure toast is configured (e.g., with <Toaster />)
            setLoadingRooms(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    const openModal = () => {
        // Use the currentUser state variable now
        if (!currentUser) {
            toast.error("Please log in to create a room.");
            // Optionally redirect to login: router.push('/login');
            return;
        }
        setIsModalOpen(true);
    };
    const closeModal = () => setIsModalOpen(false);

    return (
        <div className="min-h-screen bg-primary text-textprimary flex flex-col font-poppins">
            {/* Add Toaster for toast notifications to appear */}
            <Toaster position="bottom-center" toastOptions={{ className: 'bg-secondary text-textprimary',}} />
            <NavBar />
            <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8 mt-16 space-y-6 md:space-y-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold text-textprimary">Watch Party Rooms</h1>
                    <button
                        onClick={openModal}
                        className="bg-accent hover:bg-accent-hover text-primary font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                        // Use the authLoading state variable now
                        disabled={authLoading}
                    >
                        <FaPlus /> Create Room
                    </button>
                </div>

                {/* Use the authLoading state variable now */}
                {authLoading || loadingRooms ? (
                    <div className="flex justify-center items-center py-10">
                        <Mosaic color="#DAA520" size="medium" />
                    </div>
                ) : rooms.length === 0 ? (
                    <div className="text-center py-10 text-textsecondary">
                        <p>No active rooms found.</p>
                        <p>Why not create one?</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {rooms.map(room => (
                            <Link href={`/rooms/${room.id}`} key={room.id} className="block group">
                                <div className="bg-secondary rounded-lg shadow-lg p-4 transition-all duration-300 group-hover:shadow-accent/30 group-hover:scale-[1.02]">
                                    <h2 className="text-lg font-semibold text-textprimary truncate mb-2 group-hover:text-accent">{room.name}</h2>
                                    <div className="text-xs text-textsecondary space-y-1">
                                        <p className="flex items-center gap-1.5">
                                            <FaUsers /> {room.members?.length || 0} Member(s)
                                        </p>
                                        <p className="flex items-center gap-1.5">
                                            <FaClock /> Created {room.createdAt ? <TimeAgo date={room.createdAt} /> : '...'} by {room.createdByUsername || 'Unknown'}
                                        </p>
                                        {room.currentMediaId && (
                                            <p className="text-xs text-accent/80 pt-1 italic">
                                                Watching: {room.currentMediaType === 'tv' ? 'TV Show' : 'Movie'} {/* Simple indicator */}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
            <Footer />
            <CreateRoomModal isOpen={isModalOpen} onClose={closeModal} />
        </div>
    );
};

export default RoomsPage;