import { useState } from 'react';
import { Star, Clock, Eye } from 'lucide-react';
import { useRatings } from '../hooks/useRatings';
import { useImageUrl } from '../contexts/ImageContext';
import type { Movie } from '../types';

interface MovieCardProps {
  movie: Movie;
  onClick: () => void;
}

export function MovieCard({ movie, onClick }: MovieCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const { getRating } = useRatings();
  const getImageUrl = useImageUrl();

  const userRating = getRating(movie.id);

  const hours = Math.floor(movie.duration / 60);
  const minutes = movie.duration % 60;
  const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return (
    <button
      onClick={onClick}
      className="group relative bg-white/5 rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary-500 text-left"
    >
      {/* Poster */}
      <div className="aspect-[2/3] relative overflow-hidden bg-gradient-to-br from-primary-900/50 to-primary-700/50">
        {movie.thumb && !imgError ? (
          <>
            <img
              src={getImageUrl(movie.thumb)}
              alt={movie.title}
              className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
            {!imgLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl opacity-50">🎬</span>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl">🎬</span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* User rating badge */}
        {userRating && (
          <div className="absolute top-2 right-2 bg-yellow-500/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
            <Star size={12} className="text-black fill-black" />
            <span className="text-xs text-black font-medium">{userRating.rating}</span>
          </div>
        )}

        {/* Watch count badge */}
        {!userRating && movie.viewCount && movie.viewCount > 0 && (
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
            <Eye size={12} className="text-green-400" />
            <span className="text-xs text-green-400">{movie.viewCount}</span>
          </div>
        )}

        {/* Content rating badge */}
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-md px-1.5 py-0.5">
          <span className="text-[10px] font-medium text-gray-300">
            {movie.contentRating}
          </span>
        </div>

        {/* Hover info */}
        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <div className="flex flex-wrap gap-1">
            {movie.genres.slice(0, 3).map((genre) => (
              <span
                key={genre}
                className="text-[10px] bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-medium text-sm truncate mb-1" title={movie.title}>
          {movie.title}
        </h3>

        <div className="flex items-center justify-between text-xs text-gray-400 gap-2">
          <span className="shrink-0">{movie.year}</span>

          <div className="flex items-center gap-2 shrink-0">
            {/* Rating */}
            {movie.audienceRating > 0 && (
              <div className="flex items-center gap-1">
                <Star size={10} className="text-yellow-500 fill-yellow-500" />
                <span>{(movie.audienceRating * 10).toFixed(0)}%</span>
              </div>
            )}

            {/* Duration */}
            <div className="flex items-center gap-1 whitespace-nowrap">
              <Clock size={10} />
              <span>{durationStr}</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
