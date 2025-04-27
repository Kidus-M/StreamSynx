// components/SignIn.js
import { useState } from "react";
import { useRouter } from "next/router";
import { FcGoogle } from "react-icons/fc";
import { auth, db } from "../firebase"; // Adjust path
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import AuthForm from "./AuthForm";
import toast from 'react-hot-toast';

export default function SignIn({ setIsSignUp }) {
  const router = useRouter();
  const [errorLabel, setErrorLabel] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setErrorLabel(false); setErrorMessage(""); setIsLoading(true);

    const email = e.target.email.value.trim();
    const password = e.target.password.value;

    if (!email || !password) {
      setErrorLabel(true); setErrorMessage("Email and password are required.");
      setIsLoading(false); return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      toast.success("Signed in successfully!");
      router.push("/home");
    } catch (authError) {
      console.error("Authentication error:", authError.code, authError.message);
      handleAuthError(authError); // Call updated handler
    } finally {
        setIsLoading(false);
    }
  };

  // Google Sign In (keep as is)
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider(); setIsLoading(true);
    try {
        const result = await signInWithPopup(auth, provider); const user = result.user; const userDocRef = doc(db, "users", user.uid); const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) { const potentialUsername = user.displayName?.replace(/\s+/g, '') || user.email.split("@")[0]; const usernameQuery = query(collection(db, "users"), where("username_lowercase", "==", potentialUsername.toLowerCase())); const usernameSnapshot = await getDocs(usernameQuery); const finalUsername = usernameSnapshot.empty ? potentialUsername : `${potentialUsername}${Math.floor(Math.random() * 1000)}`; await setDoc(userDocRef, { uid: user.uid, username: finalUsername, username_lowercase: finalUsername.toLowerCase(), email: user.email, avatar: user.photoURL || null, createdAt: new Date().toISOString() }); await setDoc(doc(db, "friends", user.uid), { friends: [] }); await setDoc(doc(db, "favorites", user.uid), { movies: [], shows: [], episodes: [] }); await setDoc(doc(db, "history", user.uid), { movies: [], episodes: [] }); await setDoc(doc(db, "watchlists", user.uid), { items: [] }); await setDoc(doc(db, "recommendations", user.uid), { recommendations: [] }); toast.success(`Welcome, ${finalUsername}! Profile created.`);
        } else { toast.success(`Welcome back, ${userDoc.data().username}!`); }
        router.push("/home");
    } catch (error) { console.error("Google sign-in error:", error); toast.error(`Google Sign-In failed: ${error.message || 'Please try again.'}`); // More robust error message
    } finally { setIsLoading(false); }
};

  // --- UPDATED ERROR HANDLER ---
  const handleAuthError = (error) => {
    setErrorLabel(true); // Ensure error label is shown
    switch (error.code) {
      case "auth/invalid-credential": // Covers wrong email/password
      case "auth/user-not-found":     // Fallback if older SDK/specific error
      case "auth/wrong-password":     // Fallback
        setErrorMessage("Incorrect email or password. Please try again.");
        break;
      case "auth/invalid-email":
        setErrorMessage("Invalid email format.");
        break;
      // --- ADDED CASE ---
      case "auth/user-disabled":
        setErrorMessage("This account has been disabled.");
        break;
      // --- END ADDED CASE ---
      case "auth/too-many-requests":
         setErrorMessage("Too many attempts. Account temporarily locked. Please try again later or reset your password.");
         break;
      default: // Catch-all for other auth errors
        setErrorMessage("Sign in failed. An unexpected error occurred.");
        console.error(`Unhandled Sign In Error (${error.code}):`, error.message);
    }
  };
  // --- END UPDATED ERROR HANDLER ---

  return (
    // Themed container
    <div className="flex flex-col items-center justify-center w-full h-full p-4">
      {/* Themed Title */}
      <h1 className="text-3xl font-bold text-textprimary mb-6 font-poppins">SIGN IN</h1>
      <AuthForm
        onSubmit={handleSignIn}
        fields={[ { name: "email", type: "email", placeholder: "Email Address" }, { name: "password", type: "password", placeholder: "Password" } ]}
        buttonText="Sign In"
        errorLabel={errorLabel}
        errorMessage={errorMessage}
        isLoading={isLoading}
      />
      <div className="my-4 text-center text-textsecondary text-xs w-full max-w-sm">OR</div>
      {/* Themed Google Button */}
      <button onClick={handleGoogleSignIn} disabled={isLoading} className="w-full max-w-sm bg-secondary text-textprimary py-3 rounded-md mb-4 border border-secondary-light font-poppins flex items-center justify-center gap-2 hover:bg-secondary-light disabled:opacity-70 transition-colors">
        <FcGoogle className="text-xl" /> Continue With Google
      </button>
      {/* Themed Switch Link */}
      <p className="text-textsecondary font-poppins text-sm">
        Don’t have an account?{" "}
        <button className="text-accent hover:text-accent-hover font-semibold underline" onClick={() => setIsSignUp(true)}> Sign Up </button>
      </p>
    </div>
  );
}