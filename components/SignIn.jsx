import { useState } from "react";
import { useRouter } from "next/router";
import { FcGoogle } from "react-icons/fc";
import {
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import toast from "react-hot-toast";
import AuthForm from "./AuthForm";
import { auth } from "../firebase";
import { ensureUserProfile } from "../lib/userProfile";

const messageForError = (error) => {
  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Incorrect email or password.";
    case "auth/invalid-email":
      return "That email address does not look right.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again later or reset your password.";
    default:
      return "Sign in failed. Please try again.";
  }
};

export default function SignIn({ redirectTo = "/" }) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    const email = event.target.email.value.trim();
    const password = event.target.password.value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Welcome back");
      router.replace(redirectTo);
    } catch (error) {
      setErrorMessage(messageForError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
      const { username } = await ensureUserProfile(user);
      toast.success(`Welcome, ${username}`);
      router.replace(redirectTo);
    } catch (error) {
      if (error.code !== "auth/popup-closed-by-user") {
        toast.error("Google sign-in failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const email = document.getElementById("email")?.value?.trim();
    if (!email) {
      setErrorMessage("Enter your email address first, then tap reset.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent.");
    } catch {
      toast.error("Could not send a reset email for that address.");
    }
  };

  return (
    <div className="space-y-5">
      <AuthForm
        onSubmit={handleSignIn}
        fields={[
          {
            name: "email",
            type: "email",
            label: "Email",
            placeholder: "you@example.com",
            autoComplete: "email",
          },
          {
            name: "password",
            type: "password",
            label: "Password",
            placeholder: "Your password",
            autoComplete: "current-password",
          },
        ]}
        buttonText="Sign in"
        errorMessage={errorMessage}
        isLoading={isLoading}
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleResetPassword}
          className="text-[12px] text-textsecondary transition-colors hover:text-accent"
        >
          Forgot password?
        </button>
      </div>

      <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-textsecondary/70">
        <span className="h-px flex-1 bg-white/[0.08]" />
        or
        <span className="h-px flex-1 bg-white/[0.08]" />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className="btn-ghost h-12 w-full"
      >
        <FcGoogle className="h-5 w-5" />
        Continue with Google
      </button>
    </div>
  );
}
