import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import AuthModal from "./AuthModal";

const Navbar = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access");
    const storedUsername = localStorage.getItem("username");

    if (token) {
      axios
        .post(`${process.env.REACT_APP_API_URL}/api/token/verify/`, { token })
        .then(() => {
          setIsAuthenticated(true);
          setUsername(storedUsername || "");
        })
        .catch(() => {
          handleLogout(); // Токен истек, выходим
        });
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("username");

    setIsAuthenticated(false);
    setUsername("");
    window.location.href = "/";
  };

  return (
    <nav className="bg-gradient-to-r from-red-600 to-orange-500 text-white p-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center h-16">
        <div className="text-3xl font-extrabold">
          <a href="/" className="text-white">
            <img
              src={`${process.env.REACT_APP_API_URL}/media/films/logo.png`}
              alt="Logo"
              className="max-h-20 transition-transform transform hover:scale-105"
            />
          </a>
        </div>

        <div className="space-x-6 flex items-center text-lg font-medium">
          {isAuthenticated ? (
            <>
              <Link to="/profile" className="text-white transition-colors">
                <span className="text-2xl font-bold animate-pulse">
                  Привет, {username}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="bg-white text-red-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition"
              >
                Выйти
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="bg-white text-red-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition"
            >
              Войти
            </button>
          )}
        </div>
      </div>

      <AuthModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </nav>
  );
};

export default Navbar;
