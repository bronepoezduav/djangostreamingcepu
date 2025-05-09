// MovieRatingForm.tsx
import React, { useState } from 'react';
import axios from 'axios';

interface MovieRatingFormProps {
  filmId: number;
}

const MovieRatingForm: React.FC<MovieRatingFormProps> = ({ filmId }) => {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    axios
      .post(`http://localhost:8000/api/films/${filmId}/ratings/`, { rating, comment })
      .then((response) => {
        console.log('Отзыв успешно отправлен', response.data);
        setRating(0);
        setComment('');
      })
      .catch((error) => {
        console.error('Ошибка при отправке отзыва', error);
      });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <div>
        <label>Оценка: </label>
        <input
          type="number"
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          min="0"
          max="5"
          step="0.1"
          className="border p-2 rounded"
        />
      </div>
      <div>
        <label>Отзыв: </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="border p-2 rounded w-full"
        ></textarea>
      </div>
      <button type="submit" className="bg-blue-500 text-white p-2 rounded mt-2">Оставить отзыв</button>
    </form>
  );
};

export default MovieRatingForm;
