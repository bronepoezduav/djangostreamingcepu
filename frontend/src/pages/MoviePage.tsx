// MoviePage.tsx
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

  useEffect(() => {
    const token = localStorage.getItem("access");
    axios
      .get(`http://localhost:8000/api/films/${id}/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      .then((response) => {
        const movieData = response.data;
        console.log("video_url из API:", movieData.video_url);
        setMovie({
          ...movieData,
          reviews: movieData.reviews.map((review: any) => ({
            id: review.id,
            user_id: review.user_id,
            username: review.username,
            rating: Number(review.rating),
            avatar: review.avatar || null,
            comment: review.comment,
            rated_at: review.rated_at,
          })),
        });
        setLoading(false);
      })
      .catch((error) => {
        console.error("Ошибка загрузки фильма:", error);
        setError("Не удалось загрузить фильм.");
        setLoading(false);
      });

    axios
      .get(`http://localhost:8000/api/films/${id}/comments/list/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      .then((response) => {
        setComments(response.data);
      })
      .catch((error) => {
        console.error("Ошибка комментариев:", error);
      });
  }, [id]);

  if (loading) return <p className="text-center text-gray-500">Загрузка...</p>;
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
            {movie.video_url && !error ? (
              <MoviePlayer
                videoUrl={movie.video_url}
                onError={(msg) => setError(msg)}
              />
            ) : (
              <div className="relative w-full max-w-5xl mx-auto mt-10 rounded-xl overflow-hidden shadow-2xl bg-gray-900 p-4 text-center text-red-500">
                {error || "Видео недоступно"}
              </div>
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