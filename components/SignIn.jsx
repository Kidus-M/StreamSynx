import { useState } from "react";
import { useRouter } from "next/router";
import { FcGoogle } from "react-icons/fc";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import AuthForm from "./AuthForm";

export default function SignIn({ setIsSignUp }) {
  const router = useRouter();
  const [errorLabel, setErrorLabel] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSignIn = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/home");
    } catch (error) {
      handleAuthError(error);
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push("/home");
    } catch (error) {
      handleAuthError(error);
    }
  };

  const handleAuthError = (error) => {
    setErrorLabel(true);
    switch (error.code) {
      case 'auth/user-not-found':
        setErrorMessage("No account found with this email.");
        break;
      case 'auth/invalid-credential':
        setErrorMessage("Username or password is incorrect.");
        break;
      case 'auth/popup-closed-by-user':
        // setErrorMessage("Popup closed by user.");
        break;
      case 'auth/cancelled-popup-request':
        // setErrorMessage("Popup closed by user.");
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
          { name: "email", type: "email", placeholder: "email@gmail.com" },
          { name: "password", type: "password", placeholder: "Password" },
        ]}
        buttonText="Sign In"
        errorLabel={errorLabel}
        errorMessage={errorMessage}
      />
      <button onClick={handleGoogleSignIn} className="w-96 bg-gray-100 text-gray-700 py-3 rounded mb-4 border font-poppins flex items-center justify-center">
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