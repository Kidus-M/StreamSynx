import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Slideshow from "../components/Slideshow";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import SignIn from "../components/SignIn";
import SignUp from "../components/SignUp";
import Head from "next/head";
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
      <Head>
        {/* Basic SEO Meta Tags */}
        <title>
          StreamSynx - Discover & Watch Movies & TV Shows Together
        </title>{" "}
        {/* Your main site title */}
        <meta
          name="description"
          content="Explore trending and top-rated movies and TV shows. Create watch parties with friends using StreamSynx."
        />{" "}
        {/* Your main site description */}
        <link rel="canonical" href="streamsynx.vercel.app/" /> {/* Base URL */}
        {/* Open Graph / Facebook Meta Tags */}
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content="StreamSynx - Discover & Watch Movies & TV Shows Together"
        />
        <meta
          property="og:description"
          content="Explore trending and top-rated movies and TV shows. Create watch parties with friends using StreamSynx."
        />
        {/* Add a link to your main logo or a feature image */}
        <meta property="og:image" content={`streamsynx.vercel.app//og-image.png`} />
        <meta property="og:url" content="streamsynx.vercel.app/" />
        <meta property="og:site_name" content="StreamSynx" />
        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="StreamSynx - Discover & Watch Movies & TV Shows Together"
        />
        <meta
          name="twitter:description"
          content="Explore trending and top-rated movies and TV shows. Create watch parties with friends using StreamSynx."
        />
        <meta
          name="twitter:image"
          content={`streamsynx.vercel.app/twitter-image.png`}
        />
        <meta name="google-site-verification" content="google-site-verification=0kkzFPcdD6mtj7GwkCoQZ33bdivJx2qYdsEYBtUpW-U"></meta>
      </Head>
      <div
        className={`absolute inset-0 flex transition-all duration-500${
          isSignUp ? "translate-x-full " : ""
        } max-md:flex-col max-md:translate-x-0 max-md:h-auto`}
      >
        <div
          className={`w-1/2 h-full transition-all duration-500 ${
            isSignUp
              ? "bg-primary rounded-l-[50px] hidden"
              : "bg-secondary rounded-r-[50px]"
          } flex justify-center items-center max-md:w-full max-md:h-48 max-md:rounded-none max-md:rounded-b-[50px]`}
        >
          <Slideshow />
        </div>

        <div
          className={`w-1/2 h-full transition-all duration-500 ${
            isSignUp
              ? "bg-primary rounded-l-[50px]"
              : "bg-white max-md:bg-secondary"
          } flex justify-center items-center max-md:w-full max-md:h-48 max-md:rounded-none max-md:rounded-b-[50px] right-0 absolute`}
        >
          {isSignUp ? (
            <Slideshow />
          ) : (
            <div className="w-full h-full max-md:hidden"></div>
          )}
        </div>
      </div>
      <div className="w-screen absolute inset-0 flex justify-center items-center max-md:flex-col max-md:pt-16">
        <div
          className={`w-96 transition-all duration-500 transform ${
            isSignUp ? "translate-x-[-70%]" : "translate-x-[70%]"
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
