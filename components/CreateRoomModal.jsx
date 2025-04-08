// components/CreateRoomModal.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose } from 'react-icons/io5';
import { db, auth } from '../firebase'; // Adjust path
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useRouter } from 'next/router'; // To redirect after creation

const CreateRoomModal = ({ isOpen, onClose }) => {
    const [roomName, setRoomName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const currentUser = auth.currentUser;
    const router = useRouter();

    const handleCreateRoom = async (e) => {
        e.preventDefault();
        if (!roomName.trim()) return toast.error('Please enter a room name.');
        if (!currentUser) return toast.error('Please log in to create a room.');
        setIsLoading(true);

        try {
            const roomsCollectionRef = collection(db, 'rooms');
            const newRoomDoc = await addDoc(roomsCollectionRef, {
                name: roomName.trim(),
                createdBy: currentUser.uid,
                createdByUsername: currentUser.displayName || 'Anonymous', // Get username if available
                createdAt: serverTimestamp(),
                members: [currentUser.uid], // Start with creator as member
                currentMediaId: null,       // No media initially
                currentMediaType: null,     // 'movie' or 'tv'
                // Add other initial room data if needed
            });

            toast.success(`Room "${roomName.trim()}" created!`);
            setRoomName('');
            onClose(); // Close the modal
            router.push(`/rooms/${newRoomDoc.id}`); // Navigate to the new room

        } catch (error) {
            console.error("Error creating room:", error);
            toast.error('Failed to create room. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
                    onClick={onClose} // Close on overlay click
                >
                    <motion.div
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.7, opacity: 0 }}
                        transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                        className="bg-secondary rounded-lg shadow-xl w-full max-w-md p-6 relative"
                        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-3 right-3 text-textsecondary hover:text-accent transition-colors text-2xl"
                            aria-label="Close modal"
                        >
                            <IoClose />
                        </button>
                        <h2 className="text-xl font-semibold text-textprimary mb-4">Create Watch Party Room</h2>
                        <form onSubmit={handleCreateRoom}>
                            <div className="mb-4">
                                <label htmlFor="roomName" className="block text-sm font-medium text-textsecondary mb-1">
                                    Room Name
                                </label>
                                <input
                                    type="text"
                                    id="roomName"
                                    value={roomName}
                                    onChange={(e) => setRoomName(e.target.value)}
                                    placeholder="e.g., Friday Movie Night"
                                    className="w-full bg-primary border border-secondary-light rounded-md p-2 text-textprimary focus:ring-accent focus:border-accent placeholder-textsecondary/50"
                                    required
                                    maxLength={50}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading || !roomName.trim()}
                                className="w-full bg-accent hover:bg-accent-hover text-primary font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Creating...' : 'Create Room'}
                            </button>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CreateRoomModal;