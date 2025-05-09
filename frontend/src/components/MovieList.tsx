import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom'; // Импортируем Link
import MovieCard from './MovieCard';

interface Movie {
  id: number;
  title: string;
  description: string;
  image: string;
  genres: { id: number; name: string }[];
  average_rating: number;
  duration: number;
}

interface MovieListProps {
  filters: { genre: string[]; duration: number; search: string };
}

const MovieList: React.FC<MovieListProps> = ({ filters }) => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([]);

  useEffect(() => {
    axios.get('http://localhost:8000/api/films/')
      .then(response => {
        setMovies(response.data);
        setFilteredMovies(response.data);
        
      })
      .catch(error => {
        console.error('Ошибка при получении фильмов:', error);
      });
  }, []);

  useEffect(() => {
    const filtered = movies.filter((movie) => {
      const genreMatches = filters.genre.length > 0
        ? filters.genre.every((filterGenre) => movie.genres.some((genre) => genre.name === filterGenre))
        : true;
      const durationMatches = movie.duration <= filters.duration;
      const searchMatches = movie.title.toLowerCase().includes(filters.search.toLowerCase());
      return genreMatches && durationMatches && searchMatches;
    });

    setFilteredMovies(filtered);
  }, [filters, movies]);

  return (
    <div className="p-6">
      <div className="flex flex-wrap gap-x-6 gap-y-6">
        {filteredMovies.map((movie) => (
          <div key={movie.id} className="flex justify-center">
            {/* Оборачиваем MovieCard в Link */}
            <Link to={`/films/${movie.id}`}>
              <MovieCard 
                title={movie.title}
                image={movie.image || `${process.env.REACT_APP_API_URL}/media/films/blank_film.jpg`}
                genres={movie.genres}
                description={movie.description}
                average_rating={movie.average_rating}
                duration={movie.duration}
                onError={() => {}}
              />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MovieList;
