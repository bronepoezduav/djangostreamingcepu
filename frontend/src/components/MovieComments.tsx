import React, { useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

interface Comment {
  id: number;
  username: string;
  text: string;
  created_at: string;
  avatar?: string;
  user?: number; // Добавляем user для проверки авторства
}

interface MovieCommentsProps {
  filmId: number;
  comments: Comment[];
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
}

const MovieComments: React.FC<MovieCommentsProps> = ({ filmId, comments, setComments }) => {
  const [newComment, setNewComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const token = localStorage.getItem("access");
  const isAuthenticated = !!token;

  // Получаем текущий user_id из токена для проверки авторства
  const getCurrentUserId = () => {
    if (!token) return null;
    try {
      const decodedToken = jwtDecode(token) as { user_id: number };
      return decodedToken.user_id;
    } catch (err) {
      console.error("Ошибка декодирования токена:", err);
      return null;
    }
  };
  const currentUserId = getCurrentUserId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setError("Войдите, чтобы оставить комментарий.");
      console.log("Токен отсутствует в localStorage");
      return;
    }

    let userId: number;
    try {
      const decodedToken = jwtDecode(token) as { user_id: number };
      userId = decodedToken.user_id;
      console.log("Декодированный user_id из токена:", userId);
    } catch (err) {
      console.error("Ошибка декодирования токена:", err);
      setError("Неверный токен авторизации");
      return;
    }

    const data = {
      text: newComment,
      film: filmId,
      user: userId,
    };

    try {
      console.log("Отправляемые данные:", data);
      const response = await axios.post(
        `http://localhost:8000/api/films/${filmId}/comments/`,
        data,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("Ответ от сервера:", response.data);
      setComments((prevComments) => [response.data, ...prevComments]);
      setNewComment("");
      setError(null);
    } catch (err: any) {
      console.error("Ошибка при добавлении комментария:", err);
      if (err.response) {
        setError(`Не удалось добавить комментарий: ${err.response.data.detail || "Неизвестная ошибка"}`);
      } else {
        setError("Не удалось добавить комментарий: ошибка сети");
      }
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!isAuthenticated) {
      setError("Войдите, чтобы удалить комментарий.");
      return;
    }

    try {
      console.log(`Удаление комментария с ID: ${commentId}`);
      await axios.delete(`http://localhost:8000/api/films/${filmId}/comments/${commentId}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("Комментарий успешно удалён");
      setComments((prevComments) => prevComments.filter((comment) => comment.id !== commentId));
      setError(null);
    } catch (err: any) {
      console.error("Ошибка при удалении комментария:", err);
      if (err.response) {
        setError(`Не удалось удалить комментарий: ${err.response.data.detail || "Неизвестная ошибка"}`);
      } else {
        setError("Не удалось удалить комментарий: ошибка сети");
      }
    }
  };

  return (
    <div className="w-full mx-auto">
      <h2 className="text-2xl font-semibold text-white mb-4">Комментарии</h2>
      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="mb-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="w-full p-4 border border-gray-600 rounded-xl bg-gray-700 text-white"
            rows={3}
            placeholder="Ваш комментарий..."
            required
          />
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          <button
            type="submit"
            className="mt-2 py-2 px-4 bg-red-500 text-white rounded-xl hover:bg-red-600"
          >
            Отправить
          </button>
        </form>
      ) : (
        <p className="text-gray-500 mb-4">Войдите, чтобы оставить комментарий.</p>
      )}
      {comments.length > 0 ? (
        comments.map((comment) => (
          <div
            key={comment.id}
            className="p-4 rounded-xl bg-gray-800 border border-gray-700 mb-4"
          >
            <div className="flex items-center space-x-3">
              {comment.avatar ? (
                <img
                  src={comment.avatar}
                  alt={`${comment.username}'s avatar`}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white">
                  {comment.username[0].toUpperCase()}
                </div>
              )}
              <p className="text-white font-medium">{comment.username}</p>
            </div>
            <p className="text-gray-300 mt-2">{comment.text}</p>
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-gray-400">
                {new Date(comment.created_at).toLocaleString()}
              </p>
              {currentUserId === comment.user && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="text-sm text-red-400 hover:text-red-600"
                >
                  Удалить
                </button>
              )}
            </div>
          </div>
        ))
      ) : (
        <p className="text-gray-400">Комментариев пока нет.</p>
      )}
    </div>
  );
};

export default MovieComments;