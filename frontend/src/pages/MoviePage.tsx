// MoviePage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MoviePoster from "../components/MoviePoster";
import MovieDetails from "../components/MovieDetails";
import MoviePlayer from "../components/MoviePlayer";
import RatingForm from "../components/RatingForm";
import MovieReviews from "../components/MovieReviews";
import MovieComments from "../components/MovieComments";
import { refreshToken } from "../services/auth";

interface Comment {
  id: number;
  username: string;
  text: string;
  created_at: string;
  avatar?: string;
}

interface Review {
  id: number;
  user_id: number;
  username: string;
  rating: number;
  avatar: string | null;
  comment: string;
  rated_at: string;
}

interface Movie {
  id: number;
  image: string;
  title: string;
  description: string;
  genres: string[];
  video_url: string;
  comments: Comment[];
  duration: number;
  reviews: Review[];
  release_date: string;
}

const MoviePage = () => {
  const { id } = useParams<{ id: string }>();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [refreshAttempts, setRefreshAttempts] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("access");
    console.log("Токен в localStorage:", token ? "Присутствует" : "Отсутствует");
    if (!token) {
      console.warn("Токен отсутствует, перенаправление на страницу логина");
      navigate("/login");
      return;
    }

    // Настройка axios с токеном
    axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem("access");
        console.log("Отправляемый запрос:", config.url, "Токен:", token || "null");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        } else {
          console.warn("Токен не найден, запрос без Authorization");
        }
        return config;
      },
      (error) => {
        console.error("Ошибка в интерцепторе запроса:", error);
        return Promise.reject(error);
      }
    );

    // Обработка 401 ошибок
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && refreshAttempts < 1) {
          console.log("Получена ошибка 401, попытка обновления токена");
          setRefreshAttempts((prev) => prev + 1);
          try {
            const newToken = await refreshToken();
            if (newToken) {
              error.config.headers.Authorization = `Bearer ${newToken}`;
              localStorage.setItem("access", newToken);
              setRefreshAttempts(0);
              return axios(error.config);
            } else {
              console.warn("Не удалось обновить токен, перенаправление на логин");
              localStorage.removeItem("access");
              localStorage.removeItem("refresh");
              navigate("/login");
            }
          } catch (e) {
            console.error("Ошибка при обновлении токена:", e);
            localStorage.removeItem("access");
            localStorage.removeItem("refresh");
            navigate("/login");
          }
        } else if (error.response?.status === 401) {
          console.warn("Превышено количество попыток обновления, перенаправление на логин");
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          navigate("/login");
        }
        return Promise.reject(error);
      }
    );

    // Загрузка данных фильма
    axios
      .get(`http://localhost:8000/api/films/${id}/`)
      .then((response) => {
        const movieData = response.data;
        console.log("Данные фильма с сервера:", movieData);
        console.log("video_url из API:", movieData.video_url);

        // Добавляем токен к video_url, избегая дублирования
        const token = localStorage.getItem("access");
        if (token && movieData.video_url) {
          // Удаляем существующий ?token= из video_url, если он есть
          const cleanVideoUrl = movieData.video_url.split('?')[0];
          movieData.video_url = `${cleanVideoUrl}?token=${token}`;
          console.log("video_url с токеном:", movieData.video_url);
        } else {
          console.warn("Токен или video_url отсутствует, видео может не загрузиться");
        }

        const formattedReviews: Review[] = movieData.reviews.map((review: any) => ({
          id: review.id,
          user_id: review.user_id,
          username: review.username,
          rating: Number(review.rating),
          avatar: review.avatar || null,
          comment: review.comment,
          rated_at: review.rated_at,
        }));

        setMovie({ ...movieData, reviews: formattedReviews });
        setLoading(false);
      })
      .catch((error) => {
        console.error("Ошибка при загрузке фильма:", error);
        if (error.response?.status === 401) {
          setError("Пожалуйста, войдите в аккаунт для просмотра видео.");
        } else {
          setError(error?.message || "Не удалось загрузить фильм.");
        }
        setLoading(false);
      });

    // Загрузка комментариев
    axios
      .get(`http://localhost:8000/api/films/${id}/comments/list/`)
      .then((response) => {
        console.log("Комментарии с сервера:", response.data);
        setComments(response.data);
      })
      .catch((error) => {
        console.error("Ошибка при загрузке комментариев:", error);
      });
  }, [id, navigate, refreshAttempts]);

  if (loading) return <p className="text-center text-gray-500">Загрузка...</p>;
  if (error) return <p className="text-center text-red-500">{error}</p>;
  if (!movie) return <p className="text-center text-gray-500">Фильм не найден</p>;

  const averageRating =
    movie.reviews.length > 0
      ? Number(
          (
            movie.reviews.reduce((sum, review) => sum + review.rating, 0) /
            movie.reviews.length
          ).toFixed(2)
        )
      : null;

  return (
    <div>
      <Navbar />
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="w-full md:w-3/4 flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-1/3">
                <MoviePoster image={movie.image} title={movie.title} />
              </div>
              <div className="w-full md:w-2/3">
                <MovieDetails
                  title={movie.title}
                  description={movie.description}
                  genres={movie.genres}
                  duration={movie.duration}
                  releaseDate={movie.release_date}
                  averageRating={averageRating}
                />
              </div>
            </div>
            {movie.video_url ? (
              <MoviePlayer
                videoUrl={movie.video_url}
                onError={(msg) => setError(msg)}
              />
            ) : (
              <p className="text-center text-gray-500">Видео недоступно</p>
            )}
          </div>
          <div className="w-full md:w-1/4 space-y-1">
            <RatingForm filmId={movie.id} />
            <MovieReviews reviews={movie.reviews} />
          </div>
        </div>
        <div className="mt-8">
          <MovieComments
            filmId={movie.id}
            comments={comments}
            setComments={setComments}
          />
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default MoviePage;