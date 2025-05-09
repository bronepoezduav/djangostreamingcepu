import React from 'react';
import { Routes, Route } from 'react-router-dom';  // Импортируй только Routes и Route
import Home from './pages/Home';  // Страница с фильмами
import MoviePage from './pages/MoviePage';  // Страница фильма
import ProfilePage from './pages/ProfilePage';  // Страница фильма

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />  {/* Главная страница с фильмами */}
      <Route path="/films/:id" element={<MoviePage />} />  {/* Страница фильма */}
      <Route path="/profile" element={<ProfilePage />} />  {/* Страница профиля пользователя */}
    </Routes>
  );
};

export default App;
