import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';  // импортируем Router
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import PopularMovies from '../components/PopularMovies';
import Footer from '../components/Footer';
import MoviesPage from '../components/MoviesPage';

const Home = () => {
  return (
      <div>
        <Navbar />
        <Hero />
        <PopularMovies />
        <MoviesPage />
        <Footer />
      </div>
  );
};

export default Home;
