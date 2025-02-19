// import { useState, useEffect } from "react";
// import { auth, db, storage } from "../../firebase";
// import { doc, getDoc, updateDoc } from "firebase/firestore";
// import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
// import { useRouter } from "next/router";

// export default function Profile() {
//   const [user, setUser] = useState(null);
//   const [username, setUsername] = useState("");
//   const [email, setEmail] = useState("");
//   const [profilePicture, setProfilePicture] = useState("");
//   const [isEditing, setIsEditing] = useState(false);
//   const [file, setFile] = useState(null);
//   const router = useRouter();

//   useEffect(() => {
//     const fetchUserData = async () => {
//       const user = auth.currentUser;
//       if (user) {
//         const userDoc = await getDoc(doc(db, "users", user.uid));
//         if (userDoc.exists()) {
//           setUser(userDoc.data());
//           setUsername(userDoc.data().username);
//           setEmail(userDoc.data().email);
//           setProfilePicture(userDoc.data().profilePicture);
//         }
//       } else {
//         router.push("/"); // Redirect to sign-in if not authenticated
//       }
//     };

//     fetchUserData();
//   }, [router]);

//   const handleSave = async () => {
//     const user = auth.currentUser;
//     if (user) {
//       // Upload profile picture if a file is selected
//       let pictureUrl = profilePicture;
//       if (file) {
//         const storageRef = ref(storage, `profilePictures/${user.uid}`);
//         await uploadBytes(storageRef, file);
//         pictureUrl = await getDownloadURL(storageRef);
//       }

//       // Update user data in Firestore
//       await updateDoc(doc(db, "users", user.uid), {
//         username,
//         profilePicture: pictureUrl,
//       });

//       setProfilePicture(pictureUrl);
//       setIsEditing(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-100 flex justify-center items-center p-6">
//       <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
//         <h1 className="text-2xl font-bold mb-6 text-center">Profile</h1>
//         <div className="flex flex-col items-center">
//           <img
//             src={profilePicture || "/default-profile.png"}
//             alt="Profile"
//             className="w-24 h-24 rounded-full mb-4"
//           />
//           {isEditing ? (
//             <>
//               <input
//                 type="text"
//                 value={username}
//                 onChange={(e) => setUsername(e.target.value)}
//                 className="w-full p-2 border rounded mb-4"
//               />
//               <input
//                 type="file"
//                 onChange={(e) => setFile(e.target.files[0])}
//                 className="w-full p-2 border rounded mb-4"
//               />
//               <button
//                 onClick={handleSave}
//                 className="w-full bg-blue-500 text-white py-2 rounded"
//               >
//                 Save
//               </button>
//             </>
//           ) : (
//             <>
//               <p className="text-lg font-semibold">{username}</p>
//               <p className="text-gray-600">{email}</p>
//               <button
//                 onClick={() => setIsEditing(true)}
//                 className="mt-4 bg-blue-500 text-white py-2 px-4 rounded"
//               >
//                 Edit Profile
//               </button>
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }