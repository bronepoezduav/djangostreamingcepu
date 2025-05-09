import React, { useState, useEffect } from "react";

const randomTitles = [
  "🔥 Горячие фильмы этой недели",
  "🎬 Тренды недели",
  "🚀 Не пропусти хиты!",
  "⭐ Самые обсуждаемые фильмы",
];

const Hero = () => {
  const [title, setTitle] = useState(randomTitles[0]);

  useEffect(() => {
    setTitle(randomTitles[Math.floor(Math.random() * randomTitles.length)]);
  }, []);

  return (
    <section
      className="relative h-[500px] bg-cover bg-center flex items-center justify-center text-white text-center"
      style={{
        backgroundImage: `url(${process.env.REACT_APP_API_URL}/media/films/background1.jpg)`,
      }}
    >
      {/* Затемнение */}
      <div className="absolute inset-0 bg-black opacity-70"></div>

      {/* Контент */}
      <div className="relative z-10 container mx-auto">
        <h1 className="text-5xl font-extrabold mb-4 animate-fade-in-up">{title}</h1>
        <p className="text-xl mb-8">Не пропустите самые ожидаемые релизы!</p>
        {/* <button
        className="w-full bg-gradient-to-r from-red-600 to-orange-500 hover:from-orange-600 hover:to-red-600 text-white py-3 rounded-full font-semibold shadow-md transition-transform transform hover:scale-105"
      >
        Смотреть сейчас
      </button> */}
      </div>
    </section>
  );
};

export default Hero;
