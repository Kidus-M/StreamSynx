import { useState } from "react";
import { useRouter } from "next/router";
import { FcGoogle } from "react-icons/fc";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, updateProfile } from "firebase/auth";
import toast from "react-hot-toast";
import AuthForm from "./AuthForm";
import { auth } from "../firebase";
import { createUserDocuments, ensureUserProfile, isUsernameTaken } from "../lib/userProfile";

const messageForError = (error) => {
  switch (error.code) {
    case "auth/email-already-in-use":
      return "That email is already registered. Try signing in instead.";
    case "auth/invalid-email":
      return "That email address does not look right.";
    case "auth/weak-password":
      return "Passwords need at least 6 characters.";
    default:
      return "Sign up failed. Please try again.";
  }
};

export default function SignUp({ redirectTo = "/" }) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    const username = event.target.username.value.trim();
    const email = event.target.email.value.trim();
    const password = event.target.password.value;

    if (username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      setErrorMessage("Usernames need 3+ characters: letters, numbers or underscores.");
      setIsLoading(false);
      return;
    }

    try {
      if (await isUsernameTaken(username)) {
        setErrorMessage("That username is already taken.");
        setIsLoading(false);
        return;
      }

      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName: username }).catch(() => {});
      await createUserDocuments(user, username);

      toast.success("Account created");
      router.replace(redirectTo);
    } catch (error) {
      setErrorMessage(messageForError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    try {
      const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
      const { username, created } = await ensureUserProfile(user);
      toast.success(created ? `Welcome, ${username}` : `Welcome back, ${username}`);
      router.replace(redirectTo);
    } catch (error) {
      if (error.code !== "auth/popup-closed-by-user") {
        toast.error("Google sign-in failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <AuthForm
        onSubmit={handleSignUp}
        fields={[
          {
            name: "username",
            type: "text",
            label: "Username",
            placeholder: "moviebuff",
            autoComplete: "username",
          },
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
            placeholder: "At least 6 characters",
            autoComplete: "new-password",
          },
        ]}
        buttonText="Create account"
        errorMessage={errorMessage}
        isLoading={isLoading}
      />

      <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-textsecondary/70">
        <span className="h-px flex-1 bg-white/[0.08]" />
        or
        <span className="h-px flex-1 bg-white/[0.08]" />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignUp}
        disabled={isLoading}
        className="btn-ghost h-12 w-full"
      >
        <FcGoogle className="h-5 w-5" />
        Continue with Google
      </button>
    </div>
  );
}
