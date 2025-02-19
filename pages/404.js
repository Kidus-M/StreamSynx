import NavBar from "../components/Navbar";

export default function Custom404() {
    return (
      <div className="text-center pt-24 text-gray-200">
        <NavBar />
        {/* <h1>404 - Page Not Found</h1> */}
        <p className="text-md">Oops! The page you’re looking for doesn’t exist.</p>
      </div>
    );
  }
  