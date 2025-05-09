import React, { useState } from "react";
import { FaStar } from "react-icons/fa";

interface MovieCardProps {
  title: string;
  image: string;
  genres?: { id: number; name: string }[];
  description: string;
  average_rating: number | null;
  duration: number;
  onError: () => void;
  disableHoverEffect?: boolean;
}

const MovieCard: React.FC<MovieCardProps> = ({
  title,
  image,
  genres,
  description,
  average_rating,
  duration,
  onError,
  disableHoverEffect = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Форматируем рейтинг: 2 знака после запятой, если число, иначе "N/A"
  const formattedRating =
    average_rating !== null && !isNaN(Number(average_rating))
      ? Number(average_rating).toFixed(2)
      : "N/A";

  return (
    <div
      className={`relative rounded-lg overflow-hidden shadow-lg transition-transform transform w-full sm:w-80 md:w-72 lg:w-64 h-96 ${
        disableHoverEffect ? "" : "group hover:scale-105"
      }`}
      onMouseEnter={() => !disableHoverEffect && setIsHovered(true)}
      onMouseLeave={() => !disableHoverEffect && setIsHovered(false)}
      style={{ aspectRatio: "3/4" }}
    >
      <img
        src={image}
        alt={title}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          disableHoverEffect ? "" : "group-hover:opacity-60"
        }`}
        onError={onError}
      />
      <div>
        {!disableHoverEffect && (
          <div className="absolute bottom-2 left-2 flex flex-col gap-1">
            {genres && genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {genres.slice(0, 3).map((genre) => (
                  <span
                    key={genre.id}
                    className="bg-gray-800 text-white text-xs px-2 py-1 rounded-full"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            )}

            <span className="text-white text-sm font-semibold flex items-center gap-1 bg-black bg-opacity-60 px-2 py-1 rounded-lg w-28 truncate">
              <FaStar className="text-orange-500" /> Оценка: {formattedRating}
            </span>
          </div>
        )}
      </div>

      {!disableHoverEffect && isHovered && (
        <div className="absolute top-0 left-0 w-full bg-black bg-opacity-80 text-white p-4 transition-transform transform translate-y-full group-hover:translate-y-0">
          <h3 className="text-xl text-orange-500">{title}</h3>
          <p className="text-sm">{description}</p>
          <p className="text-xs mt-2 text-gray-300">Продолжительность: {duration} мин</p>
        </div>
      )}
    </div>
  );
};

export default MovieCard;