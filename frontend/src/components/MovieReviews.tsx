import React, { useState } from "react";
import { jwtDecode } from "jwt-decode";

interface Review {
  id: number;
  user_id: number;
  username: string;
  rating: number;
  avatar: string | null;
  comment: string;
  rated_at: string;
}

interface MovieReviewsProps {
  reviews: Review[];
}

const MovieReviews: React.FC<MovieReviewsProps> = ({ reviews }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const reviewsPerPage = 5;

  const token = localStorage.getItem("access");
  const decodedToken = token ? (jwtDecode(token) as { user_id: number }) : null;
  const currentUserId = decodedToken?.user_id;

  // Отделяем отзыв текущего пользователя
  const userReview = reviews.find((review) => review.user_id === currentUserId);
  const otherReviews = reviews.filter((review) => review.user_id !== currentUserId);

  // Сортируем остальные отзывы по дате
  const sortedOtherReviews = [...otherReviews].sort(
    (a, b) => new Date(b.rated_at).getTime() - new Date(a.rated_at).getTime()
  );

  // Собираем итоговый список: сначала отзыв пользователя (если есть), потом остальные
  const sortedReviews = userReview ? [userReview, ...sortedOtherReviews] : sortedOtherReviews;

  const indexOfLastReview = currentPage * reviewsPerPage;
  const indexOfFirstReview = indexOfLastReview - reviewsPerPage;
  const currentReviews = sortedReviews.slice(indexOfFirstReview, indexOfLastReview);
  const totalPages = Math.ceil(sortedReviews.length / reviewsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="w-full mx-auto">
      <h2 className="text-2xl font-semibold text-white">Отзывы</h2>
      {currentReviews.length > 0 ? (
        <div className="space-y-4">
          {currentReviews.map((review) => (
            <div
              key={review.id}
              className={`relative p-4 rounded-xl shadow-md transition-all duration-300 bg-gradient-to-r from-gray-800 to-gray-900 hover:shadow-lg ${
                review.user_id === currentUserId ? "border-2 border-red-500" : "border border-gray-700"
              }`}
            >
              {/* Рейтинг в углу */}
              <div className="absolute right-2 top-2 text-yellow-400 font-semibold text-sm">
                ⭐ {review.rating}
              </div>
              {/* Аватар и имя */}
              <div className="flex items-center mb-2">
                <img
                  src={review.avatar || "/default-avatar.png"}
                  alt="Аватар"
                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-600 mr-3"
                />
                <p className="text-white font-medium text-base">{review.username}</p>
              </div>
              {/* Комментарий */}
              <p className="text-gray-200 text-sm line-clamp-2">{review.comment}</p>
              {/* Дата */}
              <p className="text-xs text-gray-400 mt-1">
                {new Date(review.rated_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400 text-center text-sm">Отзывов пока нет</p>
      )}

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1 mt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`px-2 py-1 rounded-full text-sm font-medium ${
                currentPage === page
                  ? "bg-red-500 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              } transition duration-200`}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MovieReviews;