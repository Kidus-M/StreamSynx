import React, { useEffect, useState } from "react";
import NavBar from "../../components/Navbar";
import { auth, db } from "../../firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from "firebase/firestore";

const BuddiesPage = () => {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sentRequests, setSentRequests] = useState({}); // Track sent requests
  const userId = auth.currentUser?.uid;

  // Fetch friends and friend requests
  useEffect(() => {
    if (!userId) return;

    // Fetch friends
    const friendsRef = doc(db, "friends", userId);
    const unsubscribeFriends = onSnapshot(friendsRef, async (docSnap) => { //rename doc to docSnap
      if (docSnap.exists()) {
        const friendIds = docSnap.data().friends || [];
        // Fetch usernames for friends
        const friendsWithUsernames = await Promise.all(
          friendIds.map(async (friendId) => {
            const userDocRef = doc(db, "users", friendId); // Correct usage of doc
            const userDoc = await getDoc(userDocRef);
            return userDoc.exists() ? { uid: friendId, username: userDoc.data().username } : null;
          })
        );
        setFriends(friendsWithUsernames.filter(Boolean));
      }
      setLoading(false);
    });

    // Fetch friend requests
    const requestsQuery = query(
      collection(db, "friendRequests"),
      where("toUserId", "==", userId),
      where("status", "==", "pending")
    );
    const unsubscribeRequests = onSnapshot(requestsQuery, async (snapshot) => {
      const requests = await Promise.all(
        snapshot.docs.map(async (docSnap) => { // Rename doc to docSnap to avoid confusion
          const requestData = docSnap.data();
          const userDocRef = doc(db, "users", requestData.fromUserId); // Correct usage of doc
          const userDoc = await getDoc(userDocRef);
          return userDoc.exists()
            ? { ...requestData, username: userDoc.data().username }
            : null;
        })
      );
      setFriendRequests(requests.filter(Boolean));
    });

    return () => {
      unsubscribeFriends();
      unsubscribeRequests();
    };
  }, [userId]);

  // Search for users in real-time
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery) {
        setSearchResults([]);
        return;
      }

      const usersQuery = query(
        collection(db, "users"),
        where("username", ">=", searchQuery),
        where("username", "<=", searchQuery + "\uf8ff")
      );
      const usersSnapshot = await getDocs(usersQuery);

      // Filter out the current user from search results
      const filteredResults = usersSnapshot.docs
        .map((doc) => ({ uid: doc.id, ...doc.data() }))
        .filter((user) => user.uid !== userId);

      setSearchResults(filteredResults);
    };

    searchUsers();
  }, [searchQuery, userId]);

  // Send or remove friend request
  const handleFriendRequest = async (toUserId) => {
    if (!userId || !toUserId) return;

    const requestId = `${userId}_${toUserId}`;
    const isRequestSent = sentRequests[toUserId];

    try {
      if (isRequestSent) {
        // Remove the request
        await updateDoc(doc(db, "friendRequests", requestId), {
          status: "rejected",
        });
        setSentRequests((prev) => ({ ...prev, [toUserId]: false }));
      } else {
        // Send the request
        await setDoc(doc(db, "friendRequests", requestId), {
          fromUserId: userId,
          toUserId,
          status: "pending",
        });
        setSentRequests((prev) => ({ ...prev, [toUserId]: true }));
      }
    } catch (error) {
      console.error("Error handling friend request:", error);
    }
  };

  // Accept friend request
  const acceptFriendRequest = async (fromUserId) => {
    if (!userId) return;
  
    try {
      // Update friend request status
      await updateDoc(doc(db, "friendRequests", `${fromUserId}_${userId}`), {
        status: "accepted",
      });
  
      // Add to friends list (Check and create if needed)
      const friendsRef = doc(db, "friends", userId);
      const friendsDoc = await getDoc(friendsRef);
  
      if (friendsDoc.exists()) {
        await updateDoc(friendsRef, {
          friends: arrayUnion(fromUserId),
        });
      } else {
        await setDoc(friendsRef, { friends: [fromUserId] }, { merge: true }); // Create if it doesn't exist
      }
  
      // Add requester to friends list (Check and create if needed)
      const requesterFriendsRef = doc(db, "friends", fromUserId);
      const requesterFriendsDoc = await getDoc(requesterFriendsRef);
  
      if (requesterFriendsDoc.exists()) {
        await updateDoc(requesterFriendsRef, {
          friends: arrayUnion(userId),
        });
      } else {
        await setDoc(requesterFriendsRef, { friends: [userId] }, { merge: true }); // Create if it doesn't exist
      }
  
      // Update local state
      setFriendRequests((prev) => prev.filter((req) => req.fromUserId !== fromUserId));
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  };

  // Reject friend request
  const rejectFriendRequest = async (fromUserId) => {
    if (!userId) return;

    try {
      await updateDoc(doc(db, "friendRequests", `${fromUserId}_${userId}`), {
        status: "rejected",
      });

      // Update local state
      setFriendRequests((prev) => prev.filter((req) => req.fromUserId !== fromUserId));
    } catch (error) {
      console.error("Error rejecting friend request:", error);
    }
  };

  return (
    <div className="min-h-screen bg-primary text-white">
      <NavBar />
      <main className="p-6 mt-24">
        <h1 className="text-3xl font-bold mb-8 text-secondary">Buddies</h1>

        {/* Loading State */}
        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : (
          <>
            {/* Friend Requests Section */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4 text-secondary">Friend Requests</h2>
              {friendRequests.length > 0 ? (
                friendRequests.map((request) => (
                  <div
                    key={request.fromUserId}
                    className="bg-gray-800 p-4 rounded-lg mb-3 shadow-md hover:shadow-lg transition-shadow"
                  >
                    <p className="text-lg font-semibold">{request.username}</p>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => acceptFriendRequest(request.fromUserId)}
                        className="bg-green-500 text-white py-1 px-3 rounded hover:bg-green-600 transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => rejectFriendRequest(request.fromUserId)}
                        className="bg-red-500 text-white py-1 px-3 rounded hover:bg-red-600 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400">No pending friend requests.</p>
              )}
            </section>

            {/* Friends List Section */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4 text-secondary">Friends</h2>
              {friends.length > 0 ? (
                friends.map((friend) => (
                  <div
                    key={friend.uid}
                    className="bg-gray-800 p-4 rounded-lg mb-3 shadow-md hover:shadow-lg transition-shadow"
                  >
                    <p className="text-lg font-semibold">{friend.username}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-400">No friends yet.</p>
              )}
            </section>

            {/* Search for Users Section */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-secondary">Search for Users</h2>
              <input
                type="text"
                placeholder="Search by username"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2 border border-secondary rounded-lg bg-gray-800 text-white focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
              />
              {searchResults.length > 0 ? (
                <div className="mt-4">
                  {searchResults.map((user) => (
                    <div
                      key={user.uid}
                      className="bg-gray-800 p-4 rounded-lg mb-3 shadow-md hover:shadow-lg transition-shadow"
                    >
                      <p className="text-lg font-semibold">{user.username}</p>
                      <button
                        onClick={() => handleFriendRequest(user.uid)}
                        className={`mt-2 py-1 px-3 rounded transition-colors ${
                          sentRequests[user.uid]
                            ? "bg-gray-500 text-white hover:bg-gray-600"
                            : "bg-secondary text-white hover:bg-secondary-dark"
                        }`}
                      >
                        {sentRequests[user.uid] ? "Request Sent" : "Send Friend Request"}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 mt-4">No users found.</p>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default BuddiesPage;