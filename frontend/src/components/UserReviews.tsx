import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { HiTrash } from "react-icons/hi";

interface Review {
  id: number;
  film_id: number;
  film_title: string;
  film_poster: string;
  rating: number;
  comment: string;
  rated_at?: string; // Добавим дату, если сервер её возвращает
}

const UserReviews: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const reviewsPerPage = 5;

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) {
      setError("Пользователь не аутентифицирован");
      return;
    }

    try {
      const decodedToken = jwtDecode(token) as { user_id: number };
      const userId = decodedToken.user_id;

      console.log("Запрос отзывов для пользователя:", userId);
      axios
        .get(`http://localhost:8000/api/user/${userId}/reviews/`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((response) => {
          console.log("Ответ от сервера:", response.data);
          setReviews(response.data);
        })
        .catch((error) => {
          console.error("Ошибка при загрузке отзывов:", error);
          setError("Ошибка при загрузке отзывов.");
        });
    } catch (error) {
      console.error("Ошибка при декодировании токена:", error);
      setError("Ошибка при декодировании токена.");
    }
  }, []);

  const handleDelete = async (reviewId: number, filmId: number) => {
    console.log("Попытка удаления отзыва:", { reviewId, filmId });

    if (!window.confirm("Вы уверены, что хотите удалить этот отзыв?")) {
      console.log("Удаление отменено пользователем.");
      return;
    }

    const token = localStorage.getItem("access");
    if (!token) {
      console.error("Токен не найден.");
      return;
    }

    try {
      console.log("Отправка запроса на удаление отзыва...");
      await axios.delete(`http://localhost:8000/films/${filmId}/ratings/${reviewId}/delete/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Отзыв успешно удален.");
      setReviews((prevReviews) => prevReviews.filter((review) => review.id !== reviewId));
    } catch (error) {
      console.error("Ошибка при удалении отзыва:", error);
      setError("Ошибка при удалении отзыва.");
    }
  };

  // Пагинация
  const sortedReviews = [...reviews].sort(
    (a, b) => new Date(b.rated_at || "").getTime() - new Date(a.rated_at || "").getTime()
  );
  const indexOfLastReview = currentPage * reviewsPerPage;
  const indexOfFirstReview = indexOfLastReview - reviewsPerPage;
  const currentReviews = sortedReviews.slice(indexOfFirstReview, indexOfLastReview);
  const totalPages = Math.ceil(sortedReviews.length / reviewsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="w-full p-6 bg-gray-800 rounded-xl shadow-md flex flex-col h-full">
      <h2 className="text-3xl font-bold text-center text-white mb-6 bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
        Ваши отзывы
      </h2>

      {error && <p className="text-red-400 text-center mb-4">{error}</p>}

      {reviews.length === 0 ? (
        <p className="text-center text-gray-400 flex-grow flex items-center justify-center">
          Вы пока не оставили ни одного отзыва.
        </p>
      ) : (
        <div className="space-y-4 flex-grow">
          {currentReviews.map((review) => (
            <div
              key={review.id}
              className="relative p-4 rounded-xl shadow-md transition-all duration-300 bg-gradient-to-r from-gray-800 to-gray-900 hover:shadow-lg border border-gray-700"
            >
              {/* Рейтинг в углу */}
              <div className="absolute right-2 top-2 text-yellow-400 font-semibold text-sm">
                ★ {review.rating}
              </div>
              {/* Постер и информация */}
              <div className="flex items-center mb-2">
                <img
                  src={review.film_poster}
                  alt={review.film_title}
                  className="w-16 h-20 object-cover rounded-xl border-2 border-red-500 mr-3 shadow-md"
                />
                <div>
                  <Link
                    to={`/films/${review.film_id}`}
                    className="text-lg font-semibold text-white hover:text-red-500 transition duration-300"
                  >
                    {review.film_title}
                  </Link>
                  <p className="text-gray-300 text-sm line-clamp-2">{review.comment}</p>
                  {review.rated_at && (
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(review.rated_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              {/* Кнопка удаления */}
              <button
                onClick={() => handleDelete(review.id, review.film_id)}
                className="absolute bottom-2 right-2 text-white hover:text-red-500 transition-transform transform hover:scale-110"
              >
                <HiTrash size={20} />
              </button>
            </div>
          ))}
        </div>
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

export default UserReviews;