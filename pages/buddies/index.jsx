import React, { useEffect, useState } from "react";
import NavBar from "../../components/Navbar";
import { auth, db } from "../../firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

const BuddiesPage = () => {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const userId = auth.currentUser?.uid;

  // Fetch friends and friend requests
  useEffect(() => {
    const fetchFriendsAndRequests = async () => {
      if (userId) {
        // Fetch friends
        const friendsRef = doc(db, "friends", userId);
        const friendsDoc = await getDoc(friendsRef);
        if (friendsDoc.exists()) {
          setFriends(friendsDoc.data().friends || []);
        }

        // Fetch friend requests
        const requestsQuery = query(
          collection(db, "friendRequests"),
          where("toUserId", "==", userId),
          where("status", "==", "pending")
        );
        const requestsSnapshot = await getDocs(requestsQuery);
        setFriendRequests(requestsSnapshot.docs.map((doc) => doc.data()));
      }
    };
    fetchFriendsAndRequests();
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
      setSearchResults(usersSnapshot.docs.map((doc) => doc.data()));
    };

    searchUsers();
  }, [searchQuery]);

  // Send friend request
  const sendFriendRequest = async (toUserId) => {
    if (!userId) return;

    await setDoc(doc(db, "friendRequests", `${userId}_${toUserId}`), {
      fromUserId: userId,
      toUserId,
      status: "pending",
    });
  };

  // Accept friend request
  const acceptFriendRequest = async (fromUserId) => {
    if (!userId) return;

    // Update friend request status
    await updateDoc(doc(db, "friendRequests", `${fromUserId}_${userId}`), {
      status: "accepted",
    });

    // Add to friends list
    const friendsRef = doc(db, "friends", userId);
    await updateDoc(friendsRef, {
      friends: arrayUnion(fromUserId),
    });

    const requesterFriendsRef = doc(db, "friends", fromUserId);
    await updateDoc(requesterFriendsRef, {
      friends: arrayUnion(userId),
    });

    // Update local state
    setFriendRequests((prev) => prev.filter((req) => req.fromUserId !== fromUserId));
    setFriends((prev) => [...prev, fromUserId]);
  };

  // Reject friend request
  const rejectFriendRequest = async (fromUserId) => {
    if (!userId) return;

    await updateDoc(doc(db, "friendRequests", `${fromUserId}_${userId}`), {
      status: "rejected",
    });

    // Update local state
    setFriendRequests((prev) => prev.filter((req) => req.fromUserId !== fromUserId));
  };

  return (
    <div className="min-h-screen bg-primary text-white">
      <NavBar />
      <main className="p-6 mt-24">
        <h1 className="text-3xl font-bold mb-8 text-secondary">Buddies</h1>

        {/* Friend Requests Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-secondary">Friend Requests</h2>
          {friendRequests.length > 0 ? (
            friendRequests.map((request) => (
              <div
                key={request.fromUserId}
                className="bg-gray-800 p-4 rounded-lg mb-3 shadow-md hover:shadow-lg transition-shadow"
              >
                <p className="text-lg font-semibold">{request.fromUserId}</p>
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
            friends.map((friendId) => (
              <div
                key={friendId}
                className="bg-gray-800 p-4 rounded-lg mb-3 shadow-md hover:shadow-lg transition-shadow"
              >
                <p className="text-lg font-semibold">{friendId}</p>
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
                  key={user.userId}
                  className="bg-gray-800 p-4 rounded-lg mb-3 shadow-md hover:shadow-lg transition-shadow"
                >
                  <p className="text-lg font-semibold">{user.username}</p>
                  <button
                    onClick={() => sendFriendRequest(user.userId)}
                    className="mt-2 bg-secondary text-white py-1 px-3 rounded hover:bg-secondary-dark transition-colors"
                  >
                    Send Friend Request
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 mt-4">No users found.</p>
          )}
        </section>
      </main>
    </div>
  );
};

export default BuddiesPage;