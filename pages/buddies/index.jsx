import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import Navbar from "../../components/NavBar";
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
  arrayRemove,
} from "firebase/firestore";
import { Mosaic } from "react-loading-indicators";

const BuddiesPage = () => {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sentRequests, setSentRequests] = useState({});
  const [interactionLoading, setInteractionLoading] = useState({});
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (!userId) return;

    const fetchFriendsAndRequests = async () => {
      setLoading(true);

      const friendsRef = doc(db, "friends", userId);
      const unsubscribeFriends = onSnapshot(friendsRef, async (docSnap) => {
        if (docSnap.exists()) {
          const friendIds = docSnap.data().friends || [];
          const friendsWithUsernames = await Promise.all(
            friendIds.map(async (friendId) => {
              const userDocRef = doc(db, "users", friendId);
              const userDoc = await getDoc(userDocRef);
              return userDoc.exists()
                ? { uid: friendId, ...userDoc.data() }
                : null;
            })
          );
          setFriends(friendsWithUsernames.filter(Boolean));
        }
      });

      const requestsQuery = query(
        collection(db, "friendRequests"),
        where("toUserId", "==", userId),
        where("status", "==", "pending")
      );
      const unsubscribeRequests = onSnapshot(
        requestsQuery,
        async (snapshot) => {
          const requests = await Promise.all(
            snapshot.docs.map(async (docSnap) => {
              const requestData = docSnap.data();
              const userDocRef = doc(db, "users", requestData.fromUserId);
              const userDoc = await getDoc(userDocRef);
              return userDoc.exists()
                ? { ...requestData, ...userDoc.data() }
                : null;
            })
          );
          setFriendRequests(requests.filter(Boolean));
        }
      );

      setLoading(false);
      return () => {
        unsubscribeFriends();
        unsubscribeRequests();
      };
    };
    fetchFriendsAndRequests();
  }, [userId]);

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

      const filteredResults = usersSnapshot.docs
        .map((doc) => ({ uid: doc.id, ...doc.data() }))
        .filter((user) => user.uid !== userId);

      setSearchResults(filteredResults);
    };
    searchUsers();
  }, [searchQuery, userId]);

  const handleFriendRequest = async (toUserId) => {
    if (!userId || !toUserId) return;
    const requestId = `${userId}_${toUserId}`;
    setInteractionLoading((prev) => ({ ...prev, [toUserId]: true }));

    try {
      if (sentRequests[toUserId]) {
        await updateDoc(doc(db, "friendRequests", requestId), {
          status: "rejected",
        });
        setSentRequests((prev) => ({ ...prev, [toUserId]: false }));
      } else {
        await setDoc(doc(db, "friendRequests", requestId), {
          fromUserId: userId,
          toUserId,
          status: "pending",
        });
        setSentRequests((prev) => ({ ...prev, [toUserId]: true }));
      }
    } catch (error) {
      console.error("Error handling friend request:", error);
      alert("Failed to send friend request. Please try again.");
    } finally {
      setInteractionLoading((prev) => ({ ...prev, [toUserId]: false }));
    }
  };

  const acceptFriendRequest = async (fromUserId) => {
    if (!userId) return;
    setInteractionLoading((prev) => ({ ...prev, [fromUserId]: true }));
    const requestId = `${fromUserId}_${userId}`;

    try {
      await updateDoc(doc(db, "friendRequests", requestId), {
        status: "accepted",
      });

      const friendsRef = doc(db, "friends", userId);
      await updateDoc(friendsRef, { friends: arrayUnion(fromUserId) });

      const fromUserFriendsRef = doc(db, "friends", fromUserId);
      await updateDoc(fromUserFriendsRef, { friends: arrayUnion(userId) });
    } catch (error) {
      console.error("Error accepting friend request:", error);
      alert("Failed to accept friend request. Please try again.");
    } finally {
      setInteractionLoading((prev) => ({ ...prev, [fromUserId]: false }));
    }
  };

  const rejectFriendRequest = async (fromUserId) => {
    if (!userId) return;
    setInteractionLoading((prev) => ({ ...prev, [fromUserId]: true }));
    const requestId = `${fromUserId}_${userId}`;

    try {
      await updateDoc(doc(db, "friendRequests", requestId), {
        status: "rejected",
      });
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      alert("Failed to reject friend request. Please try again.");
    } finally {
      setInteractionLoading((prev) => ({ ...prev, [fromUserId]: false }));
    }
  };

  const unfriendUser = async (friendId) => {
    if (!userId) return;
    setInteractionLoading((prev) => ({ ...prev, [friendId]: true }));
    try {
      const friendsRef = doc(db, "friends", userId);
      await updateDoc(friendsRef, { friends: arrayRemove(friendId) });

      const friendFriendsRef = doc(db, "friends", friendId);
      await updateDoc(friendFriendsRef, { friends: arrayRemove(userId) });
    } catch (error) {
      console.error("Error unfriend user:", error);
    } finally {
      setInteractionLoading((prev) => ({ ...prev, [friendId]: false }));
    }
  };
  const UserListItem = ({
    user,
    request,
    isFriend,
    handleRequest,
    acceptRequest,
    rejectRequest,
    isSentRequest,
    unfriend,
    loading,
  }) => {
    return (
      <div className="flex items-center justify-between p-4 rounded-lg mb-3 bg-gray-900 border border-gray-800 shadow-md hover:shadow-lg transition-shadow">
        <div className="flex items-center">
          <img
            src={
              user.avatar ||
              "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"
            }
            alt="Avatar"
            className="w-10 h-10 rounded-full mr-3"
          />
          <p className="text-lg font-semibold">{user.username}</p>
        </div>
        <div>
          {request && (
            <div className="flex gap-2">
              <button
                onClick={() => acceptRequest(user.uid)}
                className={`bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors ${
                  loading ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={loading}
              >
                Accept
              </button>
              <button
                onClick={() => rejectRequest(user.uid)}
                className={`bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors ${
                  loading ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={loading}
              >
                Reject
              </button>
            </div>
          )}
          {isFriend && (
            <button
              onClick={() => unfriend(user.uid)}
              className={`bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={loading}
            >
              Unfriend
            </button>
          )}
          {!request && !isFriend && (
            <button
              onClick={() => handleRequest(user.uid)}
              className={`py-2 px-4 rounded transition-colors ${
                isSentRequest
                  ? "bg-gray-700 text-white hover:bg-gray-800"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={loading}
            >
              {isSentRequest ? "Request Sent" : "Add Friend"}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-primary text-white">
      <Navbar />
      <main className="p-6 mt-24 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-white">Buddies</h1>
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Mosaic color="#4f46e5" size="medium" text="" textColor="" />
          </div>
        ) : (
          <>
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-300">
                Friend Requests
              </h2>
              {friendRequests.length > 0 ? (
                friendRequests.map((request) => (
                  <UserListItem
                    key={request.fromUserId}
                    user={request}
                    request
                    acceptRequest={acceptFriendRequest}
                    rejectRequest={rejectFriendRequest}
                    loading={interactionLoading[request.fromUserId]}
                  />
                ))
              ) : (
                <p className="text-gray-500">No pending friend requests.</p>
              )}
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-300">
                Friends
              </h2>
              {friends.length > 0 ? (
                friends.map((friend) => (
                  <UserListItem
                    key={friend.uid}
                    user={friend}
                    isFriend
                    unfriend={unfriendUser}
                    loading={interactionLoading[friend.uid]}
                  />
                ))
              ) : (
                <p className="text-gray-500">No friends yet.</p>
              )}
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-300">
                Search for Users
              </h2>
              <input
                type="text"
                placeholder="Search by username"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 text-white focus:outline-none focus:border-blue-500"
              />
              {searchResults.length > 0 ? (
                <div className="mt-4">
                  {searchResults.map((user) => (
                    <UserListItem
                      key={user.uid}
                      user={user}
                      handleRequest={handleFriendRequest}
                      isSentRequest={sentRequests[user.uid]}
                      loading={interactionLoading[user.uid]}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 mt-4">No users found.</p>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default BuddiesPage;