import React from "react";
import { FaFacebookF, FaTwitter, FaInstagram, FaTelegram, FaVk } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-8 mt-10 shadow-2xl border-t border-gray-700">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center px-6">
        {/* Логотип и копирайт */}
        <div className="flex items-center space-x-4 mb-6 md:mb-0">
          <img
            src={`${process.env.REACT_APP_API_URL}/media/films/logo.png`}
            alt="Logo"
            className="h-12 transition-transform transform hover:scale-105 duration-300"
          />
          <p className="text-lg font-semibold text-gray-200 tracking-tight">
            © 2025 СтримКипу. Все права защищены.
          </p>
        </div>

        {/* Соцсети */}
        <div className="flex space-x-6">
          <a
            href="#"
            className="text-gray-300 hover:text-red-500 transition-all duration-300 transform hover:scale-110 hover:shadow-md"
          >
            <FaFacebookF size={24} />
          </a>
          <a
            href="#"
            className="text-gray-300 hover:text-red-500 transition-all duration-300 transform hover:scale-110 hover:shadow-md"
          >
            <FaTelegram size={24} />
          </a>
          <a
            href="#"
            className="text-gray-300 hover:text-red-500 transition-all duration-300 transform hover:scale-110 hover:shadow-md"
          >
            <FaVk size={24} />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;