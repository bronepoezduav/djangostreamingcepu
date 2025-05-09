import React, { useState, useEffect } from "react";
import axios from "axios";

interface FilterProps {
  onFilterChange: (filters: {
    genre: string[];
    duration: number;
    search: string;
  }) => void;
}

const MovieFilter: React.FC<FilterProps> = ({ onFilterChange }) => {
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [duration, setDuration] = useState<number>(150);
  const [search, setSearch] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get("http://localhost:8000/api/genres/")
      .then((response) => {
        console.log("Genres response:", response.data);
        if (Array.isArray(response.data)) {
          setGenres(response.data);
        } else {
          console.error("API вернул не массив:", response.data);
          setGenres([]);
          setError("Ошибка загрузки жанров: неверный формат данных");
        }
      })
      .catch((error) => {
        console.error("Ошибка при получении жанров:", error);
        setError("Не удалось загрузить жанры");
      });
  }, []);

  const handleGenreChange = (genre: string) => {
    setSelectedGenres((prevState) =>
      prevState.includes(genre) ? prevState.filter((item) => item !== genre) : [...prevState, genre]
    );
  };

  const handleFilterChange = () => {
    onFilterChange({ genre: selectedGenres, duration, search });
  };

  const handleClearFilters = () => {
    setSelectedGenres([]);
    setDuration(150);
    setSearch("");
    onFilterChange({ genre: [], duration: 150, search: "" });
  };

  return (
    <div
      className="sticky top-4 ml-4 bg-gradient-to-br from-gray-900 to-gray-800 p-6 pb-12 rounded-xl shadow-2xl z-10 mt-4 max-h-[calc(100vh-80px)] overflow-hidden border border-gray-700 w-160"
      // Для смещения вправо или влево ml-4 или добавь mr-4:
      // - ml-2 = 8px влево
      // - ml-6 = 24px влево
      // - mr-4 = 16px вправо (добавь вместо ml-4 для смещения вправо)
      // Пример: className="... ml-6" или className="... mr-4"
    >
      <h2 className="text-2xl font-bold mb-6 text-white tracking-tight">Фильтры</h2>

      {error && <p className="text-red-400 mb-4 font-medium">{error}</p>}

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">Поиск по названию</label>
        <input
          type="text"
          className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:outline-none transition duration-200"
          placeholder="Введите название фильма"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">Жанры</label>
        <div className="grid grid-cols-2 gap-3">
          {genres.length > 0 ? (
            genres.map((genre) => (
              <label
                key={genre.id}
                className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-gray-700 transition duration-150"
              >
                <input
                  type="checkbox"
                  value={genre.name}
                  checked={selectedGenres.includes(genre.name)}
                  onChange={() => handleGenreChange(genre.name)}
                  className="w-5 h-5 text-red-500 bg-gray-800 border-gray-600 rounded-md focus:ring-red-500 focus:ring-opacity-50"
                />
                <span className="text-gray-200 text-sm">{genre.name}</span>
              </label>
            ))
          ) : (
            <p className="text-gray-400 text-sm col-span-2">Жанры загружаются...</p>
          )}
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">Продолжительность</label>
        <div className="relative w-full">
          <input
            type="range"
            min="0"
            max="300"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full h-2 bg-gray-600 rounded-full cursor-pointer appearance-none accent-red-500"
            style={{ WebkitAppearance: "none", appearance: "none" }}
          />
          <div
            className="absolute w-5 h-5 bg-red-500 rounded-full shadow-md border-2 border-gray-800 pointer-events-none transition-transform duration-200 hover:scale-110"
            style={{
              top: "50%",
              left: `${(duration / 300) * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          ></div>
          <div
            className="absolute left-0 right-0 top-6 flex justify-center"
            style={{ transform: `translateX(${(duration / 300) * 100 - 50}%)` }}
          >
            <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full shadow-md">
              {`<${duration} мин`}
            </div>
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>0 мин</span>
          <span>300 мин</span>
        </div>
      </div>

      {/* Кнопки с отступом вниз */}
      <div className="flex items-center gap-3 mb-6">
        <button
          className="flex-1 bg-gradient-to-r from-red-600 to-orange-500 hover:from-orange-600 hover:to-red-600 text-white py-3 rounded-full font-semibold shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
          onClick={handleFilterChange}
        >
          Применить фильтры
        </button>
        <button
          className="w-10 h-10 bg-gray-600 hover:bg-gray-700 text-white rounded-full flex items-center justify-center shadow-md transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
          onClick={handleClearFilters}
          title="Очистить фильтры"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default MovieFilter;