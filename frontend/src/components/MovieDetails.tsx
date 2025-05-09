import React from "react";
import { FaStar } from "react-icons/fa";

interface Genre {
  id: number;
  name: string;
}

interface MovieDetailsProps {
  title: string;
  description: string;
  genres: Genre[] | string[];
  duration: number;
  releaseDate: string;
  averageRating?: number | null;
}

const MovieDetails: React.FC<MovieDetailsProps> = ({
  title,
  description,
  genres,
  duration,
  releaseDate,
  averageRating,
}) => {
  // Получаем уникальные названия жанров
  const genreNames = Array.isArray(genres) && genres.length > 0
    ? (typeof genres[0] === "object"
        ? (genres as Genre[]).map(g => g.name)
        : (genres as string[])
      ).filter((genre, index, self) => self.indexOf(genre) === index) // Убираем дубли через filter
    : ["Неизвестный жанр"];

  // Форматируем рейтинг: 2 знака после запятой, если число, иначе "N/A"
  const formattedRating =
    averageRating !== null && !isNaN(Number(averageRating))
      ? Number(averageRating).toFixed(2)
      : "N/A";

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700">
      {/* Название */}
      <h1 className="text-3xl font-bold text-white mb-4 tracking-tight">{title}</h1>

      {/* Жанры */}
      <div className="flex flex-wrap gap-2 mb-4">
        {genreNames.map((genre, index) => (
          <span
            key={index} // Используем index, так как имена уникальны после фильтрации
            className="bg-gray-700 text-gray-200 text-sm font-medium px-3 py-1 rounded-full shadow-md"
          >
            {genre}
          </span>
        ))}
      </div>

      {/* Описание */}
      <p className="text-gray-300 text-base mb-4 leading-relaxed">{description}</p>

      {/* Продолжительность, дата выхода и оценка */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm font-medium">Продолжительность:</span>
          <span className="text-white text-sm">{duration} мин</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm font-medium">Дата выхода:</span>
          <span className="text-white text-sm">{new Date(releaseDate).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Оценка */}
      <div className="flex items-center gap-2">
        <span className="text-gray-400 text-sm font-medium">Оценка пользователей:</span>
        <div className="flex items-center gap-1 bg-gray-700 px-3 py-1 rounded-full shadow-md">
          <FaStar className="text-orange-500" />
          <span className="text-white text-sm font-semibold">{formattedRating}</span>
        </div>
      </div>
    </div>
  );
};

export default MovieDetails;