import React, { useState } from 'react';
import MovieFilter from './MovieFilter';
import MovieList from './MovieList';

const MoviesPage: React.FC = () => {
  const [filters, setFilters] = useState<{ genre: string[]; duration: number; search: string }>({
    genre: [],
    duration: 300,
    search: ''
  });

  const handleFilterChange = (newFilters: { genre: string[]; duration: number; search: string }) => {
    setFilters(newFilters);
  };

  return (
    
    <div className="flex">
      {/* Панель фильтров */}
      <div className="w-1/4">
        <MovieFilter onFilterChange={handleFilterChange} />
      </div>

      {/* Список фильмов */}
      <div className="w-3/4">
        <MovieList filters={filters} />
      </div>
    </div>
  );
};

export default MoviesPage;
