// components/SignUp.js (or wherever it's located)
import { useState } from "react";
import { useRouter } from "next/router";
import { FcGoogle } from "react-icons/fc";
import { auth, db } from "../firebase"; // Adjust path
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, setDoc, collection, query, where, getDoc, getDocs } from "firebase/firestore";
import AuthForm from "./AuthForm";
import toast from 'react-hot-toast';

export default function SignUp({ setIsSignUp }) {
  const router = useRouter();
  const [errorLabel, setErrorLabel] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false); // Loading state

  const handleSignUp = async (e) => {
    e.preventDefault();
    setErrorLabel(false); setErrorMessage(""); setIsLoading(true); // Start loading

    const username = e.target.username.value.trim();
    const email = e.target.email.value.trim();
    const password = e.target.password.value;

    if (!username || !email || !password) {
      setErrorLabel(true); setErrorMessage("All fields are required.");
      setIsLoading(false); return;
    }
    // Basic username validation (example)
    if (username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
        setErrorLabel(true); setErrorMessage("Username must be 3+ characters (letters, numbers, underscore only).");
        setIsLoading(false); return;
    }


    try {
      // Check if username already exists
      const usernameQuery = query(collection(db, "users"), where("username_lowercase", "==", username.toLowerCase())); // Check lowercase
      const usernameSnapshot = await getDocs(usernameQuery);

      if (!usernameSnapshot.empty) {
        setErrorLabel(true); setErrorMessage("Username already taken.");
        setIsLoading(false); return;
      }

      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        username: username,
        username_lowercase: username.toLowerCase(), // Store lowercase version
        email: email,
        avatar: user.photoURL || null, // Use default avatar if needed
        createdAt: new Date().toISOString(), // Add createdAt timestamp
      });
      // Also initialize friends, favorites, etc. (optional but good practice)
      await setDoc(doc(db, "friends", user.uid), { friends: [] });
      await setDoc(doc(db, "favorites", user.uid), { movies: [], shows: [], episodes: [] });
      await setDoc(doc(db, "history", user.uid), { movies: [], episodes: [] });
      await setDoc(doc(db, "watchlists", user.uid), { items: [] });
      await setDoc(doc(db, "recommendations", user.uid), { recommendations: [] });

      toast.success("Account created successfully!");
      router.push("/home");

    } catch (authError) {
      console.error("Authentication error:", authError);
      handleAuthError(authError); // Use centralized error handler
    } finally {
        setIsLoading(false); // Stop loading
    }
  };

  // Modified Google Sign In/Up to check for existing user first
   const handleGoogleSignUp = async () => {
    const provider = new GoogleAuthProvider();
    setIsLoading(true);
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
             // If user doesn't exist in Firestore (first Google sign-in), create profile
             const potentialUsername = user.displayName?.replace(/\s+/g, '') || user.email.split("@")[0];
             const usernameQuery = query(collection(db, "users"), where("username_lowercase", "==", potentialUsername.toLowerCase()));
             const usernameSnapshot = await getDocs(usernameQuery);
             const finalUsername = usernameSnapshot.empty ? potentialUsername : `${potentialUsername}${Math.floor(Math.random() * 1000)}`;

             await setDoc(userDocRef, {
                uid: user.uid,
                username: finalUsername,
                username_lowercase: finalUsername.toLowerCase(),
                email: user.email,
                avatar: user.photoURL || null,
                createdAt: new Date().toISOString(),
             });
              // Initialize other docs
             await setDoc(doc(db, "friends", user.uid), { friends: [] });
             await setDoc(doc(db, "favorites", user.uid), { movies: [], shows: [], episodes: [] });
             await setDoc(doc(db, "history", user.uid), { movies: [], episodes: [] });
             await setDoc(doc(db, "watchlists", user.uid), { items: [] });
             await setDoc(doc(db, "recommendations", user.uid), { recommendations: [] });
             toast.success(`Welcome, ${finalUsername}! Profile created.`);
        } else {
             toast.success(`Welcome back, ${userDoc.data().username}!`); // Already exists, just sign in
        }
        router.push("/home");
    } catch (error) {
        console.error("Google sign-up/in error:", error);
        toast.error(`Google Sign-In failed: ${error.message}`);
    } finally {
         setIsLoading(false);
    }
};


  const handleAuthError = (error) => {
    setErrorLabel(true);
    switch (error.code) {
      case "auth/email-already-in-use": setErrorMessage("Email already in use. Try signing in."); break;
      case "auth/invalid-email": setErrorMessage("Invalid email format."); break;
      case "auth/weak-password": setErrorMessage("Password should be at least 6 characters."); break;
      default: setErrorMessage("Sign up failed. Please try again."); break;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-4">
       {/* Themed Title */}
      <h1 className="text-3xl font-bold text-textprimary mb-6 font-poppins">SIGN UP</h1>
      <AuthForm
        onSubmit={handleSignUp}
        fields={[
          { name: "username", type: "text", placeholder: "Username" },
          { name: "email", type: "email", placeholder: "Email Address" },
          { name: "password", type: "password", placeholder: "Password (min. 6 characters)" },
        ]}
        buttonText="Create Account"
        errorLabel={errorLabel}
        errorMessage={errorMessage}
        isLoading={isLoading} // Pass loading state
      />
      <div className="my-4 text-center text-textsecondary text-xs w-full max-w-sm">OR</div>
       {/* Themed Google Button */}
      <button
        onClick={handleGoogleSignUp}
         disabled={isLoading}
        className="w-full max-w-sm bg-secondary text-textprimary py-3 rounded-md mb-4 border border-secondary-light font-poppins flex items-center justify-center gap-2 hover:bg-secondary-light disabled:opacity-70 transition-colors"
      >
        <FcGoogle className="text-xl" />
        Continue With Google
      </button>
       {/* Themed Switch Link */}
      <p className="text-textsecondary font-poppins text-sm">
        Already have an account?{" "}
        <button className="text-accent hover:text-accent-hover font-semibold underline" onClick={() => setIsSignUp(false)}>
          Sign In
        </button>
      </p>
    </div>
  );
}