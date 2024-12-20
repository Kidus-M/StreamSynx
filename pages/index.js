import { useState } from 'react';

export default function Home() {
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div className="relative h-screen bg-white overflow-hidden">
      <div
        className={`absolute inset-0 flex transition-all duration-500${
          isSignUp ? 'translate-x-full ' : ''
        } max-md:flex-col max-md:translate-x-0 max-md:h-auto`}
      >

        <div
          className={`w-1/2 h-full transition-all duration-500 ${
            isSignUp ? 'bg-blue-900 rounded-l-[50px] hidden' : 'bg-orange-500 rounded-r-[50px]'
          } flex justify-center items-center max-md:w-full max-md:h-48 max-md:rounded-none max-md:rounded-b-[50px]`}
        ></div>

        <div
          className={`w-1/2 h-full transition-all duration-500 ${
            isSignUp ? 'bg-blue-900 rounded-l-[50px]' : 'bg-white max-md:bg-orange-500'
          } flex justify-center items-center max-md:w-full max-md:h-48 max-md:rounded-none max-md:rounded-b-[50px] right-0 absolute`}
        ></div>
      </div>
      <div className="w-screen absolute inset-0 flex justify-center items-center max-md:flex-col max-md:pt-16"> {/** This is the parent that carries them */}
        <div
          className={`w-96 transition-all duration-500 transform ${
            isSignUp ? 'translate-x-[-70%]' : 'translate-x-[70%]'
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
  return (
    <div className="flex flex-col items-center justify-center w-screen h-full max-sm:px-4 lg:bg-red">
      <h1 className="text-3xl font-bold text-orange-500 mb-6 font-poppins ">SIGN IN</h1>
      <input
        type="email"
        placeholder="email@gmail.com"
        className="w-full p-3 border rounded mb-4 text-gray-700"
      />
      <input
        type="password"
        placeholder="Password"
        className="w-full p-3 border rounded mb-6 text-gray-700"
      />
      <button className="w-full bg-orange-500 text-white py-3 rounded mb-4 font-poppins">Sign In</button>
      <button className="w-full bg-gray-100 text-gray-700 py-3 rounded mb-4 border font-poppins flex items-center justify-center">
        <img
          src="/google-logo.png"
          alt="Google Logo"
          className="w-5 h-5 mr-2"
        />
        Continue With Google
      </button>
      <p className="text-gray-700 font-poppins">
        <span>Don’t have an account? </span>
        <button
          className="text-orange-500 underline"
          onClick={() => setIsSignUp(true)}
        >
          Sign Up
        </button>
      </p>
    </div>
  );
}

function SignUp({ setIsSignUp }) {
  return (
    <div className="flex flex-col items-center justify-center w-screen h-full max-sm:px-4">
      <h1 className="text-3xl font-bold text-blue-900 mb-6 font-poppins ">SIGN UP</h1>
      <input
        type="text"
        placeholder="Name"
        className="w-full p-3 border rounded mb-4 text-gray-700"
      />
      <input
        type="email"
        placeholder="Email"
        className="w-full p-3 border rounded mb-4 text-gray-700"
      />
      <input
        type="password"
        placeholder="Password"
        className="w-full p-3 border rounded mb-6 text-gray-700"
      />
      <button className="w-full bg-blue-900 text-white py-3 rounded mb-4 font-poppins">Sign Up</button>
      <button className="w-full bg-gray-100 text-gray-700 py-3 rounded mb-4 border font-poppins flex items-center justify-center">
        <img
          src="/google-logo.png"
          alt="Google Logo"
          className="w-5 h-5 mr-2"
        />
        Sign Up With Google
      </button>
      <p className="text-gray-700 font-poppins">
        <span>Already have an account? </span>
        <button
          className="text-blue-900 underline"
          onClick={() => setIsSignUp(false)}
        >
          Sign In
        </button>
      </p>
    </div>
  );
}