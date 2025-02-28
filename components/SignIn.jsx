import { useState } from "react";
import { useRouter } from "next/router";
import { FcGoogle } from "react-icons/fc";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import AuthForm from "./AuthForm";

export default function SignIn({ setIsSignUp }) {
  const router = useRouter();
  const [errorLabel, setErrorLabel] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSignIn = async (e) => {
    e.preventDefault();
    setErrorLabel(false);
    setErrorMessage("");

    const email = e.target.email.value.trim();
    const password = e.target.password.value;

    if (!email || !password) {
      setErrorLabel(true);
      setErrorMessage("Email and password are required.");
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch user data from Firestore using the uid
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          router.push("/home");
        } else {
          setErrorLabel(true);
          setErrorMessage("User data not found in Firestore.");
        }
      } catch (firestoreError) {
        console.error("Firestore error:", firestoreError);
        setErrorLabel(true);
        setErrorMessage("Failed to fetch user data. Please try again.");
      }
    } catch (authError) {
      console.error("Authentication error:", authError);
      handleAuthError(authError);
    }
  };

  const handleGoogleSignIn = async () => {
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
            alert("Username already exists. Please go and change it on profile page.");
            router.push("/home"); // Redirect to home if username exists
            return; // Exit the function to prevent further errors
        }

        router.push("/home"); // Redirect to home on successful sign-up
    } catch (error) {
        alert("Google sign-up error:", error);
        router.push("/"); // Redirect to home on any error
    }
};

  const handleAuthError = (error) => {
    setErrorLabel(true);
    switch (error.code) {
      case "auth/user-not-found":
        setErrorMessage("No account found with this email.");
        break;
      case "auth/wrong-password":
        setErrorMessage("Incorrect password.");
        break;
      case "auth/invalid-email":
        setErrorMessage("Invalid email.");
        break;
      default:
        setErrorMessage("An error occurred. Please try again.");
        console.error("Error signing in:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-screen h-full max-sm:px-4">
      <h1 className="text-3xl font-bold text-secondary mb-6 font-poppins">SIGN IN</h1>
      <AuthForm
        onSubmit={handleSignIn}
        fields={[
          { name: "email", type: "email", placeholder: "Email" },
          { name: "password", type: "password", placeholder: "Password" },
        ]}
        buttonText="Sign In"
        errorLabel={errorLabel}
        errorMessage={errorMessage}
      />
      <button
        onClick={handleGoogleSignIn}
        className="md:w-96 w-80 bg-gray-100 text-gray-700 py-3 rounded mb-4 border font-poppins flex items-center justify-center"
      >
        <FcGoogle className="text-xl mr-2" />
        Continue With Google
      </button>
      <p className="text-gray-700 font-poppins">
        <span>Don’t have an account? </span>
        <button className="text-secondary underline" onClick={() => setIsSignUp(true)}>
          Sign Up
        </button>
      </p>
    </div>
  );
}