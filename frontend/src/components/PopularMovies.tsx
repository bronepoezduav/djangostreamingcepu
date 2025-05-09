import { Link } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import MovieCard from './MovieCard';

const PopularMovies = () => {
  const [movies, setMovies] = useState<any[]>([]);
  const movieContainerRef = useRef<HTMLDivElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    axios.get('http://localhost:8000/api/films/')
      .then(response => {
        setMovies(response.data);
      })
      .catch(error => {
        console.error('Ошибка при получении фильмов:', error);
      });

    // Автоматическая прокрутка фильмов
    const startScrolling = () => {
      if (movieContainerRef.current) {
        movieContainerRef.current.scrollLeft += 1;
      }
    };

    // Интервал для прокрутки
    intervalRef.current = setInterval(startScrolling, 20); // Скорость прокрутки (меньше - быстрее)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current); // Очищаем интервал при размонтировании компонента
      }
    };
  }, []);

  const handleImageError = (movieTitle: string) => {
    console.error(`Ошибка загрузки изображения для фильма ${movieTitle}`);
  };

  // Функция для прокрутки влево
  const scrollLeft = () => {
    if (movieContainerRef.current) {
      movieContainerRef.current.scrollBy({
        left: -300, // Прокручиваем на 300px влево
        behavior: 'smooth', // Плавная прокрутка
      });
    }
  };

  // Функция для прокрутки вправо
  const scrollRight = () => {
    if (movieContainerRef.current) {
      movieContainerRef.current.scrollBy({
        left: 300, // Прокручиваем на 300px вправо
        behavior: 'smooth', // Плавная прокрутка
      });
    }
  };

  return (
    <section className="bg-gray-100 py-16 w-full overflow-hidden px-4">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-8">Популярные фильмы</h2>
        <div className="relative">
          {/* Контейнер для прокрутки */}
          <div 
            ref={movieContainerRef}
            className="overflow-x-auto whitespace-nowrap py-4 scroll-smooth"
            style={{ scrollbarWidth: 'auto' }} // Скрываем скроллбар
          >
            <div className="inline-flex space-x-8">
              {movies.map((movie) => (
                <div key={movie.id} className="relative transition-all duration-300 ease-in-out">
                  {/* Оборачиваем MovieCard в Link */}
                  <Link to={`/films/${movie.id}`}>
                    <MovieCard 
                      title={movie.title}
                      image={movie.image || `${process.env.REACT_APP_API_URL}/media/films/blank_film.jpg`}
                      genres={movie.genres}
                      description={movie.description}
                      average_rating={movie.average_rating}
                      duration={movie.duration}
                      onError={() => {}}
                      disableHoverEffect={true} 
                    />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PopularMovies;