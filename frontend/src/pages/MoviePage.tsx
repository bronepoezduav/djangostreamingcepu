import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MoviePoster from "../components/MoviePoster";
import MovieDetails from "../components/MovieDetails";
import MoviePlayer from "../components/MoviePlayer";
import RatingForm from "../components/RatingForm";
import MovieReviews from "../components/MovieReviews";
import MovieComments from "../components/MovieComments";

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
  video: string;
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

  useEffect(() => {
    axios
      .get(`http://localhost:8000/api/films/${id}/`)
      .then((response) => {
        const movieData = response.data;
        console.log("Данные фильма с сервера:", movieData);

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
        setError(error?.message || "Не удалось загрузить фильм.");
        setLoading(false);
      });

    axios
      .get(`http://localhost:8000/api/films/${id}/comments/list/`)
      .then((response) => {
        console.log("Комментарии с сервера:", response.data);
        setComments(response.data);
      })
      .catch((error) => {
        console.error("Ошибка при загрузке комментариев:", error);
      });
  }, [id]);

  if (loading) return <p className="text-center text-gray-500">Загрузка...</p>;
  if (error) return <p className="text-center text-red-500">{error}</p>;
  if (!movie) return <p className="text-center text-gray-500">Фильм не найден</p>;

  const averageRating =
    movie.reviews.length > 0
      ? Number(
          (movie.reviews.reduce((sum, review) => sum + review.rating, 0) / movie.reviews.length).toFixed(2)
        )
      : null;

  return (
    <div>
      <Navbar />
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex flex-col md:flex-row items-start gap-6">
          {/* Левая часть: Постер, Описание, Плеер */}
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
            {movie.video ? (
              <MoviePlayer videoUrl={movie.video} onError={(msg) => setError(msg)} />
            ) : (
              <p className="text-center text-gray-500">Видео недоступно</p>
            )}
          </div>
          {/* Правая часть: Форма и Отзывы */}
          <div className="w-full md:w-1/4 space-y-1">
            <RatingForm filmId={movie.id} />
            <MovieReviews reviews={movie.reviews} />
          </div>
        </div>

        {/* Комментарии внизу */}
        <div className="mt-8">
          <MovieComments
            filmId={movie.id} // number
            comments={comments} // Comment[]
            setComments={setComments} // React.Dispatch<React.SetStateAction<Comment[]>>
          />
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default MoviePage;