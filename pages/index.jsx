import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Slideshow from "../components/Slideshow";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import SignIn from "../components/SignIn";
import SignUp from "../components/SignUp";

export default function Home() {
  const [isSignUp, setIsSignUp] = useState(true);
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