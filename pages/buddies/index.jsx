import React, { useEffect, useState, useCallback } from "react";
import { auth, db } from "../../firebase"; // Assuming firebase config is correct
import NavBar from "../../components/NavBar"; // Assuming NavBar component exists
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc, // Added for cancelling requests
  arrayUnion,
  arrayRemove,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  limit
} from "firebase/firestore";
import { Mosaic } from "react-loading-indicators"; // Or your preferred loader
import { useRouter } from "next/router";

// Consistent User List Item Component (Minor refinement for clarity)
const UserListItem = ({
  user,
  type, // 'friend', 'request', 'search'
  onAccept,
  onReject,
  onUnfriend,
  onAddFriend,
  onCancelRequest, // Added for cancelling
  isRequestSent,
  isLoading,
}) => {
  const handleAction = (action, userId) => {
    if (!isLoading) {
      action(userId);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-lg mb-3 bg-gray-800 border border-gray-700 shadow-sm hover:bg-gray-750 transition-colors duration-150 ease-in-out">
      <div className="flex items-center overflow-hidden mr-3">
        <img
          src={
            user.avatar ||
            "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y" // Default avatar
          }
          alt={`${user.username}'s Avatar`}
          className="w-10 h-10 rounded-full mr-3 flex-shrink-0"
        />
        <p className="text-md font-medium text-gray-100 truncate">
          {user.username || "Unknown User"}
        </p>
      </div>
      <div className="flex-shrink-0 flex gap-2">
        {type === "request" && (
          <>
            <button
              onClick={() => handleAction(onAccept, user.fromUserId)} // Use fromUserId for requests
              className={`bg-green-600 text-white py-1 px-3 rounded text-sm font-medium hover:bg-green-700 transition-colors ${
                isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={isLoading}
            >
              Accept
            </button>
            <button
              onClick={() => handleAction(onReject, user.fromUserId)} // Use fromUserId for requests
              className={`bg-red-600 text-white py-1 px-3 rounded text-sm font-medium hover:bg-red-700 transition-colors ${
                isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={isLoading}
            >
              Reject
            </button>
          </>
        )}
        {type === "friend" && (
          <button
            onClick={() => handleAction(onUnfriend, user.uid)}
            className={`bg-red-600 text-white py-1 px-3 rounded text-sm font-medium hover:bg-red-700 transition-colors ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={isLoading}
          >
            Unfriend
          </button>
        )}
        {type === "search" && !isRequestSent && (
          <button
            onClick={() => handleAction(onAddFriend, user.uid)}
            className={`bg-blue-600 text-white py-1 px-3 rounded text-sm font-medium hover:bg-blue-700 transition-colors ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={isLoading}
          >
            Add Friend
          </button>
        )}
        {type === "search" && isRequestSent && (
           <button
            onClick={() => handleAction(onCancelRequest, user.uid)} // Use cancel action
            className={`bg-gray-600 text-white py-1 px-3 rounded text-sm font-medium hover:bg-gray-700 transition-colors ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={isLoading}
          >
            Cancel Request
          </button>
        )}
      </div>
    </div>
  );
};


const BuddiesPage = () => {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sentRequests, setSentRequests] = useState({}); // Stores { userId: true } for sent requests
  const [interactionLoading, setInteractionLoading] = useState({}); // { userId: true } while interacting
  const [activeTab, setActiveTab] = useState("friends"); // 'friends', 'requests', 'add'

  const userId = auth.currentUser?.uid;
  const router = useRouter();

  // --- Data Fetching ---

  useEffect(() => {
    if (!userId) {
      // Optional: Redirect to login if not authenticated
      // router.push('/login');
      setLoading(false); // Stop loading if no user
      return;
    }

    setLoading(true);
    let combinedLoading = { friends: true, requests: true, sent: true };

    const updateCombinedLoading = (key, value) => {
        combinedLoading[key] = value;
        if (!combinedLoading.friends && !combinedLoading.requests && !combinedLoading.sent) {
            setLoading(false);
        }
    }

    // Listener for Friends
    const friendsRef = doc(db, "friends", userId);
    const unsubscribeFriends = onSnapshot(friendsRef, async (docSnap) => {
      if (docSnap.exists()) {
        const friendIds = docSnap.data().friends || [];
        const friendsData = await Promise.all(
          friendIds.map(async (friendId) => {
            const userDocRef = doc(db, "users", friendId);
            const userDoc = await getDoc(userDocRef);
            return userDoc.exists()
              ? { uid: friendId, ...userDoc.data() }
              : null;
          })
        );
        setFriends(friendsData.filter(Boolean));
      } else {
        setFriends([]); // Handle case where friend doc doesn't exist yet
      }
      updateCombinedLoading('friends', false);
    }, (error) => {
        console.error("Error fetching friends:", error);
        updateCombinedLoading('friends', false); // Ensure loading state updates on error
    });

    // Listener for Incoming Friend Requests
    const incomingRequestsQuery = query(
      collection(db, "friendRequests"),
      where("toUserId", "==", userId),
      where("status", "==", "pending")
    );
    const unsubscribeRequests = onSnapshot(incomingRequestsQuery, async (snapshot) => {
      const requestsData = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const requestData = docSnap.data();
          const userDocRef = doc(db, "users", requestData.fromUserId);
          const userDoc = await getDoc(userDocRef);
          // Combine request data with user data (username, avatar etc.)
          return userDoc.exists()
            ? { ...requestData, uid: requestData.fromUserId, ...userDoc.data(), id: docSnap.id } // Add request ID
            : null;
        })
      );
      setFriendRequests(requestsData.filter(Boolean));
      updateCombinedLoading('requests', false);
    }, (error) => {
        console.error("Error fetching friend requests:", error);
        updateCombinedLoading('requests', false);
    });

     // Fetch Outgoing Pending Requests (run once on load or use listener if needed)
     const fetchOutgoingRequests = async () => {
        const outgoingRequestsQuery = query(
            collection(db, "friendRequests"),
            where("fromUserId", "==", userId),
            where("status", "==", "pending")
        );
        try {
            const snapshot = await getDocs(outgoingRequestsQuery);
            const sentMap = {};
            snapshot.docs.forEach(doc => {
                sentMap[doc.data().toUserId] = true; // Store as { toUserId: true }
            });
            setSentRequests(sentMap);
        } catch (error) {
            console.error("Error fetching outgoing requests:", error);
        } finally {
            updateCombinedLoading('sent', false);
        }
     }
     fetchOutgoingRequests();


    // Cleanup listeners on component unmount
    return () => {
      unsubscribeFriends();
      unsubscribeRequests();
    };
  }, [userId]); // Re-run if userId changes

  // --- User Search ---

   // --- User Search ---
   useEffect(() => {
    const searchUsers = async () => {
      const trimmedQuery = searchQuery.trim();
      console.log("[Search Debug] Triggered with query:", trimmedQuery);

      if (!trimmedQuery) {
        setSearchResults([]);
        console.log("[Search Debug] Query empty, clearing results.");
        return;
      }

      // Ensure userId is available
      if (!userId) {
          console.log("[Search Debug] No user ID, aborting search.");
          return;
      }

      const lowerCaseQuery = trimmedQuery.toLowerCase();
      console.log("[Search Debug] Lowercase query for client filtering:", lowerCaseQuery);

      // --- !!! WARNING: Client-Side Filtering Approach !!! ---
      // This approach fetches potentially MANY users and filters in the browser.
      // It is INEFFICIENT and DOES NOT SCALE for large user bases, leading to
      // higher costs and slower performance. Storing a lowercase field or using
      // a dedicated search service (like Algolia) is STRONGLY recommended.
      // We are adding a limit(100) as a safety measure during development.
      // Remove or adjust this limit cautiously for production.
      // ---------------------------------------------------------

      // Query without case-specific filtering - potentially fetches many documents!
      const usersQuery = query(
        collection(db, "users"),
        limit(100) // IMPORTANT: Limit fetched documents for this inefficient method!
                   // Adjust or remove only if you understand the performance/cost implications.
      );

      try {
        console.log("[Search Debug] Executing Firestore query (fetching potentially many users for client filtering)...");
        const usersSnapshot = await getDocs(usersQuery);
        console.log("[Search Debug] Firestore query executed. Fetched raw docs:", usersSnapshot.size);

        // Map all fetched documents
        const allFetchedUsers = usersSnapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));

        // Perform case-insensitive filtering *client-side* using JavaScript
        const filteredResults = allFetchedUsers.filter(user => {
          const isCurrentUser = user.uid === userId;

          // Check if username exists and is a string before calling toLowerCase
          const usernameString = user.username || ""; // Default to empty string if null/undefined
          const usernameLower = typeof usernameString === 'string' ? usernameString.toLowerCase() : "";

          // Check if the lowercase username starts with the lowercase query
          const matchesQuery = usernameLower.startsWith(lowerCaseQuery);

          // Return true if it's not the current user AND the username matches the query
          return !isCurrentUser && matchesQuery;
        });

        console.log("[Search Debug] Client-side filtered results:", filteredResults);
        setSearchResults(filteredResults);

      } catch (error) {
        console.error("[Search Debug] Error fetching or filtering users:", error);
        alert("An error occurred while searching for users. Check the console for details.");
        setSearchResults([]); // Clear results on error
      }
    };

    // Debounce timer remains the same
    const timerId = setTimeout(() => {
        searchUsers();
    }, 300);

    return () => clearTimeout(timerId);

  }, [searchQuery, userId, db]); // Include db in dependencies

  // --- Interaction Handlers (Keep original logic, adapt where needed) ---

  const setLoadingState = (targetUserId, isLoading) => {
    setInteractionLoading((prev) => ({ ...prev, [targetUserId]: isLoading }));
  };

  // Send Friend Request
  const handleSendFriendRequest = async (toUserId) => {
    if (!userId || !toUserId) return;
    setLoadingState(toUserId, true);
    const requestId = `${userId}_${toUserId}`; // Unique ID for the request

    try {
      await setDoc(doc(db, "friendRequests", requestId), {
        fromUserId: userId,
        toUserId,
        status: "pending",
        createdAt: new Date(), // Optional: timestamp
      });
      // Optimistically update UI
      setSentRequests((prev) => ({ ...prev, [toUserId]: true }));
    } catch (error) {
      console.error("Error sending friend request:", error);
      alert("Failed to send friend request. Please try again.");
    } finally {
      setLoadingState(toUserId, false);
    }
  };

  // Cancel Friend Request
  const handleCancelFriendRequest = async (toUserId) => {
      if (!userId || !toUserId) return;
      setLoadingState(toUserId, true);
      const requestId = `${userId}_${toUserId}`; // ID of the request to cancel

      try {
          await deleteDoc(doc(db, "friendRequests", requestId));
          // Optimistically update UI
          setSentRequests((prev) => {
              const updated = { ...prev };
              delete updated[toUserId]; // Remove from sent requests map
              return updated;
          });
      } catch (error) {
          console.error("Error cancelling friend request:", error);
          alert("Failed to cancel friend request. Please try again.");
      } finally {
          setLoadingState(toUserId, false);
      }
  };


  // Accept Friend Request
  const acceptFriendRequest = async (fromUserId) => {
    if (!userId) return;
    setLoadingState(fromUserId, true);
    const requestId = `${fromUserId}_${userId}`;

    try {
      // Update request status
      await updateDoc(doc(db, "friendRequests", requestId), {
        status: "accepted",
      });

      // Add friend to both users' friend lists (use setDoc with merge:true to create if not exists)
      const currentUserFriendsRef = doc(db, "friends", userId);
      await setDoc(currentUserFriendsRef, { friends: arrayUnion(fromUserId) }, { merge: true });

      const senderFriendsRef = doc(db, "friends", fromUserId);
      await setDoc(senderFriendsRef, { friends: arrayUnion(userId) }, { merge: true });

      // No need to manually update friendRequests state, listener will do it.
    } catch (error) {
      console.error("Error accepting friend request:", error);
      alert("Failed to accept friend request. Please try again.");
      // Consider removing router.push('/home') on failure, keep user on page
    } finally {
      setLoadingState(fromUserId, false);
    }
  };

  // Reject Friend Request
  const rejectFriendRequest = async (fromUserId) => {
    if (!userId) return;
    setLoadingState(fromUserId, true);
    const requestId = `${fromUserId}_${userId}`;

    try {
      // Option 1: Update status to 'rejected' (keeps a record)
       await updateDoc(doc(db, "friendRequests", requestId), {
         status: "rejected",
       });
      // Option 2: Delete the request document (cleaner, no record)
      // await deleteDoc(doc(db, "friendRequests", requestId));

      // Listener will update the UI by removing the request from the list.
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      alert("Failed to reject friend request. Please try again.");
    } finally {
      setLoadingState(fromUserId, false);
    }
  };

  // Unfriend User
  const unfriendUser = async (friendId) => {
    if (!userId || !friendId) return;

    // Optional: Confirmation dialog
    // if (!window.confirm(`Are you sure you want to unfriend ${friends.find(f => f.uid === friendId)?.username}?`)) {
    //     return;
    // }

    setLoadingState(friendId, true);
    try {
      // Remove from current user's list
      const currentUserFriendsRef = doc(db, "friends", userId);
      await updateDoc(currentUserFriendsRef, { friends: arrayRemove(friendId) }); // Use updateDoc assuming doc exists

      // Remove from the other user's list
      const friendFriendsRef = doc(db, "friends", friendId);
      await updateDoc(friendFriendsRef, { friends: arrayRemove(userId) });

       // Listener will update the friends list UI.
    } catch (error) {
      console.error("Error unfriending user:", error);
       alert("Failed to unfriend user. Please try again.");
       // Consider handling cases where friend doc might not exist or removing router.push
    } finally {
      setLoadingState(friendId, false);
    }
  };

  // --- Render Logic ---

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Mosaic color="#4f46e5" size="medium" text="" textColor="" />
        </div>
      );
    }

    switch (activeTab) {
      case "requests":
        return (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-300">
              Friend Requests ({friendRequests.length})
            </h2>
            {friendRequests.length > 0 ? (
              friendRequests.map((request) => (
                <UserListItem
                  key={request.id} // Use unique request ID
                  user={request} // Contains user data like username, avatar + fromUserId
                  type="request"
                  onAccept={acceptFriendRequest}
                  onReject={rejectFriendRequest}
                  isLoading={interactionLoading[request.fromUserId]}
                />
              ))
            ) : (
              <p className="text-gray-500 text-center py-6">No pending friend requests.</p>
            )}
          </div>
        );

      case "add":
        return (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-300">
              Add Friends
            </h2>
            <input
              type="text"
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-3 mb-6 bg-gray-800 rounded-lg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
             {/* Display Search Results */}
             {searchQuery.trim() && searchResults.length === 0 && (
                 <p className="text-gray-500 text-center py-6">No users found matching "{searchQuery}".</p>
             )}
             {searchResults.length > 0 && (
                 <div className="space-y-3">
                    {searchResults.map((user) => {
                        const isFriend = friends.some(friend => friend.uid === user.uid);
                        const hasIncomingRequest = friendRequests.some(req => req.fromUserId === user.uid);
                        // Prevent adding if already friends or if there's an incoming request from them
                        if (isFriend || hasIncomingRequest) return null;

                        return (
                           <UserListItem
                            key={user.uid}
                            user={user}
                            type="search"
                            onAddFriend={handleSendFriendRequest}
                            onCancelRequest={handleCancelFriendRequest}
                            isRequestSent={!!sentRequests[user.uid]} // Check if request is already sent
                            isLoading={interactionLoading[user.uid]}
                          />
                        )
                     })}
                 </div>
             )}
              {!searchQuery.trim() && (
                 <p className="text-gray-500 text-center py-6">Enter a username to find users.</p>
              )}
          </div>
        );

      case "friends": // Default tab
      default:
        return (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-300">
              Friends ({friends.length})
            </h2>
            {friends.length > 0 ? (
              friends.map((friend) => (
                <UserListItem
                  key={friend.uid}
                  user={friend}
                  type="friend"
                  onUnfriend={unfriendUser}
                  isLoading={interactionLoading[friend.uid]}
                />
              ))
            ) : (
              <p className="text-gray-500 text-center py-6">You haven't added any friends yet. Go to the 'Add Friends' tab to find users!</p>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-black text-gray-200">
      <NavBar />
      <main className="pt-20 pb-12 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-6 text-white text-center sm:text-left">Buddies</h1>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-700">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("friends")}
              className={`${
                activeTab === "friends"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500"
              } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Friends
            </button>
            <button
              onClick={() => setActiveTab("requests")}
              className={`${
                activeTab === "requests"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500"
              } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors relative`} // Added relative positioning
            >
              Requests
              {/* Badge for request count */}
              {friendRequests.length > 0 && (
                 <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full absolute -top-1 -right-3 transform translate-x-1/2 -translate-y-1/2">
                    {friendRequests.length}
                 </span>
               )}

            </button>
            <button
              onClick={() => setActiveTab("add")}
              className={`${
                activeTab === "add"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500"
              } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Add Friends
            </button>
          </nav>
        </div>

        {/* Tab Content Area */}
        <div className="bg-gray-850 shadow-xl rounded-lg p-5 md:p-8">
             {renderTabContent()}
        </div>

      </main>
    </div>
  );
};

export default BuddiesPage;