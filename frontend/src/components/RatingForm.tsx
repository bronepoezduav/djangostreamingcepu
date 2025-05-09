import React, { useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

interface RatingFormProps {
  filmId: number;
}

const RatingForm: React.FC<RatingFormProps> = ({ filmId }) => {
  const [rating, setRating] = useState<number | "">("");
  const [comment, setComment] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [existingRating, setExistingRating] = useState<{ id: number; rating: number; comment: string } | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const token = localStorage.getItem("access");
  const isAuthenticated = !!token;

  const fetchRating = async () => {
    if (!token) {
      console.error("Токен не найден, пользователь не авторизован.");
      return;
    }

    console.log("Получение существующих отзывов...");
    try {
      const response = await axios.get(`http://localhost:8000/films/${filmId}/ratings/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const decodedToken = jwtDecode(token) as { user_id: number };
      const currentUserId = decodedToken.user_id;

      console.log("Текущий user_id из токена:", currentUserId);
      console.log("Ответ от API:", response.data);

      const userRating = response.data.find((rating: any) => rating.user_id === currentUserId);

      if (userRating) {
        console.log("Найденный отзыв пользователя:", userRating);
        setExistingRating({
          id: userRating.id,
          rating: Number(userRating.rating),
          comment: userRating.comment,
        });
        setRating(Number(userRating.rating));
        setComment(userRating.comment);
        setIsEditing(false);
      } else {
        console.log("Отзыв для текущего пользователя не найден.");
        setExistingRating(null);
      }
    } catch (error) {
      console.error("Ошибка при получении отзыва:", error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      console.log("Пользователь авторизован, загружаем отзыв...");
      fetchRating();
    } else {
      console.log("Пользователь не авторизован.");
    }
  }, [filmId, isAuthenticated, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      setError("Вы должны войти в систему, чтобы оставить оценку.");
      return;
    }

    try {
      const decodedToken = jwtDecode(token) as { user_id: number };
      console.log("Декодированный токен:", decodedToken);
      const userId = decodedToken.user_id;

      const method = existingRating ? "put" : "post";
      const url = existingRating
        ? `http://localhost:8000/films/${filmId}/ratings/${existingRating.id}/`
        : `http://localhost:8000/films/${filmId}/ratings/`;

      const data = {
        rating: Number(rating).toFixed(2),
        film_id: filmId,
        comment: comment,
        user: userId,
      };
      console.log("Отправка запроса на создание/обновление отзыва:", { method, url, data });

      await axios[method](url, data, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Отзыв успешно отправлен!");
      setSuccess(true);

      setTimeout(() => {
        window.location.reload();
      }, 500);

      setRating("");
      setComment("");
      setIsEditing(false);
      setIsExpanded(false);

      await fetchRating();

      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setError("Произошла ошибка при отправке оценки.");
      console.error("Ошибка при отправке отзыва:", error);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log("Редактируем отзыв...");
    setIsEditing(true);
    setIsExpanded(true);
  };

  const toggleForm = () => {
    setIsExpanded((prev) => !prev);
  };

  return (
    <div className="w-full mx-auto">
      {isAuthenticated ? (
        <div className="bg-gray-800 rounded-xl shadow-md overflow-hidden">
          {/* Заголовок с кнопкой разворачивания */}
          <div
            className="flex justify-between items-center p-4 cursor-pointer bg-gradient-to-r from-red-500 to-orange-500 rounded-t-xl"
            onClick={toggleForm}
          >
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-semibold text-white">
                {existingRating ? "Ваш отзыв" : "Оставить отзыв"}
              </h2>
              {existingRating && (
                <span className="text-lg text-yellow-400">
                  ★ {existingRating.rating}
                </span>
              )}
            </div>
            <span
              className={`text-white transition-transform duration-300 ${
                isExpanded ? "rotate-180" : ""
              }`}
            >
              ▼
            </span>
          </div>

          {/* Форма с анимацией */}
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isExpanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-gray-800">
              {error && <p className="text-red-400 text-sm">{error}</p>}
              {success && <p className="text-green-400 text-sm">Отзыв успешно добавлен!</p>}

              <div>
                <label className="block text-lg text-white mb-2">Оценка:</label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`text-2xl transition-transform ${
                        rating && typeof rating === "number" && rating >= value
                          ? "text-yellow-400 transform scale-125"
                          : "text-gray-300"
                      } hover:text-yellow-500 hover:scale-125`}
                      onClick={() => setRating(value)}
                      disabled={existingRating !== null && !isEditing}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-lg text-white mb-2">Комментарий:</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full p-4 border border-gray-600 rounded-xl bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-red-500 shadow-md"
                  rows={4}
                  placeholder="Ваш комментарий..."
                  required
                  disabled={existingRating !== null && !isEditing}
                />
              </div>

              {existingRating && !isEditing ? (
                <button
                  type="button"
                  onClick={handleEditClick}
                  className="w-full py-3 bg-white text-red-600 rounded-xl font-semibold shadow-lg hover:bg-red-100 transition duration-300"
                >
                  Редактирование
                </button>
              ) : (
                <button
                  type="submit"
                  className="w-full py-3 bg-white text-red-600 rounded-xl font-semibold shadow-lg hover:bg-red-100 transition duration-300"
                >
                  {existingRating ? "Сохранить изменения" : "Отправить"}
                </button>
              )}
            </form>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-4">Войдите, чтобы оставить отзыв.</p>
      )}
    </div>
  );
};

export default RatingForm;