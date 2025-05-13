import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { PlayIcon, PauseIcon, SpeakerWaveIcon, SpeakerXMarkIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/solid';
import '../styles/MoviePlayer.css';

interface MoviePlayerProps {
  videoUrl: string;
  onError?: (error: string) => void;
}

const MoviePlayer: React.FC<MoviePlayerProps> = ({ videoUrl, onError }) => {
  const playerRef = useRef<ReactPlayer>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [watermarkText, setWatermarkText] = useState('Free User');

  useEffect(() => {
    console.log('HEAD запрос для:', videoUrl);
    let fallbackWatermark = 'fu';

    // Извлечь user_id из токена
    const tokenMatch = videoUrl.match(/token=([^&]+)/);
    let userId: string | null = null;
    if (tokenMatch) {
      const token = tokenMatch[1];
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.user_id) {
          userId = payload.user_id;
          console.log('Извлечён user_id из токена:', userId);
        }
      } catch (e) {
        console.error('Ошибка декодирования токена:', e);
      }
    }

    // Извлечь film_id из videoUrl (например, films/4/video)
    const filmIdMatch = videoUrl.match(/films\/(\d+)\/video/);
    const filmId = filmIdMatch ? filmIdMatch[1] : 'Unknown';
    console.log('Извлечён film_id из URL:', filmId);

    // Установить fallbackWatermark
    fallbackWatermark = userId ? `u${userId}f${filmId}` : `fuf${filmId}`;

    fetch(videoUrl, { method: 'HEAD' })
      .then((response) => {
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
        console.log('HEAD ответ:', response.status, headers);
        if (response.ok) {
          const text = response.headers.get('X-Watermark-Text') || fallbackWatermark;
          console.log('Установлен водяной знак:', text);
          setWatermarkText(text);
        } else {
          console.warn('HEAD запрос не удался:', response.status);
          setWatermarkText(fallbackWatermark);
        }
      })
      .catch((err) => {
        console.error('Ошибка HEAD:', err);
        setWatermarkText(fallbackWatermark);
      });

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = 300;
        canvas.height = 50;
        const drawWatermark = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.font = '10px Arial'; // Уменьшен размер шрифта
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; // Увеличена прозрачность
          ctx.textAlign = 'right';
          ctx.fillText(watermarkText, 280, 40);
        };
        drawWatermark();
        const interval = setInterval(() => {
          canvas.style.top = `${Math.random() * 80 + 10}%`;
          canvas.style.left = `${Math.random() * 80 + 10}%`;
        }, 5000);
        return () => clearInterval(interval);
      }
    }
  }, [watermarkText, videoUrl]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputFocused = 
        activeElement instanceof HTMLInputElement || 
        activeElement instanceof HTMLTextAreaElement;

      if (e.code === 'Space' && !isInputFocused) {
        e.preventDefault();
        setPlaying((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newProgress = parseFloat(e.target.value);
    setProgress(newProgress);
    if (playerRef.current) {
      const seekToTime = (newProgress / 100) * duration;
      playerRef.current.seekTo(seekToTime, 'seconds');
    }
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto mt-10 rounded-xl overflow-hidden shadow-2xl bg-gray-900">
      <div className="player-wrapper relative">
        <ReactPlayer
          ref={playerRef}
          url={videoUrl}
          width="100%"
          height="100%"
          playing={playing}
          volume={volume}
          muted={muted}
          controls={false}
          light={true}
          onProgress={(state) => setProgress(state.played * 100)}
          onDuration={(dur) => setDuration(dur)}
          onError={(e) => {
            console.error("Ошибка воспроизведения:", e);
            if (onError) onError("Не удалось воспроизвести видео.");
          }}
          className="react-player aspect-video"
        />
        <canvas
          ref={canvasRef}
          className="absolute pointer-events-none"
          style={{ top: '10%', left: '80%' }}
        />
        <div className="controls absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-900 to-transparent text-white flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
          <button
            onClick={() => setPlaying(!playing)}
            className="p-2 hover:text-red-600 transition-colors"
          >
            {playing ? <PauseIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8" />}
          </button>
          <div className="flex items-center w-full mx-4">
            <span className="text-sm mr-2">{formatTime((progress / 100) * duration)}</span>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={handleSeek}
              className="w-full h-2 bg-gray-700 rounded-full cursor-pointer custom-range"
              style={{ '--progress': `${progress}%` } as React.CSSProperties}
            />
            <span className="text-sm ml-2">{formatTime(duration)}</span>
          </div>
          <div className="flex items-center">
            <button
              onClick={() => setMuted(!muted)}
              className="p-2 hover:text-red-600 transition-colors"
            >
              {muted || volume === 0 ? <SpeakerXMarkIcon className="w-6 h-6" /> : <SpeakerWaveIcon className="w-6 h-6" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={muted ? 0 : volume}
              onChange={(e) => {
                const newVolume = parseFloat(e.target.value);
                setVolume(newVolume);
                setMuted(newVolume === 0);
              }}
              className="w-20 h-2 bg-gray-700 rounded-full cursor-pointer custom-range"
              style={{ '--progress': `${(muted ? 0 : volume) * 100}%` } as React.CSSProperties}
            />
          </div>
          <button
            onClick={() => {
              const wrapper = document.querySelector('.player-wrapper') as HTMLElement;
              if (wrapper) {
                if (!document.fullscreenElement) {
                  wrapper.requestFullscreen();
                } else {
                  document.exitFullscreen();
                }
              }
            }}
            className="p-2 hover:text-red-600 transition-colors"
          >
            <ArrowsPointingOutIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoviePlayer;