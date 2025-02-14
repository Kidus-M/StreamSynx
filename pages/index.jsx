import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { FcGoogle } from "react-icons/fc";
import { MdError } from "react-icons/md";
import Slideshow from "../components/Slideshow";
import { auth } from "../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";

export default function Home() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        router.push("/home");
      }
    });
    return () => unsubscribe();
  }, [router]);

  return (
    <div className="relative h-screen bg-white overflow-hidden">
      <div
        className={`absolute inset-0 flex transition-all duration-500${isSignUp ? "translate-x-full " : ""
          } max-md:flex-col max-md:translate-x-0 max-md:h-auto`}
      >
        <div
          className={`w-1/2 h-full transition-all duration-500 ${isSignUp
            ? "bg-primary rounded-l-[50px] hidden"
            : "bg-secondary rounded-r-[50px]"
            } flex justify-center items-center max-md:w-full max-md:h-48 max-md:rounded-none max-md:rounded-b-[50px]`}>
          <Slideshow />
        </div>

        <div
          className={`w-1/2 h-full transition-all duration-500 ${isSignUp
            ? "bg-primary rounded-l-[50px]"
            : "bg-white max-md:bg-secondary"
            } flex justify-center items-center max-md:w-full max-md:h-48 max-md:rounded-none max-md:rounded-b-[50px] right-0 absolute`}
        >
          {isSignUp ? <Slideshow /> : <div className="w-full h-full max-md:hidden"></div>}
        </div>
      </div>
      <div className="w-screen absolute inset-0 flex justify-center items-center max-md:flex-col max-md:pt-16">
        <div
          className={`w-96 transition-all duration-500 transform ${isSignUp ? "translate-x-[-70%]" : "translate-x-[70%]"
            } flex justify-center items-center max-md:translate-x-0 max-lg:md:w-2/5`}
        >
          {!isSignUp ? (
            <SignIn setIsSignUp={setIsSignUp} />
          ) : (
            <SignUp setIsSignUp={setIsSignUp} />
          )}
        </div>
      </div>
    </div>
  );
}

function SignIn({ setIsSignUp }) {
  const router = useRouter();
  const [errorLabel, setErrorLabel] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSignIn = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // setErrorLabel(false);
      router.push("/home");
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        setErrorLabel(true);
        setErrorMessage("No account found with this email.");
        // alert("No account found with this email.");
      } else if (error.code === 'auth/invalid-credential') {
        setErrorLabel(true);
        setErrorMessage("Username or password is incorrect.");
        // alert("Username or password is incorrect.");
      } else {
        setErrorLabel(true);
        console.error("Error signing in:", error);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push("/home");
    } catch (error) {
      console.error("Error with Google sign-in:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-screen h-full max-sm:px-4 lg:bg-red">
      <h1 className="text-3xl font-bold text-secondary mb-6 font-poppins ">
        SIGN IN
      </h1>
      <form onSubmit={handleSignIn} className="w-full flex flex-col items-center">
        <input
          name="email"
          type="email"
          placeholder="email@gmail.com"
          className="w-full p-3 border rounded mb-4 text-gray-700"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          className="w-full p-3 border rounded mb-3 text-gray-700"
        />
        <div className={`w-full items-center justify-start gap-2 mb-4 text-red-600 ${errorLabel ? 'flex' : 'hidden'}`}>
          <MdError className="text-xl" />
          <p className="text-sm">{errorMessage}</p>
        </div>
        <button type="submit" className="w-full bg-secondary text-white py-3 rounded mb-4 font-poppins">
          Sign In
        </button>
      </form >
      <button onClick={handleGoogleSignIn} className="w-full bg-gray-100 text-gray-700 py-3 rounded mb-4 border font-poppins flex items-center justify-center">
        <FcGoogle className="text-xl mr-2" />
        Continue With Google
      </button>
      <p className="text-gray-700 font-poppins">
        <span>Don’t have an account? </span>
        <button className="text-secondary underline" onClick={() => setIsSignUp(true)}>
          Sign Up
        </button>
      </p>
    </div >
  );
}

function SignUp({ setIsSignUp }) {
  const [errorLabel, setErrorLabel] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  const handleSignUp = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setErrorLabel(true);
        setErrorMessage("Email already in use.");
      } else if (error.code === 'auth/invalid-email') {
        setErrorLabel(true);
        setErrorMessage("Invalid email.");
      } else {
        console.error("Error signing up:", error);
      }
    }
  };

  const handleGoogleSignUp = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error with Google sign-up:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-screen h-full max-sm:px-4">
      <h1 className="text-3xl font-bold text-primary mb-6 font-poppins ">
        SIGN UP
      </h1>
      <form onSubmit={handleSignUp} className="w-full flex flex-col items-center">
        <input
          name="name"
          type="text"
          placeholder="Name"
          className="w-full p-3 border rounded mb-4 text-gray-700"
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          className="w-full p-3 border rounded mb-4 text-gray-700"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          className="w-full p-3 border rounded mb-6 text-gray-700"
        />
        <div className={`w-full items-center justify-start gap-2 mb-4 text-red-600 ${errorLabel ? 'flex' : 'hidden'}`}>
          <MdError className="text-xl" />
          <p className="text-sm">{errorMessage}</p>
        </div>
        <button type="submit" className="w-full bg-primary text-white py-3 rounded mb-4 font-poppins">
          Sign Up
        </button>
      </form>
      <button onClick={handleGoogleSignUp} className="w-full bg-gray-100 text-gray-700 py-3 rounded mb-4 border font-poppins flex items-center justify-center">
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
