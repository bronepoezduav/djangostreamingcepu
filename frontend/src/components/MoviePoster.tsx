import React from "react";

interface MoviePosterProps {
  image: string;
  title: string;
}

const MoviePoster: React.FC<MoviePosterProps> = ({ image, title }) => {
  const imageUrl = image ? image : `${process.env.REACT_APP_API_URL}/media/films/blank_film.jpg`; // Постер по умолчанию

  return (
    <img
      src={imageUrl}
      alt={title}
      className="w-full rounded-lg shadow-lg mb-4 object-cover"
    />
  );
};

export default MoviePoster;
