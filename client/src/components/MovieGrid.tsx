import { useState } from 'react';
import { MovieCard } from './MovieCard';
import { MovieModal } from './MovieModal';
import type { Movie, Occasion, Mood } from '../types';

interface MovieGridProps {
  movies: Movie[];
  occasion: Occasion | null;
  mood: Mood | null;
  plexHeaders?: Record<string, string>;
  allMovies?: Movie[];
}

export function MovieGrid({ movies, occasion, mood, plexHeaders, allMovies }: MovieGridProps) {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  if (movies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <span className="text-6xl mb-4">🎬</span>
        <p className="text-lg">No movies match your filters</p>
        <p className="text-sm">Try adjusting your criteria</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {movies.map((movie) => (
          <MovieCard
            key={movie.id}
            movie={movie}
            onClick={() => setSelectedMovie(movie)}
          />
        ))}
      </div>

      {selectedMovie && (
        <MovieModal
          movie={selectedMovie}
          occasion={occasion}
          mood={mood}
          onClose={() => setSelectedMovie(null)}
          plexHeaders={plexHeaders}
          allMovies={allMovies}
        />
      )}
    </>
  );
}
