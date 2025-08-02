// pages/index.js (Auth Page)
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Slideshow from "../components/Slideshow"; // Adjusted path
import { auth } from "../firebase"; // Adjusted path
import { onAuthStateChanged } from "firebase/auth";
import SignIn from "../components/SignIn"; // Adjusted path
import SignUp from "../components/SignUp"; // Adjusted path
import Head from "next/head";
import { motion, AnimatePresence } from "framer-motion"; // Import motion
import { Mosaic } from "react-loading-indicators";
import Head from "next/head";
export default function Home() {
  const [isSignUp, setIsSignUp] = useState(true); // Default to Sign Up
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false); // Track if initial auth check is done
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecked(true); // Mark auth check as complete
      // Redirect logged-in users away from auth page
      if (currentUser) {
        router.replace("/home"); // Use replace to avoid auth page in history
      }
    });
    return () => unsubscribe();
  }, [router]); // Add router to dependencies

  // Show loading or null until auth state is confirmed AND user is not logged in
  if (!authChecked || user) {
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-primary">
             <Mosaic color="#DAA520" size="large" />
             {/* Or a branded loading screen */}
        </div>
    );
  }

  // Framer Motion variants for the auth form container
  const formContainerVariants = {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" } },
      exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2, ease: "easeIn" } }
  };


  return (
    // Main container covering screen
    <div className="relative h-screen w-screen bg-primary overflow-hidden font-poppins">
      <Head>
        {/* Keep your existing Head tags here */}
        <title>Welcome to StreamSynx</title>
        {/* ... other meta tags ... */}
        <meta name="robots" content="noindex, nofollow" /> {/* Usually don't index login/signup */}
      </Head>

      {/* Background Slideshow - positioned absolutely behind everything */}
      <div className="absolute inset-0 z-0 opacity-30 md:opacity-40 blur-[2px]"> {/* Adjust opacity and blur */}
        <Slideshow />
      </div>
      {/* Overlay gradient to darken slideshow further */}
      <div className="absolute inset-0 z-10 bg-gradient-to-br from-primary via-primary/80 to-primary"></div>

      {/* Centered Content Area */}
      <div className="relative z-20 flex items-center justify-center h-full p-4">
            {/* Animated container for switching forms */}
           <AnimatePresence mode="wait">
             <motion.div
                 key={isSignUp ? 'signup' : 'signin'} // Key change triggers animation
                 variants={formContainerVariants}
                 initial="initial"
                 animate="animate"
                 exit="exit"
                 className="w-full max-w-md bg-secondary/80 backdrop-blur-md p-6 md:p-8 rounded-xl shadow-2xl border border-secondary-light"
             >
                 {isSignUp ? (
                    <SignUp setIsSignUp={setIsSignUp} />
                 ) : (
                    <SignIn setIsSignUp={setIsSignUp} />
                 )}
             </motion.div>
           </AnimatePresence>
      </div>
    </div>
  );
}