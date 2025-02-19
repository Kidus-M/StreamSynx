import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/router";
import NavBar from "../../components/Navbar";
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
    <div className="min-h-screen bg-gray-900 flex justify-center items-center p-6">
        <NavBar />
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md border border-gray-700">
        <h1 className="text-2xl font-bold mb-6 text-center text-white">
          Profile
        </h1>
        <div className="flex flex-col items-center">
          {isEditing ? (
            <>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                placeholder="Username"
              />
              <button
                onClick={handleSave}
                className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-all"
              >
                Save Changes
              </button>
            </>
          ) : (
            <>
              <div className="text-center">
                <p className="text-xl font-semibold text-white">{username}</p>
                <p className="text-gray-400 mt-1">{email}</p>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="mt-6 bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-all"
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