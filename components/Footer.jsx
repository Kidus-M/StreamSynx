import React from "react";
import { FaFacebookSquare } from "react-icons/fa";
import { FaLinkedin } from "react-icons/fa6";
import { FaInstagram } from "react-icons/fa";
import { FaFacebookMessenger } from "react-icons/fa6";
import { FaXTwitter } from "react-icons/fa6";



const Footer = () => {
  return (
    <footer class="flex flex-col space-y-10 justify-center m-10">
      <nav class="flex justify-center flex-wrap gap-6 text-gray-500 font-medium">
        <a class="hover:text-gray-900" href="#">
          Home
        </a>
        <a class="hover:text-gray-900" href="#">
          WatchList
        </a>
        <a class="hover:text-gray-900" href="#">
          History
        </a>
        <a class="hover:text-gray-900" href="#">
          Favorites
        </a>
        <a class="hover:text-gray-900" href="#">
          Buddies
        </a>
        <a class="hover:text-gray-900" href="#">
          Account
        </a>
      </nav>

      <div class="flex justify-center space-x-5 text-2xl">
        <a
          href="https://facebook.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          <FaFacebookSquare />
        </a>
        <a
          href="https://linkedin.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          <FaLinkedin />
        </a>
        <a
          href="https://instagram.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          <FaInstagram />
        </a>
        <a
          href="https://messenger.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          <FaFacebookMessenger />
        </a>
        <a
          href="https://twitter.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          <FaXTwitter />
        </a>
      </div>
      <p class="text-center text-gray-700 font-medium">
        &copy; 2025 StreamSync Ltd. All rights reservered.
      </p>
    </footer>
  );
};

export default Footer;
