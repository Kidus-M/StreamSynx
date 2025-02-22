import React, { useEffect, useState } from "react";
import NavBar from "../../components/Navbar";
import { auth, db } from "../../firebase";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs } from "firebase/firestore";

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

  // Search for users
  const searchUsers = async () => {
    if (!searchQuery) return;

    const usersQuery = query(
      collection(db, "users"),
      where("username", ">=", searchQuery),
      where("username", "<=", searchQuery + "\uf8ff")
    );
    const usersSnapshot = await getDocs(usersQuery);
    setSearchResults(usersSnapshot.docs.map((doc) => doc.data()));
  };

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
    <div>
      <NavBar />
      <main className="p-6 mt-24 text-secondary">
        <h1 className="text-2xl font-bold mb-6">Buddies</h1>

        {/* Friend Requests */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Friend Requests</h2>
          {friendRequests.length > 0 ? (
            friendRequests.map((request) => (
              <div key={request.fromUserId} className="bg-gray-800 p-4 rounded-lg mb-2">
                <p>{request.fromUserId}</p>
                <button
                  onClick={() => acceptFriendRequest(request.fromUserId)}
                  className="bg-green-500 text-white py-1 px-2 rounded mr-2"
                >
                  Accept
                </button>
                <button
                  onClick={() => rejectFriendRequest(request.fromUserId)}
                  className="bg-red-500 text-white py-1 px-2 rounded"
                >
                  Reject
                </button>
              </div>
            ))
          ) : (
            <p className="text-gray-400">No pending friend requests.</p>
          )}
        </div>

        {/* Friends List */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Friends</h2>
          {friends.length > 0 ? (
            friends.map((friendId) => (
              <div key={friendId} className="bg-gray-800 p-4 rounded-lg mb-2">
                <p>{friendId}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-400">No friends yet.</p>
          )}
        </div>

        {/* Search for Users */}
        <div>
          <h2 className="text-xl font-bold mb-4">Search for Users</h2>
          <input
            type="text"
            placeholder="Search by username"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="p-2 border rounded mb-2"
          />
          <button
            onClick={searchUsers}
            className="bg-blue-500 text-white py-2 px-4 rounded"
          >
            Search
          </button>
          {searchResults.length > 0 ? (
            searchResults.map((user) => (
              <div key={user.userId} className="bg-gray-800 p-4 rounded-lg mb-2">
                <p>{user.username}</p>
                <button
                  onClick={() => sendFriendRequest(user.userId)}
                  className="bg-yellow-500 text-white py-1 px-2 rounded"
                >
                  Send Friend Request
                </button>
              </div>
            ))
          ) : (
            <p className="text-gray-400">No users found.</p>
          )}
        </div>
      </main>
    </div>
  );
};

export default BuddiesPage;