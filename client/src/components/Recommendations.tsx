import { useState } from 'react';
import { Sparkles, ChevronRight, Star, Loader2 } from 'lucide-react';
import { useRatings, useRecommendations } from '../hooks/useRatings';
import { useImageUrl } from '../contexts/ImageContext';
import type { Movie, Occasion, Mood } from '../types';

interface RecommendationsProps {
  movies: Movie[];
  occasion: Occasion | null;
  mood: Mood | null;
  onSelectMovie: (movie: Movie) => void;
  isLoading?: boolean;
}

export function Recommendations({ movies, onSelectMovie, isLoading }: RecommendationsProps) {
  const { ratings, favorites, recentlyWatched } = useRatings();
  const { recommendations, reason, topGenres } = useRecommendations(movies, ratings);
  const getImageUrl = useImageUrl();
  const [expanded, setExpanded] = useState(false);

  // Show loading state while data is being fetched
  if (isLoading || movies.length === 0) {
    return (
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={18} className="text-primary-400" />
          <h3 className="font-medium">For You</h3>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 size={16} className="animate-spin" />
          <span>Finding recommendations...</span>
        </div>
      </div>
    );
  }

  // Get movie objects for favorites
  const favoriteMovies = favorites
    .slice(0, 5)
    .map(r => movies.find(m => m.id === r.movieId))
    .filter((m): m is Movie => m !== undefined);

  // Get movie objects for recently watched
  const recentMovies = recentlyWatched
    .slice(0, 5)
    .map(r => ({ movie: movies.find(m => m.id === r.movieId), rating: r }))
    .filter((item): item is { movie: Movie; rating: typeof ratings[0] } => item.movie !== undefined);

  if (ratings.length === 0) {
    return (
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={18} className="text-primary-400" />
          <h3 className="font-medium">For You</h3>
        </div>
        <p className="text-sm text-gray-400">
          Rate some movies to get personalized recommendations!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Personalized Picks */}
      <div className="glass rounded-xl p-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between mb-3"
        >
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary-400" />
            <h3 className="font-medium">For You</h3>
          </div>
          <ChevronRight
            size={18}
            className={`text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        </button>

        <p className="text-xs text-gray-400 mb-3">{reason}</p>

        {topGenres && topGenres.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {topGenres.map(genre => (
              <span
                key={genre}
                className="px-2 py-0.5 text-xs rounded-full bg-primary-500/20 text-primary-300"
              >
                {genre}
              </span>
            ))}
          </div>
        )}

        <div className={`space-y-2 ${expanded ? '' : 'max-h-[200px] overflow-hidden'}`}>
          {recommendations.slice(0, expanded ? 10 : 4).map(movie => (
            <button
              key={movie.id}
              onClick={() => onSelectMovie(movie)}
              className="w-full flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
            >
              {movie.thumb && (
                <img
                  src={getImageUrl(movie.thumb)}
                  alt={movie.title}
                  className="w-8 h-12 object-cover rounded"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{movie.title}</p>
                <p className="text-xs text-gray-400">
                  {movie.year} • {movie.genres.slice(0, 2).join(', ')}
                </p>
              </div>
            </button>
          ))}
        </div>

        {!expanded && recommendations.length > 4 && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full mt-2 text-xs text-primary-400 hover:text-primary-300"
          >
            Show more
          </button>
        )}
      </div>

      {/* Favorites */}
      {favoriteMovies.length > 0 && (
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Star size={18} className="text-yellow-500 fill-yellow-500" />
            <h3 className="font-medium">Your Favorites</h3>
          </div>
          <div className="space-y-2">
            {favoriteMovies.slice(0, 3).map(movie => (
              <button
                key={movie.id}
                onClick={() => onSelectMovie(movie)}
                className="w-full flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
              >
                {movie.thumb && (
                  <img
                    src={getImageUrl(movie.thumb)}
                    alt={movie.title}
                    className="w-8 h-12 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{movie.title}</p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => {
                      const rating = favorites.find(f => f.movieId === movie.id)?.rating || 0;
                      return (
                        <Star
                          key={star}
                          size={10}
                          className={star <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-500'}
                        />
                      );
                    })}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recently Watched */}
      {recentMovies.length > 0 && (
        <div className="glass rounded-xl p-4">
          <h3 className="font-medium mb-3">Recently Rated</h3>
          <div className="space-y-2">
            {recentMovies.slice(0, 3).map(({ movie, rating }) => (
              <button
                key={movie.id}
                onClick={() => onSelectMovie(movie)}
                className="w-full flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
              >
                {movie.thumb && (
                  <img
                    src={getImageUrl(movie.thumb)}
                    alt={movie.title}
                    className="w-8 h-12 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{movie.title}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(rating.watchedAt).toLocaleDateString()}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="glass rounded-xl p-4">
        <h3 className="font-medium mb-3">Your Stats</h3>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-2xl font-bold text-primary-400">{ratings.length}</p>
            <p className="text-xs text-gray-400">Movies Rated</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-2xl font-bold text-yellow-500">{favorites.length}</p>
            <p className="text-xs text-gray-400">Favorites</p>
          </div>
        </div>
      </div>
    </div>
  );
}
