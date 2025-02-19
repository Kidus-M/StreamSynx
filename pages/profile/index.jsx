import { useState, useEffect } from "react";
import { auth, db } from "../../firebase"; // Removed storage import
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/router";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data());
          setUsername(userDoc.data().username);
          setEmail(userDoc.data().email);
        }
      } else {
        router.push("/"); // Redirect to sign-in if not authenticated
      }
    };

    fetchUserData();
  }, [router]);

  const handleSave = async () => {
    const user = auth.currentUser;
    if (user) {
      // Update user data in Firestore (only username in this case)
      await updateDoc(doc(db, "users", user.uid), {
        username,
      });

      setIsEditing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center p-6">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Profile</h1>
        <div className="flex flex-col items-center">
          {isEditing ? (
            <>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-2 border rounded mb-4"
                placeholder="Username"
              />
              <button
                onClick={handleSave}
                className="w-full bg-blue-500 text-white py-2 rounded"
              >
                Save
              </button>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold">{username}</p>
              <p className="text-gray-600">{email}</p>
              <button
                onClick={() => setIsEditing(true)}
                className="mt-4 bg-blue-500 text-white py-2 px-4 rounded"
              >
                Edit Profile
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}