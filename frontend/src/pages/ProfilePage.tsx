import React from "react";
import Navbar from "../components/Navbar";
import UserProfile from "../components/UserProfile";
import UserReviews from "../components/UserReviews";
import Footer from "../components/Footer";

const ProfilePage: React.FC = () => {
  return (
    <div className="bg-gray-900 min-h-screen">
      <Navbar />
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-4xl font-extrabold text-center text-white mb-10 bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
          Профиль пользователя
        </h1>
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="w-full md:w-1/2">
            <UserProfile />
          </div>
          <div className="w-full md:w-1/2">
            <UserReviews />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;