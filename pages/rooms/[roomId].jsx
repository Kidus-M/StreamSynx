// pages/rooms/[roomId].jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import { db, auth, rtdb } from "../../firebase"; // Adjust path
import {
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  collection,
  query as firestoreQuery,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import {
  ref,
  update as updateRTDB,
  onDisconnect,
  set,
  serverTimestamp,
  remove,
  get
} from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import NavBar from "../../components/NavBar"; // Adjust path
import Footer from "../../components/Footer"; // Adjust path
import ChatInterface from "../../components/ChatInterface"; // Adjust path
import EpisodeCard from "../../components/RoomEpisodeCard"; // *** Ensure this path is correct ***
import { Mosaic } from "react-loading-indicators";
import toast, { Toaster } from "react-hot-toast";
import {
  FaUsers,
  FaSignOutAlt,
  FaUserPlus,
  FaUserMinus,
  FaCrown,
  FaPlay,
  FaStar,
  FaSpinner, // Using Spinner for debouncing indicator
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

// --- Constants and Helpers ---
const IMAGE_BASE_URL_W500 = "https://image.tmdb.org/t/p/w500";
const IMAGE_BASE_URL_ORIGINAL = "https://image.tmdb.org/t/p/original";
const TMDB_API_KEY = process.env.NEXT_PUBLIC_API_KEY; // Corrected: Use NEXT_PUBLIC_API_KEY consistently
const DEBOUNCE_DELAY = 400; // milliseconds for search debounce

const fetchTMDB = async (endpoint) => {
  // **FIXED: Use TMDB_API_KEY constant**
  const url = `https://api.themoviedb.org/3/${endpoint}${
    endpoint.includes("?") ? "&" : "?"
  }api_key=${TMDB_API_KEY}&language=en-US`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error("TMDB API Error:", response.status, await response.text());
      // Return a specific error object or rethrow for better handling
      throw new Error(`TMDB Error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching TMDB data:", error);
    // Re-throw the error so calling functions can catch it
    throw error;
  }
};
// --- End Constants and Helpers ---

const RoomPage = () => {
  const router = useRouter();
  const { roomId } = router.query;

  // Auth State
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUserFriends, setCurrentUserFriends] = useState([]); // State for friend UIDs

  // Room State
  const [roomData, setRoomData] = useState(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [error, setError] = useState(null);
  const [isMember, setIsMember] = useState(false);
  const [membersList, setMembersList] = useState([]);

  // Media Search State (Creator only)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchingMedia, setIsSearchingMedia] = useState(false); // Renamed for clarity
  const mediaSearchDebounceTimeout = useRef(null);

  // User Search State (Creator only - for adding members)
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const userSearchDebounceTimeout = useRef(null);

  // TV Show State
  const [tvShowDetails, setTvShowDetails] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const seasonSectionRef = useRef(null);

  // --- Auth Listener ---
  useEffect(() => {
    setAuthLoading(true);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Fetch Current User's Friends List UIDs (Real-time) ---
  useEffect(() => {
    if (!currentUser) {
      setCurrentUserFriends([]);
      return;
    }
    const friendsDocRef = doc(db, "friends", currentUser.uid); // Use 'friends' collection
    const unsubscribe = onSnapshot(
      friendsDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          // Ensure 'friends' is the field name in your 'friends' collection docs
          setCurrentUserFriends(docSnap.data()?.friends || []);
        } else {
          setCurrentUserFriends([]);
        }
      },
      (error) => {
        console.error("Error fetching friends list:", error);
        toast.error("Could not load friends list.");
        setCurrentUserFriends([]);
      }
    );
    return () => unsubscribe();
  }, [currentUser]);

  // --- Fetch Room Data (Firestore) & Manage Membership ---
  useEffect(() => {
    if (authLoading || !roomId) {
      setLoadingRoom(authLoading);
      return;
    }
    if (!currentUser) {
      toast.error("Please log in to access rooms.");
      router.push("/login");
      return;
    }

    setLoadingRoom(true);
    const roomDocRef = doc(db, "rooms", roomId);

    const unsubscribe = onSnapshot(
      roomDocRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Check membership *before* setting room data if user is not creator
          const userIsCurrentlyMember = data.members?.includes(currentUser.uid);
          if (!userIsCurrentlyMember && data.createdBy !== currentUser.uid) {
            setError("You are not a member of this room.");
            setRoomData(null);
            setIsMember(false);
            setMembersList([]);
            setLoadingRoom(false);
            return; // Stop processing if not a member
          }

          // Set room data and membership status
          setRoomData({ id: docSnap.id, ...data });
          setError(null);
          setIsMember(true); // User is either creator or member at this point

          // Update local state based on Firestore (season/episode)
          setSelectedSeason(data.currentSeason || null);
          setSelectedEpisode(data.currentEpisode || null);

          // Fetch member details (optimize if needed for large rooms)
          if (data.members && Array.isArray(data.members)) {
            try {
              // Optimization: Only refetch if member list actually changed
              const currentMemberIds = membersList
                .map((m) => m.uid)
                .sort()
                .join(",");
              const newMemberIds = [...data.members].sort().join(","); // Create sorted copy

              if (currentMemberIds !== newMemberIds) {
                const memberDocsPromises = data.members.map((uid) =>
                  getDoc(doc(db, "users", uid))
                );
                const memberDocs = await Promise.all(memberDocsPromises);
                setMembersList(
                  memberDocs
                    .filter((d) => d.exists())
                    .map((d) => ({
                      uid: d.id,
                      username: d.data().username || "Anonymous",
                    }))
                );
              }
            } catch (err) {
              console.error("Error fetching member details:", err);
              // Optionally keep old members list or clear it
              // setMembersList([]);
            }
          } else {
            setMembersList([]);
          }
        } else {
          setError(`Room with ID ${roomId} not found.`);
          setRoomData(null);
          setIsMember(false);
          setMembersList([]);
        }
        setLoadingRoom(false);
      },
      (err) => {
        console.error("Error fetching room data:", err);
        setError("Failed to load room data. Check console for details.");
        setLoadingRoom(false);
      }
    );

    return () => unsubscribe();
  }, [roomId, currentUser, authLoading, router]); // Added membersList to dependencies was incorrect, caused loops. Removed it.

  // --- Fetch TV Show Details & Episodes ---
  useEffect(() => {
    if (roomData?.currentMediaType === "tv" && roomData.currentMediaId) {
      // Fetch details only if ID changed or details aren't loaded
      if (!tvShowDetails || tvShowDetails.id !== roomData.currentMediaId) {
        setTvShowDetails(null); // Clear old details immediately
        fetchTMDB(`tv/${roomData.currentMediaId}`)
          .then((details) => {
            if (details) {
              setTvShowDetails(details);
              // Determine initial season to load (use saved, or first available, or null)
              const seasonToLoad =
                roomData.currentSeason !== null
                  ? roomData.currentSeason
                  : details.seasons?.find(
                      (s) => s.season_number >= 1 && s.episode_count > 0
                    )?.season_number ?? null; // Prefer Season 1+
              setSelectedSeason(seasonToLoad); // This will trigger the episode fetch effect
            } else {
              // Handle API error or no details found
              toast.error(
                `Could not load details for TV show ID: ${roomData.currentMediaId}`
              );
              setTvShowDetails(null);
              setSelectedSeason(null);
              setEpisodes([]);
            }
          })
          .catch((err) => {
            toast.error(`Error loading TV show details: ${err.message}`);
            setTvShowDetails(null);
            setSelectedSeason(null);
            setEpisodes([]);
          });
      }
      // If details are already loaded but season changed in Firestore, update local season state
      else if (
        tvShowDetails &&
        tvShowDetails.id === roomData.currentMediaId &&
        selectedSeason !== roomData.currentSeason
      ) {
        setSelectedSeason(roomData.currentSeason);
      }
    } else {
      // Clear TV state if media is not TV or no media selected
      setTvShowDetails(null);
      setSelectedSeason(null);
      setSelectedEpisode(null);
      setEpisodes([]);
    }
    // Depend on the specific properties from roomData that affect TV details fetching
  }, [
    roomData?.currentMediaId,
    roomData?.currentMediaType,
    roomData?.currentSeason,
  ]);

  // --- Fetch Episodes for Selected Season ---
  useEffect(() => {
    // Fetch only if it's a TV show, an ID exists, and a season number is selected
    if (
      roomData?.currentMediaType === "tv" &&
      roomData.currentMediaId &&
      selectedSeason !== null
    ) {
      setLoadingEpisodes(true);
      setEpisodes([]); // Clear old episodes
      fetchTMDB(`tv/${roomData.currentMediaId}/season/${selectedSeason}`)
        .then((seasonData) => {
          // Ensure seasonData and episodes exist before trying to use them
          const fetchedEpisodes = seasonData?.episodes;
          if (Array.isArray(fetchedEpisodes)) {
            setEpisodes(fetchedEpisodes);
            // Ensure selectedEpisode from Firestore is still valid for the loaded episodes
            const firestoreEpisode = roomData.currentEpisode;
            const isValidEpisode = fetchedEpisodes.some(
              (ep) => ep.episode_number === firestoreEpisode
            );
            setSelectedEpisode(isValidEpisode ? firestoreEpisode : null);
          } else {
            // Handle case where season data is valid but episodes array is missing/invalid
            console.warn(
              `No valid episodes array returned for S${selectedSeason}`
            );
            setEpisodes([]);
            setSelectedEpisode(null);
            // Optionally inform the user
            // toast.info(`Could not find episode data for Season ${selectedSeason}.`);
          }
        })
        .catch((err) => {
          console.error(
            `Error fetching episodes for season ${selectedSeason}:`,
            err
          );
          // *** ADDED TOAST ERROR ***
          toast.error(
            `Failed to load episodes for Season ${selectedSeason}: ${err.message}`
          );
          setEpisodes([]);
          setSelectedEpisode(null); // Reset episode if fetch fails
        })
        .finally(() => {
          setLoadingEpisodes(false);
        });
    } else {
      setEpisodes([]); // Clear episodes if not TV or no season selected
      setLoadingEpisodes(false); // Ensure loading is off
    }
    // Depend also on roomData.currentEpisode to potentially reset selection if Firestore changes
  }, [
    roomData?.currentMediaId,
    roomData?.currentMediaType,
    selectedSeason,
    roomData?.currentEpisode,
  ]); // Dependencies look correct

  // --- Presence System (RTDB) ---
  useEffect(() => {
    if (!roomId || !currentUser || !isMember || !roomData) return; // Ensure roomData is loaded too
    const userStatusRef = ref(
      rtdb,
      `/roomPresence/${roomId}/${currentUser.uid}`
    );
    const statusData = {
      online: true,
      lastChanged: serverTimestamp(),
      username: currentUser.displayName || "Anonymous", // Use displayName
    };
    set(userStatusRef, statusData);
    const onDisconnectRef = onDisconnect(userStatusRef);
    onDisconnectRef.set({ ...statusData, online: false }); // Set offline on disconnect

    return () => {
      onDisconnectRef.cancel(); // Clean up listener
      // Optionally set offline immediately on unmount, helps if user navigates away quickly
      // set(userStatusRef, { ...statusData, online: false });
    };
  }, [roomId, currentUser, isMember, roomData]); // Add roomData dependency

  // --- Debounced Media Search (for Creator) ---
  const performMediaSearch = useCallback(
    async (query) => {
      // Guard clauses
      if (
        !query.trim() ||
        !currentUser ||
        !roomData ||
        currentUser.uid !== roomData.createdBy
      ) {
        setSearchResults([]);
        setIsSearchingMedia(false); // Ensure loading stops
        return;
      }

      // **FIX: Set loading TRUE only here, before the fetch**
      setIsSearchingMedia(true);
      // **FIX: Do NOT clear results here to avoid flicker**
      // setSearchResults([]);

      try {
        // Use the helper function which now throws errors
        const results = await fetchTMDB(
          `search/multi?query=${encodeURIComponent(
            query
          )}&page=1&include_adult=false`
        );

        if (results?.results) {
          // Filter results *after* getting them
          setSearchResults(
            results.results.filter(
              (r) =>
                (r.media_type === "movie" || r.media_type === "tv") &&
                r.poster_path
            )
          );
        } else {
          setSearchResults([]); // Clear results if API returns unexpected format
        }
      } catch (error) {
        console.error("Media Search error:", error);
        // **FIX: Add user feedback**
        toast.error(`Media search failed: ${error.message}`);
        setSearchResults([]); // Clear results on error
      } finally {
        // Stop loading spinner regardless of success/fail
        setIsSearchingMedia(false);
      }
    },
    [currentUser, roomData]
  ); // roomData dependency is important here for createdBy check

  const handleMediaSearchInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Clear existing debounce timeout
    if (mediaSearchDebounceTimeout.current) {
      clearTimeout(mediaSearchDebounceTimeout.current);
    }

    // If query is empty, clear results and loading state immediately
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearchingMedia(false); // Stop spinner if query is cleared
      return;
    }

    // **FIX: Do NOT set loading true here**
    // setIsSearchingMedia(true);

    // Set new timeout to perform the search after delay
    mediaSearchDebounceTimeout.current = setTimeout(() => {
      performMediaSearch(query);
    }, DEBOUNCE_DELAY);
  };

  // --- Select Media from Search ---
  const handleSelectMedia = async (media) => {
    if (
      !roomId ||
      !currentUser ||
      !roomData ||
      currentUser.uid !== roomData.createdBy
    )
      return;
    const roomDocRef = doc(db, "rooms", roomId);
    const mediaType = media.media_type === "tv" ? "tv" : "movie";
    const mediaId = media.id;

    // Show loading indicator while updating Firestore
    const selectToastId = toast.loading(
      `Selecting ${media.title || media.name}...`
    );

    try {
      await updateDoc(roomDocRef, {
        currentMediaId: mediaId,
        currentMediaType: mediaType,
        currentMediaTitle: media.title || media.name,
        currentMediaPoster: media.poster_path,
        currentSeason: null, // Reset season/episode when changing media
        currentEpisode: null,
      });
      toast.success(`Set room media to "${media.title || media.name}"`, {
        id: selectToastId,
      });
      // Clear search state
      setSearchQuery("");
      setSearchResults([]);
      setIsSearchingMedia(false);
      // Clear local TV state immediately for faster UI update
      setTvShowDetails(null);
      setSelectedSeason(null);
      setSelectedEpisode(null);
      setEpisodes([]);
    } catch (error) {
      console.error("Error updating media:", error);
      toast.error(`Failed to update room media: ${error.message}`, {
        id: selectToastId,
      });
      setIsSearchingMedia(false); // Ensure loading stops on error
    }
  };

  // --- TV Season/Episode Selection ---
  const handleSeasonChange = async (seasonNumber) => {
    if (
      !roomId ||
      !currentUser ||
      !roomData ||
      roomData.currentMediaType !== "tv"
    )
      return;

    // Allow non-creators to *change* the view locally, but don't save to Firestore
    if (currentUser.uid !== roomData.createdBy) {
      setSelectedSeason(seasonNumber);
      setSelectedEpisode(null); // Reset episode when changing season
      seasonSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      }); // Scroll efficiently
      return;
    }

    // Creator saves the change to Firestore
    const roomDocRef = doc(db, "rooms", roomId);
    try {
      // Update local state immediately for responsiveness
      setSelectedSeason(seasonNumber);
      setSelectedEpisode(null);
      // Update Firestore
      await updateDoc(roomDocRef, {
        currentSeason: seasonNumber,
        currentEpisode: null, // Reset episode in Firestore too
      });
      toast.success(`Switched to Season ${seasonNumber}`);
      seasonSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    } catch (error) {
      console.error("Error updating season:", error);
      toast.error(`Failed to update season: ${error.message}`);
      // Optionally revert local state if Firestore update fails
      // setSelectedSeason(roomData.currentSeason); // Revert to Firestore value
      // setSelectedEpisode(roomData.currentEpisode);
    }
  };

  const handleEpisodeClick = async (episodeNumber) => {
    if (
      !roomId ||
      !currentUser ||
      !roomData ||
      selectedSeason === null ||
      roomData.currentMediaType !== "tv"
    )
      return;

    // Allow non-creators to *change* the view locally
    if (currentUser.uid !== roomData.createdBy) {
      setSelectedEpisode(episodeNumber);
      window.scrollTo({ top: 0, behavior: "smooth" }); // Scroll to top to see player
      return;
    }

    // Creator saves the change to Firestore
    const roomDocRef = doc(db, "rooms", roomId);
    try {
      // Update local state immediately
      setSelectedEpisode(episodeNumber);
      // Update Firestore (ensure season is also set correctly)
      await updateDoc(roomDocRef, {
        currentEpisode: episodeNumber,
        currentSeason: selectedSeason, // Keep the current season selected
      });
      toast.success(`Selected S${selectedSeason} E${episodeNumber}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Error updating episode:", error);
      toast.error(`Failed to update episode: ${error.message}`);
      // Optionally revert local state
      // setSelectedEpisode(roomData.currentEpisode);
    }
  };

  // --- Debounced User Search (FRIENDS ONLY - CLIENT SIDE FILTER) ---
  const performUserSearch = useCallback(
    async (query) => {
      if (
        !query.trim() ||
        !currentUser ||
        !roomData ||
        currentUser.uid !== roomData.createdBy ||
        currentUserFriends.length === 0
      ) {
        setUserSearchResults([]);
        setIsSearchingUsers(false);
        return;
      }
      setIsSearchingUsers(true);
      setUserSearchResults([]);

      try {
        const lowerCaseQuery = query.toLowerCase();
        const friendUidsToFetch = currentUserFriends.filter(
          (uid) => uid !== currentUser.uid
        ); // Exclude self

        // *** Firestore 'in' query limit is 30 ***
        // If > 30 friends, only search the first 30 or implement pagination/chunking.
        if (friendUidsToFetch.length > 30) {
          toast.error(
            "Can only search up to 30 friends at a time due to limits.",
            { duration: 4000 }
          );
          // Slice to allow searching *some* friends
          // friendUidsToFetch = friendUidsToFetch.slice(0, 30);
          // Or return if you want to block it completely
          setIsSearchingUsers(false);
          return;
        }
        if (friendUidsToFetch.length === 0) {
          setIsSearchingUsers(false);
          return; // No friends to search
        }

        const usersRef = collection(db, "users");
        // Fetch all friend documents (up to 30)
        const q = firestoreQuery(
          usersRef,
          where("__name__", "in", friendUidsToFetch),
          limit(30)
        );
        const querySnapshot = await getDocs(q);

        const friendsData = [];
        querySnapshot.forEach((doc) => {
          friendsData.push({ uid: doc.id, ...doc.data() });
        });

        // Client-side filtering (case-insensitive startsWith) AND exclude existing members
        const currentMemberIds = roomData?.memberIds || [];
        const filteredUsers = friendsData.filter(
          (user) =>
            user.username?.toLowerCase().startsWith(lowerCaseQuery) &&
            !currentMemberIds.includes(user.uid)
        );

        setUserSearchResults(filteredUsers);
      } catch (searchError) {
        console.error("Error searching users:", searchError);
        toast.error("Failed to search friends.");
      } finally {
        setIsSearchingUsers(false);
      }
    },
    [currentUser, roomData?.createdBy, roomData?.memberIds, currentUserFriends]
  ); // Dependencies

  const handleUserSearchInputChange = (e) => {
    const query = e.target.value;
    setUserSearchQuery(query);
    setIsSearchingUsers(true);
    clearTimeout(userSearchDebounceTimeout.current);
    if (query.trim()) {
      userSearchDebounceTimeout.current = setTimeout(() => {
        performUserSearch(query);
      }, DEBOUNCE_DELAY);
    } else {
      setUserSearchResults([]);
      setIsSearchingUsers(false);
    }
  };
  const handleAddMember = async (userToAdd) => {
    if (
        !roomId ||
        !currentUser ||
        !roomData ||
        currentUser.uid !== roomData.createdBy
    )
        return;
    const roomDocRef = doc(db, "rooms", roomId);
    try {
        // --- CORRECTED FIELD NAME ---
        await updateDoc(roomDocRef, { members: arrayUnion(userToAdd.uid) }); // Changed memberIds to members
        // --- END CORRECTION ---

        // Update RTDB (this part looks correct)
        const userMemberRefRTDB = ref(
            rtdb,
            `/watchRooms/${roomId}/members/${userToAdd.uid}`
        );
        await set(userMemberRefRTDB, {
            username: userToAdd.username || "Anonymous",
        });

        toast.success(`${userToAdd.username || "User"} added.`);

        // Update local search results state (UI cleanup)
        setUserSearchResults((prevResults) =>
            prevResults.filter((u) => u.uid !== userToAdd.uid)
        );
        // Clear search query only if the results list becomes empty after adding
        // Check length *before* filtering might be more accurate if async state updates lag
        if (userSearchResults.filter((u) => u.uid !== userToAdd.uid).length === 0) {
             setUserSearchQuery("");
             // Optionally hide the search input if the list is now empty
             // if (userSearchResults.length <= 1) setShowUserSearch(false);
         }
    } catch (addError) {
        console.error("Error adding member:", addError);
        toast.success(`${userToAdd.username || "User"} added.`);
    }
};
const handleRemoveMember = async (memberUidToRemove) => {
    if (
        !roomId ||
        !currentUser ||
        !roomData ||
        currentUser.uid !== roomData.createdBy || // Check if user is creator
        currentUser.uid === memberUidToRemove    // Cannot remove self
    )
        return; // Guard clauses are correct

    const roomDocRef = doc(db, "rooms", roomId); // Firestore document ref
    const userStatusRef = ref( // RTDB presence ref
        rtdb,
        `/roomPresence/${roomId}/${memberUidToRemove}`
    );

    const memberUsername = membersList.find((m) => m.uid === memberUidToRemove)?.username || "User"; // Find username for confirmation

    // Confirmation dialog
    if (!window.confirm(`Are you sure you want to remove ${memberUsername} from the room?`)) return;

    const removingToast = toast.loading(`Removing ${memberUsername}...`); // Add loading toast

    try {
        // --- CORRECTED FIELD NAME ---
        // Update the 'members' array field in Firestore
        await updateDoc(roomDocRef, {
            members: arrayRemove(memberUidToRemove), // Use 'members' instead of 'memberIds'
        });
        // --- END CORRECTION ---

        // Remove RTDB presence node (This part was correct)
        await remove(userStatusRef); // Use RTDB 'remove'

        toast.success(`${memberUsername} removed.`, { id: removingToast });
        // No need to manually update membersList state here,
        // the onSnapshot listener will handle the update automatically.

    } catch (err) {
        console.error("Error removing member:", err);
        toast.success(`${memberUsername} removed.`, { id: removingToast }); // Show error message
    }
};
  const handleLeaveRoom = async () => {
    if (!roomId || !currentUser || !roomData) return;
    const isCreator = currentUser.uid === roomData.createdBy;
    const confirmMsg = isCreator
      ? "Leaving as creator might delete the room. Are you sure?"
      : "Are you sure?";
    if (!window.confirm(confirmMsg)) return;
    const roomDocRef = doc(db, "rooms", roomId);
    const userStatusRef = ref(
      rtdb,
      `/roomPresence/${roomId}/${currentUser.uid}`
    );
    const leavingToast = toast.loading("Leaving room...");
    try {
      if (!isCreator) {
        await updateDoc(roomDocRef, {
          memberIds: arrayRemove(currentUser.uid),
        });
      } else {
        toast.error("Creators cannot leave. Delete room instead.");
        toast.dismiss(leavingToast);
        return;
      }
      await remove(userStatusRef);
      toast.success("Left the room.", { id: leavingToast });
      router.push("/rooms");
    } catch (err) {
      console.error("Error leaving room:", err);
      toast.error("Failed to leave.", { id: leavingToast });
    }
  };

  // --- Calculate Player Source URL ---
  // --- Calculate Video Source URL ---
  // --- Calculate Video Source URL ---
  const calculateVideoSrc = useCallback(() => {
    if (!roomData?.currentMediaId) return "";
    const type = roomData.currentMediaType === "tv" ? "tv" : "movie";
    // *** Verify this base URL and path structure is correct for vidlink.pro ***
    let urlBase = `https://vidlink.pro/${type}/${roomData.currentMediaId}`;
    let url = "";

    // Construct URL based on type and selected episode/season
    if (type === "tv" && selectedSeason !== null && selectedEpisode !== null) {
      // *** THIS IS THE CRITICAL PART TO VERIFY ***
      // The assumption here is that vidlink.pro uses "-SEASON-EPISODE" format.
      // It might use query parameters (e.g., ?s=X&e=Y) or a different path structure.
      // You MUST confirm the correct format for vidlink.pro.
      url = `${urlBase}/${selectedSeason}/${selectedEpisode}`; // <-- LIKELY PROBLEM AREA
    } else if (type === "tv" && selectedSeason !== null) {
      // If only season is selected, attempt episode 1 (check if vidlink supports this)
      url = `${urlBase}-${selectedSeason}-1`; // <-- Also needs verification
    } else {
      url = urlBase; // For movies or TV shows without episode selected
    }

    // Add query parameters (ensure these are still valid for vidlink.pro)
    url += `?primaryColor=DAA520&secondaryColor=A0A0A0&iconColor=EAEAEA&icons=default&player=default&title=true&poster=true&autoplay=false&nextbutton=false`;
    console.log("Generated iframe src:", url); // Add log to see generated URL
    return url;
  }, [
    roomData?.currentMediaId,
    roomData?.currentMediaType,
    selectedSeason,
    selectedEpisode,
  ]);

  const videoSrc = calculateVideoSrc(); // This calls the function

  // --- Render States ---
  if (authLoading || loadingRoom) {
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center">
        {" "}
        <NavBar /> <Mosaic color="#DAA520" size="medium" /> <Footer />
      </div>
    );
  }
  if (error) {
    // Handles "not member" or "not found" errors set earlier
    return (
      <div className="min-h-screen bg-primary text-textprimary flex flex-col items-center justify-center px-4">
        {" "}
        <NavBar />{" "}
        <div className="text-center mt-20">
          {" "}
          <h2 className="text-2xl text-red-500 mb-4">Error</h2>{" "}
          <p className="text-textsecondary mb-6">{error}</p>{" "}
          <button
            onClick={() => router.push("/rooms")}
            className="bg-accent hover:bg-accent-hover text-primary font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            {" "}
            Back to Rooms{" "}
          </button>{" "}
        </div>{" "}
        <Footer />{" "}
      </div>
    );
  }
  // If auth is done, room loading is done, no error, but still no user or room data (edge case)
  if (!currentUser || !roomData) {
    return (
      <div className="min-h-screen bg-primary text-textprimary flex flex-col items-center justify-center px-4">
        {" "}
        <NavBar />{" "}
        <div className="text-center mt-20">
          {" "}
          <h2 className="text-2xl text-red-500 mb-4">Access Denied</h2>{" "}
          <p className="text-textsecondary mb-6">
            Could not load room data or user information.
          </p>{" "}
          <button
            onClick={() => router.push("/rooms")}
            className="bg-accent hover:bg-accent-hover text-primary font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            {" "}
            Back to Rooms{" "}
          </button>{" "}
        </div>{" "}
        <Footer />{" "}
      </div>
    );
  }

  // --- Main Render ---
  const isCreator = currentUser.uid === roomData.createdBy;
  return (
    <div className="min-h-screen bg-primary text-textprimary flex flex-col font-poppins">
      <Toaster
        position="bottom-center"
        toastOptions={{ className: "bg-secondary text-textprimary" }}
      />
      <NavBar />

      {/* Background Image */}
      {roomData.currentMediaPoster && (
        <div
          className="absolute top-0 left-0 w-full h-[50vh] md:h-[60vh] -z-10 overflow-hidden"
          aria-hidden="true"
        >
          <img
            src={`${IMAGE_BASE_URL_ORIGINAL}${roomData.currentMediaPoster}`}
            alt=""
            className="w-full h-full object-cover opacity-20 blur-md scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/80 to-primary/50"></div>
        </div>
      )}

      <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8 mt-16 space-y-6 md:space-y-8 pt-20 md:pt-24">
        {/* Room Header & Controls */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-accent flex items-center gap-2">
              {roomData.name}
              {isCreator && (
                <FaCrown
                  className="text-yellow-400 text-xl"
                  title="You are the creator"
                />
              )}
            </h1>
            <p className="text-sm text-textsecondary">
              Created by {roomData.createdByUsername}
            </p>
            {/* Member List Display (Improved) */}
            <div
              className="flex items-center gap-1 text-textsecondary mt-1 text-xs"
              title={membersList.map((m) => m.username).join(", ")}
            >
              <FaUsers /> {membersList.length} member
              {membersList.length !== 1 ? "s" : ""}
              {membersList.length > 0 &&
                membersList.length <= 5 &&
                `: ${membersList.map((m) => m.username).join(", ")}`}
              {membersList.length > 5 &&
                ` (including ${membersList
                  .slice(0, 2)
                  .map((m) => m.username)
                  .join(", ")}...)`}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isCreator && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowUserSearch(!showUserSearch)}
                className="bg-secondary-light hover:bg-secondary text-textprimary font-semibold py-1.5 px-3 rounded-lg transition-colors text-sm flex items-center gap-1.5"
              >
                <FaUserPlus />{" "}
                {showUserSearch ? "Close Add Member" : "Add Member"}
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleLeaveRoom}
              disabled={isCreator}
              className={`bg-red-600/20 hover:bg-red-600/40 text-red-400 font-semibold py-1.5 px-3 rounded-lg transition-colors text-sm flex items-center gap-1.5 ${
                isCreator ? "opacity-50 cursor-not-allowed" : ""
              }`}
              title={
                isCreator ? "Creators cannot leave directly" : "Leave Room"
              }
            >
              <FaSignOutAlt /> Leave
            </motion.button>
          </div>
        </section>
        {/* Creator: Add Member Search Panel */}
        {/* Creator: Add Member Search Input */}
        <AnimatePresence>
          {isCreator && showUserSearch && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-secondary p-4 rounded-lg shadow mb-6 overflow-hidden"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={handleUserSearchInputChange} // Use debounced handler
                    placeholder="Search your friends by username..."
                    className="w-full bg-primary border border-secondary-light rounded-md p-2 pr-8 text-textprimary focus:ring-accent focus:border-accent placeholder-textsecondary/50"
                    // disabled={currentUserFriends.length === 0} // Disable if no friends loaded
                  />
                  {isSearchingUsers && ( // Show spinner inside input
                    <FaSpinner className="animate-spin absolute right-2 top-1/2 transform -translate-y-1/2 text-textsecondary" />
                  )}
                </div>
                {/* Optional: Add manual search trigger button if needed */}
              </div>
              {currentUserFriends.length === 0 && !authLoading && (
                <p className="text-xs text-textsecondary mb-2">
                  You haven't added any friends yet, or they couldn't be loaded.
                </p>
              )}
              {userSearchResults.length > 0 && (
                <ul className="space-y-1 max-h-40 overflow-y-auto text-sm">
                  {userSearchResults.map((user) => (
                    <li
                      key={user.uid}
                      className="flex justify-between items-center p-1.5 bg-primary rounded"
                    >
                      <span>
                        {user.username}{" "}
                        <span className="text-xs text-textsecondary">
                          ({user.email || "no email"})
                        </span>
                      </span>
                      <button
                        onClick={() => handleAddMember(user)}
                        className="text-green-500 hover:text-green-400 text-lg"
                        title={`Add ${user.username}`}
                      >
                        <FaUserPlus />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {!isSearchingUsers &&
                userSearchQuery &&
                userSearchResults.length === 0 && (
                  <p className="text-xs text-textsecondary">
                    No matching friends found.
                  </p>
                )}
            </motion.section>
          )}
        </AnimatePresence>
        {/* Main Content Area */}
        <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
          {/* Left Side / Top */}
          <div className="w-full lg:w-2/3 space-y-6">
            {/* Player */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full rounded-lg overflow-hidden shadow-lg bg-black aspect-video border border-secondary-light"
            >
              {videoSrc ? (
                <iframe
                  key={videoSrc} // Force re-render when src changes
                  src={videoSrc}
                  frameBorder="0"
                  allowFullScreen
                  allow="autoplay; encrypted-media; picture-in-picture"
                  className="w-full h-full"
                  title={`Watch Party Player - ${
                    roomData.currentMediaTitle || "Select Media"
                  }`}
                ></iframe>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-textsecondary p-4">
                  <p className="mb-4 text-center">
                    No movie or TV show selected.
                  </p>
                  {isCreator && (
                    <p className="text-sm text-center">
                      Use the search below to select media.
                    </p>
                  )}
                </div>
              )}
            </motion.div>

            {/* Current Media Info */}
            {roomData.currentMediaId && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-secondary rounded-lg p-3 flex items-center gap-3 shadow"
              >
                {roomData.currentMediaPoster && (
                  <img
                    src={`${IMAGE_BASE_URL_W500}${roomData.currentMediaPoster}`}
                    alt="Poster"
                    className="w-12 h-auto rounded flex-shrink-0"
                  />
                )}
                <div className="flex-grow">
                  <p className="text-sm text-textsecondary">
                    Currently Watching:
                  </p>
                  <p className="font-semibold text-textprimary text-lg">
                    {roomData.currentMediaTitle ||
                      `(${roomData.currentMediaType})`}
                  </p>
                  {roomData.currentMediaType === "tv" &&
                    selectedSeason !== null &&
                    selectedEpisode !== null && (
                      <p className="text-xs text-accent">
                        S{selectedSeason}, E{selectedEpisode}
                      </p>
                    )}
                </div>
              </motion.div>
            )}

            {/* Creator: Media Search Section */}
            {isCreator && (
              <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <label className="text-lg font-semibold mb-3 text-textprimary block">
                  Select Media
                </label>
                <div className="flex items-center gap-2 mb-4 relative">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={handleMediaSearchInputChange} // Corrected handler
                      placeholder="Search TMDB for movies or TV shows..."
                      className="w-full bg-secondary border border-secondary-light rounded-md p-2 pr-8 text-textprimary focus:ring-accent focus:border-accent placeholder-textsecondary/50"
                    />
                    {/* Spinner shown ONLY during actual fetch (after debounce) */}
                    {isSearchingMedia && (
                      <FaSpinner className="animate-spin absolute right-2 top-1/2 transform -translate-y-1/2 text-textsecondary" />
                    )}
                  </div>
                </div>

                {/* Search Results */}
                {/* Only show results container if there are results OR if loading */}
                {(searchResults.length > 0 ||
                  (isSearchingMedia && searchQuery)) && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-80 overflow-y-auto p-2 bg-secondary/50 rounded-md scrollbar-thin scrollbar-thumb-secondary-light scrollbar-track-secondary">
                    {isSearchingMedia && searchResults.length === 0 && (
                      <p className="text-textsecondary italic col-span-full text-center py-4">
                        Searching...
                      </p>
                    )}
                    {searchResults.map((media) => (
                      // Extracted Search Result Card (Example Structure)
                      <div
                        key={media.id}
                        className="bg-primary rounded-lg overflow-hidden shadow group relative cursor-pointer"
                        onClick={() => handleSelectMedia(media)}
                      >
                        <img
                          src={
                            media.poster_path
                              ? `${IMAGE_BASE_URL_W500}${media.poster_path}`
                              : "/placeholder.jpg"
                          }
                          alt={media.title || media.name}
                          className="w-full h-auto object-cover aspect-[2/3]"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-end p-2 text-center">
                          <p className="text-xs font-semibold text-textprimary line-clamp-2 mb-1">
                            {media.title || media.name}
                          </p>
                          <p className="text-xs text-accent uppercase mb-2">
                            {media.media_type}{" "}
                            {media.release_date?.substring(0, 4) ||
                              media.first_air_date?.substring(0, 4)}
                          </p>
                          {/* Simpler hover state, click selects */}
                        </div>
                        <div className="absolute top-1 right-1 bg-accent/80 text-primary text-[10px] font-bold px-1 rounded-sm">
                          <FaStar className="inline mr-0.5 mb-px" size={8} />{" "}
                          {media.vote_average?.toFixed(1)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* No results message shown only if NOT loading and query exists */}
                {!isSearchingMedia &&
                  searchQuery &&
                  searchResults.length === 0 && (
                    <p className="text-xs text-textsecondary text-center mt-2">
                      No results found for "{searchQuery}".
                    </p>
                  )}
              </motion.section>
            )}

            {/* TV Show Season/Episode Selection */}
            {roomData.currentMediaType === "tv" && tvShowDetails && (
              <motion.section
                ref={seasonSectionRef}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-secondary rounded-lg shadow-lg p-4 md:p-6"
              >
                {/* Season Selector */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-textprimary">
                    Seasons
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(tvShowDetails.seasons || [])
                      .filter(
                        (s) => s.season_number !== 0 && s.episode_count > 0
                      )
                      .map((season) => (
                        <button
                          key={season.id}
                          onClick={() =>
                            handleSeasonChange(season.season_number)
                          }
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors duration-200 ${
                            selectedSeason === season.season_number
                              ? "bg-accent text-primary shadow-md"
                              : "bg-secondary-light text-textsecondary hover:bg-secondary-light/70 hover:text-textprimary"
                          }`}
                        >
                          Season {season.season_number}
                        </button>
                      ))}
                  </div>
                </div>
                {/* Episode List */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-textprimary">
                    Episodes{" "}
                    {selectedSeason !== null
                      ? `(Season ${selectedSeason})`
                      : ""}
                  </h3>
                  {loadingEpisodes ? (
                    <div className="flex justify-center items-center h-20">
                      <Mosaic color="#DAA520" size="small" />
                    </div>
                  ) : episodes.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-secondary-light scrollbar-track-secondary pr-2">
                      {episodes.map((episode) => (
                        // Ensure RoomEpisodeCard path and props are correct
                        <EpisodeCard
                          key={episode.id}
                          episode={episode}
                          showId={roomData.currentMediaId}
                          seasonNumber={selectedSeason}
                          isSelected={
                            selectedEpisode === episode.episode_number
                          }
                          onWatchClick={() =>
                            handleEpisodeClick(episode.episode_number)
                          }
                          // Pass theme object if needed by EpisodeCard
                          theme={{
                            accent: "#DAA520",
                            primary: "#...",
                            secondary: "#...",
                            textPrimary: "#...",
                            textSecondary: "#...",
                          }}
                        />
                      ))}
                    </div>
                  ) : selectedSeason !== null ? (
                    <p className="text-textsecondary italic text-sm">
                      No episodes found for this season.
                    </p>
                  ) : (
                    <p className="text-textsecondary italic text-sm">
                      Select a season to view episodes.
                    </p>
                  )}
                </div>
              </motion.section>
            )}

            {/* Creator: Manage Members Section */}
            {isCreator && (
              <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-secondary rounded-lg shadow-lg p-4 md:p-6"
              >
                <h3 className="text-lg font-semibold mb-3 text-textprimary">
                  Manage Members ({membersList.length})
                </h3>
                <ul className="space-y-2 max-h-60 overflow-y-auto text-sm pr-2 scrollbar-thin scrollbar-thumb-secondary-light scrollbar-track-secondary">
                  {membersList.map((member) => (
                    <li
                      key={member.uid}
                      className="flex justify-between items-center p-2 bg-primary rounded"
                    >
                      <span className="flex items-center gap-1.5">
                        {member.username}
                        {member.uid === roomData.createdBy && (
                          <FaCrown
                            className="text-yellow-400"
                            title="Creator"
                          />
                        )}
                      </span>
                      {/* Allow removing anyone except the creator */}
                      {member.uid !== roomData.createdBy && (
                        <button
                          onClick={() => handleRemoveMember(member.uid)}
                          className="text-red-500 hover:text-red-400 text-base p-1"
                          title={`Remove ${member.username}`}
                        >
                          <FaUserMinus />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </motion.section>
            )}
          </div>{" "}
          {/* End Left Side */}
          {/* Right Side / Bottom: Chat */}
          <div className="w-full lg:w-1/3">
            <div className="lg:sticky lg:top-24">
              {" "}
              {/* Make chat sticky on large screens */}
              <ChatInterface roomId={roomId} />
            </div>
          </div>{" "}
          {/* End Right Side */}
        </div>{" "}
        {/* End Main Content Flex */}
      </main>
      <Footer />
    </div>
  );
};

export default RoomPage;
