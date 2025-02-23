import { useState } from "react";
import { useRouter } from "next/router";
import { FcGoogle } from "react-icons/fc";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import AuthForm from "./AuthForm";

export default function SignUp({ setIsSignUp }) {
  const router = useRouter();
  const [errorLabel, setErrorLabel] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSignUp = async (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      const userDoc = await getDoc(doc(db, "users", username));
      if (userDoc.exists()) {
        setErrorLabel(true);
        setErrorMessage("Username already in use.");
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", username), {
        uid: user.uid,
        username,
        email,
        profilePicture: "",
      });

      router.push("/home");
    } catch (error) {
      handleAuthError(error);
    }
  };

  const handleGoogleSignUp = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        username: user.displayName || user.email.split("@")[0],
        email: user.email,
      });

      router.push("/home");
    } catch (error) {
      handleAuthError(error);
    }
  };

  const handleAuthError = (error) => {
    setErrorLabel(true);
    switch (error.code) {
      case 'auth/email-already-in-use':
        setErrorMessage("Email already in use.");
        break;
      case 'auth/invalid-email':
        setErrorMessage("Invalid email.");
        break;
      case 'auth/popup-closed-by-user':
        // setErrorMessage("Popup closed by user.");
        break;
      case 'auth/cancelled-popup-request':
        // setErrorMessage("Popup closed by user.");
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
      <button onClick={handleGoogleSignUp} className="w-96 bg-gray-100 text-gray-700 py-3 rounded mb-4 border font-poppins flex items-center justify-center">
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