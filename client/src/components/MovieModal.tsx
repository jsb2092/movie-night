import { useEffect, useState } from 'react';
import { X, Star, Clock, Calendar, RefreshCw, Sparkles } from 'lucide-react';
import { usePairings } from '../hooks/usePairings';
import { useRatings } from '../hooks/useRatings';
import { useImageUrl } from '../contexts/ImageContext';
import { PairingCard } from './PairingCard';
import type { Movie, Occasion, Mood, MoviePairings } from '../types';

interface MovieModalProps {
  movie: Movie;
  occasion: Occasion | null;
  mood: Mood | null;
  onClose: () => void;
  plexHeaders?: Record<string, string>;
}

// Star rating component with half-star support
function StarRating({
  rating,
  onRate,
  size = 24,
}: {
  rating: number;
  onRate: (rating: number) => void;
  size?: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const displayRating = hovered !== null ? hovered : rating;

  return (
    <div className="flex gap-1" onMouseLeave={() => setHovered(null)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const starValue = star;
        const halfValue = star - 0.5;

        // Determine fill state for this star
        const isFull = displayRating >= starValue;
        const isHalf = !isFull && displayRating >= halfValue;

        return (
          <div
            key={star}
            className="relative transition-transform hover:scale-110 cursor-pointer"
            style={{ width: size, height: size }}
          >
            {/* Background (empty) star */}
            <Star
              size={size}
              className="absolute text-gray-500"
            />

            {/* Half-filled star (clipped) */}
            {isHalf && (
              <div style={{ width: size / 2, overflow: 'hidden', position: 'absolute' }}>
                <Star
                  size={size}
                  className="text-yellow-500 fill-yellow-500"
                />
              </div>
            )}

            {/* Fully filled star */}
            {isFull && (
              <Star
                size={size}
                className="absolute text-yellow-500 fill-yellow-500"
              />
            )}

            {/* Click zones - left half and right half */}
            <div
              className="absolute inset-y-0 left-0 w-1/2"
              onClick={() => onRate(halfValue)}
              onMouseEnter={() => setHovered(halfValue)}
            />
            <div
              className="absolute inset-y-0 right-0 w-1/2"
              onClick={() => onRate(starValue)}
              onMouseEnter={() => setHovered(starValue)}
            />
          </div>
        );
      })}
    </div>
  );
}

export function MovieModal({ movie, occasion, mood, onClose, plexHeaders }: MovieModalProps) {
  const { getPairings, getCachedPairings, loading, error } = usePairings();
  const { getRating, setRating } = useRatings();
  const getImageUrl = useImageUrl();
  const [pairings, setPairings] = useState<MoviePairings | null>(null);

  const userRating = getRating(movie.id);

  useEffect(() => {
    // Close on escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    // Only load cached pairings on mount - don't auto-fetch
    const cached = getCachedPairings(movie.id, occasion, mood);
    if (cached) {
      setPairings(cached);
    }
  }, [movie.id, occasion, mood, getCachedPairings]);

  const handleGetPairings = async () => {
    const newPairings = await getPairings(movie, occasion, mood);
    setPairings(newPairings);
  };

  const hours = Math.floor(movie.duration / 60);
  const minutes = movie.duration % 60;
  const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl glass-dark">
        {/* Hero with backdrop */}
        <div className="relative h-64 md:h-80">
          {movie.art ? (
            <img
              src={getImageUrl(movie.art)}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-900 to-primary-700" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
          >
            <X size={20} />
          </button>

          {/* Movie title and quick info */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-end gap-4">
              {/* Poster thumbnail */}
              {movie.thumb && (
                <img
                  src={getImageUrl(movie.thumb)}
                  alt={movie.title}
                  className="w-24 h-36 object-cover rounded-lg shadow-lg hidden sm:block"
                />
              )}

              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-bold mb-2">
                  {movie.title}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300">
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {movie.year}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {durationStr}
                  </span>
                  {movie.audienceRating > 0 && (
                    <span className="flex items-center gap-1">
                      <Star size={14} className="text-yellow-500 fill-yellow-500" />
                      {(movie.audienceRating * 10).toFixed(0)}%
                    </span>
                  )}
                  <span className="bg-white/20 px-2 py-0.5 rounded text-xs">
                    {movie.contentRating}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Your Rating */}
          <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-white/5">
            <div>
              <h4 className="text-sm text-gray-400 mb-1">Your Rating</h4>
              <StarRating
                rating={userRating?.rating || 0}
                onRate={(rating) => setRating(movie.id, rating, undefined, plexHeaders)}
              />
            </div>
            {userRating && (
              <div className="text-sm text-gray-400">
                Rated {new Date(userRating.watchedAt).toLocaleDateString()}
              </div>
            )}
          </div>

          {/* Tagline */}
          {movie.tagline && (
            <p className="text-lg italic text-gray-400 mb-4">"{movie.tagline}"</p>
          )}

          {/* Summary */}
          <p className="text-gray-300 mb-6 leading-relaxed">{movie.summary}</p>

          {/* Metadata grid */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {/* Genres */}
            <div>
              <h4 className="text-sm text-gray-500 mb-2">Genres</h4>
              <div className="flex flex-wrap gap-1">
                {movie.genres.map((genre) => (
                  <span
                    key={genre}
                    className="px-2 py-1 bg-primary-500/20 text-primary-300 rounded-md text-sm"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>

            {/* Directors */}
            {movie.directors.length > 0 && (
              <div>
                <h4 className="text-sm text-gray-500 mb-2">Director</h4>
                <p className="text-gray-300">{movie.directors.join(', ')}</p>
              </div>
            )}

            {/* Cast */}
            {movie.actors.length > 0 && (
              <div className="md:col-span-2">
                <h4 className="text-sm text-gray-500 mb-2">Cast</h4>
                <p className="text-gray-300">{movie.actors.join(', ')}</p>
              </div>
            )}
          </div>

          {/* Pairings section */}
          <div className="border-t border-white/10 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Tonight's Pairings</h3>
              {pairings ? (
                <button
                  onClick={handleGetPairings}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm text-gray-300 disabled:opacity-50"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  Regenerate
                </button>
              ) : (
                <button
                  onClick={handleGetPairings}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {loading ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  {loading ? 'Generating...' : 'Get Pairings'}
                </button>
              )}
            </div>

            {pairings ? (
              <PairingCard pairings={pairings} loading={loading} error={error} />
            ) : !loading ? (
              <div className="text-center py-8 text-gray-400">
                <p className="mb-2">No pairings yet</p>
                <p className="text-sm">Click "Get Pairings" to generate drink and snack suggestions for this movie</p>
              </div>
            ) : (
              <PairingCard pairings={null} loading={loading} error={error} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
