import { useState } from "react";
import { useRouter } from "next/router";
import { FcGoogle } from "react-icons/fc";
import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import AuthForm from "./AuthForm";

export default function SignUp({ setIsSignUp }) {
  const router = useRouter();
  const [errorLabel, setErrorLabel] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSignUp = async (e) => {
    e.preventDefault();
    setErrorLabel(false);
    setErrorMessage("");

    const username = e.target.username.value.trim();
    const email = e.target.email.value.trim();
    const password = e.target.password.value;

    if (!username || !email || !password) {
      setErrorLabel(true);
      setErrorMessage("All fields are required.");
      return;
    }

    try {
      // Check if username already exists
      const usernameQuery = query(collection(db, "users"), where("username", "==", username));
      const usernameSnapshot = await getDocs(usernameQuery);

      if (!usernameSnapshot.empty) {
        setErrorLabel(true);
        setErrorMessage("Username already in use.");
        return;
      }

      console.log("Email:", email, "Password:", password);

      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Ensure Firestore document is correctly created
      try {
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          username,
          email,
        });
        router.push("/home");
      } catch (firestoreError) {
        console.error("Firestore error:", firestoreError);
        setErrorLabel(true);
        setErrorMessage("Failed to create user profile. Please try again.");
      }
    } catch (authError) {
      console.error("Authentication error:", authError);
      handleAuthError(authError);
    }
  };

  const handleGoogleSignUp = async () => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const username = user.displayName || user.email.split("@")[0];

        // Check if username already exists
        const usernameQuery = query(collection(db, "users"), where("username", "==", username));
        const usernameSnapshot = await getDocs(usernameQuery);

        if (usernameSnapshot.empty) {
            // Create user document in Firestore if username does not exist
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                username,
                email: user.email,
            });
        } else {
            console.error("Username already exists.");
            router.push("/home"); // Redirect to home if username exists
            return; // Exit the function to prevent further errors
        }

        router.push("/home"); // Redirect to home on successful sign-up
    } catch (error) {
        console.error("Google sign-up error:", error);
        router.push("/home"); // Redirect to home on any error
    }
};
  const handleAuthError = (error) => {
    setErrorLabel(true);
    switch (error.code) {
      case "auth/email-already-in-use":
        setErrorMessage("Email already in use.");
        break;
      case "auth/invalid-email":
        setErrorMessage("Invalid email format.");
        break;
      case "auth/weak-password":
        setErrorMessage("Password should be at least 6 characters.");
        break;
      default:
        setErrorMessage("An error occurred. Please try again.");
        console.error("Error signing up:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-screen h-full max-sm:px-4">
      <h1 className="text-3xl font-bold text-primary mb-6 font-poppins">SIGN UP</h1>
      <AuthForm
        onSubmit={handleSignUp}
        fields={[
          { name: "username", type: "text", placeholder: "Username" },
          { name: "email", type: "email", placeholder: "Email" },
          { name: "password", type: "password", placeholder: "Password" },
        ]}
        buttonText="Sign Up"
        errorLabel={errorLabel}
        errorMessage={errorMessage}
      />
      <button
        onClick={handleGoogleSignUp}
        className="md:w-96 w-80 bg-gray-100 text-gray-700 py-3 rounded mb-4 border font-poppins flex items-center justify-center"
      >
        <FcGoogle className="text-xl mr-2" />
        Sign Up With Google
      </button>
      <p className="text-gray-700 font-poppins">
        <span>Already have an account? </span>
        <button className="text-primary underline" onClick={() => setIsSignUp(false)}>
          Sign In
        </button>
      </p>
    </div>
  );
}
