// pages/buddies.js (or wherever it resides)
import React, { useState, useEffect, useCallback } from "react";
import { auth, db } from "../../firebase"; // Assuming firebase config is correct
import NavBar from "../../components/NavBar"; // Assuming NavBar component exists
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  limit,
} from "firebase/firestore";
import toast, { Toaster } from "react-hot-toast";
import { Mosaic } from "react-loading-indicators";
import { useRouter } from "next/router";
import {
  FaUserPlus,
  FaUserCheck,
  FaUserTimes,
  FaUserClock,
  FaCheck,
  FaTimes,
  FaTrashAlt,
} from "react-icons/fa"; // Import icons

// --- Updated UserListItem with Theme ---
const UserListItem = ({
  user,
  type, // 'friend', 'request', 'search'
  onAccept,
  onReject,
  onUnfriend,
  onAddFriend,
  onCancelRequest,
  isRequestSent,
  isLoading,
}) => {
  const handleAction = (action, userId) => {
    if (!isLoading) action(userId);
  };

  // Define button styles based on type and state using theme colors
  const getButtonConfig = () => {
    switch (type) {
      case "request":
        return [
          {
            label: "Accept",
            action: onAccept,
            icon: FaCheck,
            userId: user.fromUserId,
            className:
              "bg-emerald-600/80 hover:bg-emerald-600 text-white border border-emerald-600",
          },
          {
            label: "Reject",
            action: onReject,
            icon: FaTimes,
            userId: user.fromUserId,
            className:
              "bg-red-600/80 hover:bg-red-600 text-white border border-red-600",
          },
          // Alternative subtle style:
          // { label: "Accept", action: onAccept, icon: FaCheck, userId: user.fromUserId, className: "bg-green-700/20 text-green-300 border border-green-600/50 hover:bg-green-600/30 hover:text-green-200"},
          // { label: "Reject", action: onReject, icon: FaTimes, userId: user.fromUserId, className: "bg-red-700/20 text-red-300 border border-red-600/50 hover:bg-red-600/30 hover:text-red-200" },
        ];
      case "friend":
        return [
          {
            label: "Unfriend",
            action: onUnfriend,
            icon: FaUserTimes,
            userId: user.uid,
            className:
              "bg-red-600/80 hover:bg-red-600 text-white border border-red-600",
          },
          // Alternative subtle style:
          // { label: "Unfriend", action: onUnfriend, icon: FaTrashAlt, userId: user.uid, className: "bg-red-700/20 text-red-300 border border-red-600/50 hover:bg-red-600/30 hover:text-red-200" }
        ];
      case "search":
        if (isRequestSent) {
          return [
            {
              label: "Cancel Request",
              action: onCancelRequest,
              icon: FaUserClock,
              userId: user.uid,
              className:
                "bg-secondary-light text-textsecondary hover:bg-secondary hover:text-textprimary border border-secondary-light",
            },
          ];
        } else {
          return [
            {
              label: "Add Friend",
              action: onAddFriend,
              icon: FaUserPlus,
              userId: user.uid,
              className:
                "bg-accent hover:bg-accent-hover text-primary border border-transparent",
            },
          ]; // Accent for Add
        }
      default:
        return [];
    }
  };

  const buttons = getButtonConfig();

  return (
    // Themed list item background, border, hover
    <div className="flex items-center justify-between p-3 md:p-4 rounded-lg mb-3 bg-secondary border border-secondary-light shadow-sm hover:bg-secondary-light transition-colors duration-150 ease-in-out">
      <div className="flex items-center overflow-hidden mr-3">
        <img
          src={
            user.avatar ||
            "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"
          }
          alt={`${user.username}'s Avatar`}
          className="w-10 h-10 rounded-full mr-3 flex-shrink-0 border-2 border-secondary-light" // Added border
        />
        {/* Themed text */}
        <p className="text-md font-medium text-textprimary truncate">
          {user.username || "Unknown User"}
        </p>
      </div>
      {/* Buttons Section */}
      <div className="flex-shrink-0 flex items-center gap-2">
        {buttons.map((btn) => (
          <button
            key={btn.label}
            onClick={() => handleAction(btn.action, btn.userId)}
            // Themed button styles, consistent padding/text size
            className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out ${
              btn.className
            } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={isLoading}
            title={btn.label} // Tooltip for icon buttons
          >
            {/* Optionally hide text on smaller screens */}
            <btn.icon /> <span className="hidden sm:inline">{btn.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
// --- End UserListItem ---

const BuddiesPage = () => {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sentRequests, setSentRequests] = useState({});
  const [interactionLoading, setInteractionLoading] = useState({});
  const [activeTab, setActiveTab] = useState("friends");

  const userId = auth.currentUser?.uid;
  const router = useRouter();

  // Data Fetching (Keep as is, uses onSnapshot)
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let combinedLoading = { friends: true, requests: true, sent: true };
    const updateCombinedLoading = (key, value) => {
      combinedLoading[key] = value;
      if (
        !combinedLoading.friends &&
        !combinedLoading.requests &&
        !combinedLoading.sent
      ) {
        setLoading(false);
      }
    };
    const friendsRef = doc(db, "friends", userId);
    const unsubscribeFriends = onSnapshot(
      friendsRef,
      async (docSnap) => {
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
          setFriends([]);
        }
        updateCombinedLoading("friends", false);
      },
      (error) => {
        console.error("Error fetching friends:", error);
        updateCombinedLoading("friends", false);
      }
    );
    const incomingRequestsQuery = query(
      collection(db, "friendRequests"),
      where("toUserId", "==", userId),
      where("status", "==", "pending")
    );
    const unsubscribeRequests = onSnapshot(
      incomingRequestsQuery,
      async (snapshot) => {
        const requestsData = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const requestData = docSnap.data();
            const userDocRef = doc(db, "users", requestData.fromUserId);
            const userDoc = await getDoc(userDocRef);
            return userDoc.exists()
              ? {
                  ...requestData,
                  uid: requestData.fromUserId,
                  ...userDoc.data(),
                  id: docSnap.id,
                }
              : null;
          })
        );
        setFriendRequests(requestsData.filter(Boolean));
        updateCombinedLoading("requests", false);
      },
      (error) => {
        console.error("Error fetching friend requests:", error);
        updateCombinedLoading("requests", false);
      }
    );
    const fetchOutgoingRequests = async () => {
      const outgoingRequestsQuery = query(
        collection(db, "friendRequests"),
        where("fromUserId", "==", userId),
        where("status", "==", "pending")
      );
      try {
        const snapshot = await getDocs(outgoingRequestsQuery);
        const sentMap = {};
        snapshot.docs.forEach((doc) => {
          sentMap[doc.data().toUserId] = true;
        });
        setSentRequests(sentMap);
      } catch (error) {
        console.error("Error fetching outgoing requests:", error);
      } finally {
        updateCombinedLoading("sent", false);
      }
    };
    fetchOutgoingRequests();
    return () => {
      unsubscribeFriends();
      unsubscribeRequests();
    };
  }, [userId]);

  // User Search (Keep client-side search logic as is)
  useEffect(() => {
    const searchUsers = async () => {
      const trimmedQuery = searchQuery.trim();
      if (!trimmedQuery) {
        setSearchResults([]);
        return;
      }
      if (!userId) return;
      const lowerCaseQuery = trimmedQuery.toLowerCase();
      const usersQuery = query(collection(db, "users"), limit(100));
      try {
        const usersSnapshot = await getDocs(usersQuery);
        const allFetchedUsers = usersSnapshot.docs.map((doc) => ({
          uid: doc.id,
          ...doc.data(),
        }));
        const filteredResults = allFetchedUsers.filter((user) => {
          const isCurrentUser = user.uid === userId;
          const usernameString = user.username || "";
          const usernameLower =
            typeof usernameString === "string"
              ? usernameString.toLowerCase()
              : "";
          const matchesQuery = usernameLower.startsWith(lowerCaseQuery);
          return !isCurrentUser && matchesQuery;
        });
        setSearchResults(filteredResults);
      } catch (error) {
        console.error(
          "[Search Debug] Error fetching or filtering users:",
          error
        );
        setSearchResults([]);
      }
    };
    const timerId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timerId);
  }, [searchQuery, userId, db]); // Added db dependency

  // Interaction Handlers (Keep logic as is)
  const setLoadingState = (targetUserId, isLoading) => {
    setInteractionLoading((prev) => ({ ...prev, [targetUserId]: isLoading }));
  };
  const handleSendFriendRequest = async (toUserId) => {
    if (!userId || !toUserId) return;
    setLoadingState(toUserId, true);
    const requestId = `${userId}_${toUserId}`;
    try {
      await setDoc(doc(db, "friendRequests", requestId), {
        fromUserId: userId,
        toUserId,
        status: "pending",
        createdAt: new Date(),
      });
      setSentRequests((prev) => ({ ...prev, [toUserId]: true }));
      toast.success("Friend request sent!"); // Added toast
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast.error("Failed to send request."); // Use toast
    } finally {
      setLoadingState(toUserId, false);
    }
  };
  const handleCancelFriendRequest = async (toUserId) => {
    if (!userId || !toUserId) return;
    setLoadingState(toUserId, true);
    const requestId = `${userId}_${toUserId}`;
    try {
      await deleteDoc(doc(db, "friendRequests", requestId));
      setSentRequests((prev) => {
        const updated = { ...prev };
        delete updated[toUserId];
        return updated;
      });
      toast.success("Request cancelled."); // Added toast
    } catch (error) {
      console.error("Error cancelling friend request:", error);
      toast.error("Failed to cancel request."); // Use toast
    } finally {
      setLoadingState(toUserId, false);
    }
  };
  const acceptFriendRequest = async (fromUserId) => {
    if (!userId) return;
    setLoadingState(fromUserId, true);
    const requestId = `${fromUserId}_${userId}`;
    try {
      await updateDoc(doc(db, "friendRequests", requestId), {
        status: "accepted",
      });
      const currentUserFriendsRef = doc(db, "friends", userId);
      await setDoc(
        currentUserFriendsRef,
        { friends: arrayUnion(fromUserId) },
        { merge: true }
      );
      const senderFriendsRef = doc(db, "friends", fromUserId);
      await setDoc(
        senderFriendsRef,
        { friends: arrayUnion(userId) },
        { merge: true }
      );
      toast.success("Friend request accepted!"); // Added toast
    } catch (error) {
      console.error("Error accepting friend request:", error);
      toast.error("Failed to accept request."); // Use toast
    } finally {
      setLoadingState(fromUserId, false);
    }
  };
  const rejectFriendRequest = async (fromUserId) => {
    if (!userId) return;
    setLoadingState(fromUserId, true);
    const requestId = `${fromUserId}_${userId}`;
    try {
      await updateDoc(doc(db, "friendRequests", requestId), {
        status: "rejected",
      });
      toast.info("Friend request rejected."); // Added toast
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      toast.error("Failed to reject request."); // Use toast
    } finally {
      setLoadingState(fromUserId, false);
    }
  };
  const unfriendUser = async (friendId) => {
    if (!userId || !friendId) return;
    if (
      !window.confirm(
        `Are you sure you want to unfriend ${
          friends.find((f) => f.uid === friendId)?.username || "this user"
        }?`
      )
    )
      return;
    setLoadingState(friendId, true);
    try {
      const currentUserFriendsRef = doc(db, "friends", userId);
      await updateDoc(currentUserFriendsRef, {
        friends: arrayRemove(friendId),
      });
      const friendFriendsRef = doc(db, "friends", friendId);
      await updateDoc(friendFriendsRef, { friends: arrayRemove(userId) });
      toast.info("Friend removed."); // Added toast
    } catch (error) {
      console.error("Error unfriending user:", error);
      toast.error("Failed to unfriend user."); // Use toast
    } finally {
      setLoadingState(friendId, false);
    }
  };

  // --- Render Logic ---
  const renderTabContent = () => {
    // Use Themed Loader
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Mosaic color="#DAA520" size="medium" />
        </div>
      );
    }

    switch (activeTab) {
      case "requests":
        return (
          <div>
            {/* Themed text */}
            <h2 className="text-xl font-semibold mb-4 text-textprimary">
              Friend Requests ({friendRequests.length})
            </h2>
            {friendRequests.length > 0 ? (
              friendRequests.map((request) => (
                <UserListItem
                  key={request.id}
                  user={request}
                  type="request"
                  onAccept={acceptFriendRequest}
                  onReject={rejectFriendRequest}
                  isLoading={interactionLoading[request.fromUserId]}
                />
              ))
            ) : (
              // Themed empty state text
              <p className="text-textsecondary text-center py-6 italic">
                No pending friend requests.
              </p>
            )}
          </div>
        );

      case "add":
        return (
          <div>
            {/* Themed text */}
            <h2 className="text-xl font-semibold mb-4 text-textprimary">
              Add Friends
            </h2>
            {/* Themed input */}
            <input
              type="text"
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-3 mb-6 bg-primary rounded-lg border border-secondary-light text-textprimary placeholder-textsecondary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent" // Updated styles
            />
            {/* Display Search Results */}
            {searchQuery.trim() && searchResults.length === 0 && (
              <p className="text-textsecondary text-center py-6 italic">
                No users found matching "{searchQuery}".
              </p>
            )}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                {" "}
                {/* Reduced space slightly */}
                {searchResults.map((user) => {
                  const isFriend = friends.some(
                    (friend) => friend.uid === user.uid
                  );
                  const hasIncomingRequest = friendRequests.some(
                    (req) => req.fromUserId === user.uid
                  );
                  // Exclude self, friends, and those with pending incoming requests
                  if (user.uid === userId || isFriend || hasIncomingRequest)
                    return null;
                  return (
                    <UserListItem
                      key={user.uid}
                      user={user}
                      type="search"
                      onAddFriend={handleSendFriendRequest}
                      onCancelRequest={handleCancelFriendRequest}
                      isRequestSent={!!sentRequests[user.uid]}
                      isLoading={interactionLoading[user.uid]}
                    />
                  );
                })}
              </div>
            )}
            {!searchQuery.trim() && (
              <p className="text-textsecondary text-center py-6 italic">
                Enter a username to find users.
              </p>
            )}
          </div>
        );

      case "friends": // Default tab
      default:
        return (
          <div>
            {/* Themed text */}
            <h2 className="text-xl font-semibold mb-4 text-textprimary">
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
              // Themed empty state text
              <p className="text-textsecondary text-center py-6 italic">
                You haven't added any friends yet. Use the 'Add Friends' tab!
              </p>
            )}
          </div>
        );
    }
  };

  return (
    // Themed background and text
    <div className="min-h-screen bg-primary text-textprimary font-poppins">
      <toaster
        position="bottom-center"
        toastOptions={{ className: "bg-secondary text-textprimary" }}
      />
      <NavBar />
      {/* Adjusted padding and max-width */}
      <main className="pt-20 pb-12 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Themed heading */}
        <h1 className="text-3xl font-bold mb-6 text-textprimary text-center sm:text-left">
          Buddies
        </h1>

        {/* Tab Navigation - Themed */}
        <div className="mb-6 border-b border-secondary-light">
          {" "}
          {/* Themed border */}
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("friends")}
              className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ease-in-out ${
                activeTab === "friends"
                  ? "border-accent text-accent" // Accent color for active
                  : "border-transparent text-textsecondary hover:text-textprimary hover:border-secondary-light" // Themed inactive/hover
              }`}
            >
              {" "}
              Friends{" "}
            </button>
            <button
              onClick={() => setActiveTab("requests")}
              className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ease-in-out relative ${
                activeTab === "requests"
                  ? "border-accent text-accent" // Accent color for active
                  : "border-transparent text-textsecondary hover:text-textprimary hover:border-secondary-light" // Themed inactive/hover
              }`}
            >
              {" "}
              Requests
              {friendRequests.length > 0 && (
                // Keep badge red or use accent? Let's keep red for notification standard. Adjusted styling slightly.
                <span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/3">
                  {friendRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("add")}
              className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ease-in-out ${
                activeTab === "add"
                  ? "border-accent text-accent" // Accent color for active
                  : "border-transparent text-textsecondary hover:text-textprimary hover:border-secondary-light" // Themed inactive/hover
              }`}
            >
              {" "}
              Add Friends{" "}
            </button>
          </nav>
        </div>

        {/* Tab Content Area - Themed */}
        <div className="bg-secondary shadow-xl rounded-lg p-4 md:p-6">
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
};

export default BuddiesPage;
