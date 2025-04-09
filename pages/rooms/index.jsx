// pages/rooms/index.jsx
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { db, auth } from "../../firebase"; // Adjust path
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  getDoc,
  doc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import NavBar from "../../components/NavBar"; // Adjust path
import Footer from "../../components/Footer"; // Adjust path
import CreateRoomModal from "../../components/CreateRoomModal"; // Adjust path
import { Mosaic } from "react-loading-indicators";
import { FaPlus, FaUsers, FaClock, FaCrown } from "react-icons/fa";
import TimeAgo from "react-timeago"; // <-- Import TimeAgo
import toast, { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";
import { useRouter } from "next/router"; // <-- Import useRouter

// Make sure to install react-timeago: npm install react-timeago

const RoomsPage = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [allRooms, setAllRooms] = useState([]); // Store all fetched rooms initially
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [creatorUsernames, setCreatorUsernames] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter(); // Hook for navigation

  // Auth Listener
  useEffect(() => {
    setAuthLoading(true);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch ALL Rooms & Creator Usernames
  useEffect(() => {
    setLoadingRooms(true);
    setError(null);
    setAllRooms([]); // Clear previous rooms on re-fetch

    const roomsCollectionRef = collection(db, "rooms");
    // Query ALL rooms, ordered by creation date (this might need a simple index on createdAt)
    const q = query(roomsCollectionRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      async (querySnapshot) => {
        const fetchedRoomsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate
            ? doc.data().createdAt.toDate()
            : null,
        }));
        setAllRooms(fetchedRoomsData); // Store all fetched rooms

        // --- Fetch Creator Usernames for all fetched rooms ---
        if (fetchedRoomsData.length > 0) {
          const creatorIdsToFetch = [
            ...new Set(
              fetchedRoomsData
                .map((room) => room.createdBy)
                .filter((uid) => uid && !creatorUsernames[uid])
            ),
          ];

          if (creatorIdsToFetch.length > 0) {
            const usernamePromises = creatorIdsToFetch.map(async (uid) => {
              try {
                const userDocRef = doc(db, "users", uid);
                const userDoc = await getDoc(userDocRef);
                return {
                  uid,
                  username: userDoc.exists()
                    ? userDoc.data().username
                    : "Unknown",
                };
              } catch (err) {
                console.error(`Failed fetch username for ${uid}:`, err);
                return { uid, username: "Error" };
              }
            });
            const usernames = await Promise.all(usernamePromises);
            setCreatorUsernames((prev) => {
              const newMap = { ...prev };
              usernames.forEach((user) => {
                if (user) newMap[user.uid] = user.username;
              });
              return newMap;
            });
          }
        }
        setLoadingRooms(false);
      },
      (error) => {
        console.error("Error fetching rooms:", error);
        setError("Could not load rooms. Check Firestore permissions.");
        toast.error("Could not load rooms.");
        setLoadingRooms(false);
        setAllRooms([]);
        setCreatorUsernames({});
      }
    );

    return () => unsubscribe();
  }, []); // Fetch all rooms once on mount (or re-fetch based on other criteria if needed)

  // --- Client-Side Filtering for Display ---
  const userRooms = useMemo(() => {
    if (!currentUser) return [];
    // Filter the fetched rooms based on membership using the 'members' field
    return allRooms.filter((room) => room.members?.includes(currentUser.uid));
  }, [allRooms, currentUser]);

  // Modal Handlers
  const openModal = () => {
    if (!currentUser) {
      toast.error("Please log in to create a room.");
      return;
    }
    setIsModalOpen(true);
  };
  const closeModal = () => setIsModalOpen(false);

  // --- Render Loading / No User ---
  if (authLoading || (loadingRooms && allRooms.length === 0)) {
    // Show loader until initial fetch completes
    return (
      <div className="min-h-screen mt-16 bg-primary flex flex-col items-center justify-center">
        {" "}
        <NavBar />{" "}
        <div className="flex-grow flex items-center justify-center">
          <Mosaic color="#DAA520" size="medium" />
        </div>{" "}
        <Footer />{" "}
      </div>
    );
  }
  if (!currentUser) {
    return (
      <div className="min-h-screen mt-16 bg-primary text-textprimary flex flex-col items-center justify-center px-4">
        {" "}
        <NavBar />{" "}
        <div className="text-center">
          {" "}
          <h2 className="text-2xl text-accent mb-4">Log In Required</h2>{" "}
          <p className="text-textsecondary mb-6">
            Please log in to view or create watch party rooms.
          </p>{" "}
          <button
            onClick={() => router.push("/login")}
            className="bg-accent hover:bg-accent-hover text-primary font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Log In
          </button>{" "}
        </div>{" "}
        <Footer />{" "}
      </div>
    );
  }

  // --- Main Render ---
  return (
    // Added mt-16 for spacing below NavBar, themed background/text
    <div className="min-h-screen mt-16 bg-primary text-textprimary flex flex-col font-poppins">
      <Toaster
        position="bottom-center"
        toastOptions={{ className: "bg-secondary text-textprimary" }}
      />
      <NavBar />
      {/* Removed pt-16 from main as mt-16 is on outer div */}
      <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8">
        {/* Header + Create Button - Themed */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-textprimary">
            Your Watch Party Rooms
          </h1>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={openModal}
            className="bg-accent hover:bg-accent-hover text-primary font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2 shadow-md"
            disabled={authLoading} // Disable while auth is resolving
          >
            <FaPlus /> Create Room
          </motion.button>
        </div>

        {/* Error Message */}
        {error && !loadingRooms && (
          <div className="text-center py-10 text-red-400 bg-secondary rounded-lg shadow">
            <p>Error loading rooms: {error}</p>
          </div>
        )}

        {/* Room List / Empty State - Uses client-filtered 'userRooms' */}
        {!loadingRooms && !error && userRooms.length === 0 && (
          <div className="text-center py-16 text-textsecondary bg-secondary rounded-lg shadow">
            <FaUsers className="mx-auto text-4xl text-textsecondary/50 mb-4" />
            <p className="text-lg mb-2">No rooms found.</p>
            <p className="text-sm">
              You haven't joined or created any rooms yet.
            </p>
            <button
              onClick={openModal}
              className="mt-4 text-accent hover:text-accent-hover font-medium underline"
            >
              Create your first room?
            </button>
          </div>
        )}

        {!loadingRooms && !error && userRooms.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {userRooms.map((room) => (
              <Link
                href={`/rooms/${room.id}`}
                key={room.id}
                className="block group"
              >
                {/* Themed Room Card */}
                <motion.div
                  whileHover={{
                    y: -5,
                    boxShadow:
                      "0 10px 15px -3px rgba(218, 165, 32, 0.1), 0 4px 6px -4px rgba(218, 165, 32, 0.1)",
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="bg-secondary rounded-lg shadow-lg p-4 border border-secondary-light transition-all duration-300 h-full flex flex-col justify-between"
                >
                  <div>
                    <h2
                      className="text-lg font-semibold text-textprimary truncate mb-2 group-hover:text-accent transition-colors"
                      title={room.name}
                    >
                      {room.name}
                    </h2>
                    <div className="text-xs text-textsecondary space-y-1.5">
                      <p className="flex items-center gap-1.5">
                        <FaUsers /> {room.members?.length || 0} Member(s){" "}
                        {/* Use 'members' field */}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <FaCrown className="text-yellow-500/80" /> Created by{" "}
                        {creatorUsernames[room.createdBy] || "..."}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <FaClock /> <TimeAgo date={room.createdAt} />
                      </p>
                    </div>
                  </div>
                  {/* Indicate current media if info available */}
                  {room.currentMediaId && (
                    <div className="mt-3 pt-2 border-t border-secondary-light/50">
                      <p
                        className="text-xs text-accent/90 italic truncate"
                        title={`Watching: ${room.currentMediaTitle || "..."}`}
                      >
                        Watching: {room.currentMediaTitle || "..."}
                      </p>
                    </div>
                  )}
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <CreateRoomModal
        isOpen={isModalOpen}
        onClose={closeModal}
        currentUser={currentUser}
        setError={setError}
      />
      <Footer />
    </div>
  );
};

export default RoomsPage;
