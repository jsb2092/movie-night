import { useState, useMemo } from 'react';
import { MovieModal } from './MovieModal';
import type { Movie, Occasion, Mood } from '../types';

interface ScatterPlotProps {
  movies: Movie[];
  occasion: Occasion | null;
  mood: Mood | null;
  plexHeaders?: Record<string, string>;
  allMovies?: Movie[];
}

// Map genres to mood scores (0-100)
function getMoodScores(movie: Movie): { chaos: number; darkness: number } {
  let chaos = 50;
  let darkness = 50;

  // Chaos axis (calm = 0, chaotic = 100)
  if (movie.genres.includes('Action')) chaos += 20;
  if (movie.genres.includes('Comedy')) chaos += 10;
  if (movie.genres.includes('Thriller')) chaos += 15;
  if (movie.genres.includes('Horror')) chaos += 15;
  if (movie.genres.includes('War')) chaos += 20;
  if (movie.genres.includes('Drama')) chaos -= 15;
  if (movie.genres.includes('Romance')) chaos -= 10;
  if (movie.genres.includes('Documentary')) chaos -= 20;
  if (movie.genres.includes('Family')) chaos -= 10;

  // Darkness axis (heartwarming = 0, dark = 100)
  if (movie.genres.includes('Horror')) darkness += 25;
  if (movie.genres.includes('Thriller')) darkness += 15;
  if (movie.genres.includes('Crime')) darkness += 15;
  if (movie.genres.includes('War')) darkness += 15;
  if (movie.genres.includes('Drama')) darkness += 5;
  if (movie.genres.includes('Comedy')) darkness -= 20;
  if (movie.genres.includes('Family')) darkness -= 25;
  if (movie.genres.includes('Animation')) darkness -= 15;
  if (movie.genres.includes('Romance')) darkness -= 10;

  // Add some randomness based on title hash for variety
  const hash = movie.title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  chaos += (hash % 20) - 10;
  darkness += ((hash * 7) % 20) - 10;

  // Clamp to 5-95 range to keep dots visible
  return {
    chaos: Math.max(5, Math.min(95, chaos)),
    darkness: Math.max(5, Math.min(95, darkness)),
  };
}

export function ScatterPlot({ movies, occasion, mood, plexHeaders, allMovies }: ScatterPlotProps) {
  const [hoveredMovie, setHoveredMovie] = useState<Movie | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  const plotData = useMemo(() => {
    return movies.map((movie) => ({
      movie,
      ...getMoodScores(movie),
    }));
  }, [movies]);

  if (movies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <span className="text-6xl mb-4">📊</span>
        <p className="text-lg">No movies to plot</p>
        <p className="text-sm">Adjust your filters to see movies</p>
      </div>
    );
  }

  return (
    <>
      <div className="glass rounded-2xl p-6">
        {/* Legend */}
        <div className="flex justify-between items-center mb-4 text-sm text-gray-400">
          <span>Calm</span>
          <span className="text-lg font-medium text-white">Movie Mood Map</span>
          <span>Chaotic</span>
        </div>

        {/* Plot area */}
        <div className="relative aspect-[4/3] md:aspect-[2/1]">
          {/* Axis labels - inside plot area */}
          <div className="absolute left-2 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 py-2 pointer-events-none">
            <span>Dark</span>
            <span>Heartwarming</span>
          </div>

          {/* Grid */}
          <svg className="absolute inset-0 w-full h-full">
            {/* Quadrant lines */}
            <line
              x1="50%"
              y1="0"
              x2="50%"
              y2="100%"
              stroke="rgba(255,255,255,0.1)"
              strokeDasharray="4 4"
            />
            <line
              x1="0"
              y1="50%"
              x2="100%"
              y2="50%"
              stroke="rgba(255,255,255,0.1)"
              strokeDasharray="4 4"
            />

            {/* Quadrant labels */}
            <text x="25%" y="25%" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="12">
              Dark & Calm
            </text>
            <text x="75%" y="25%" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="12">
              Dark & Chaotic
            </text>
            <text x="25%" y="75%" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="12">
              Cozy & Calm
            </text>
            <text x="75%" y="75%" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="12">
              Fun & Wild
            </text>
          </svg>

          {/* Movie dots */}
          <div className="absolute inset-0">
            {plotData.map(({ movie, chaos, darkness }) => (
              <button
                key={movie.id}
                className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-200 hover:scale-150 hover:z-10 focus:outline-none focus:ring-2 focus:ring-primary-400"
                style={{
                  left: `${chaos}%`,
                  top: `${darkness}%`,
                  backgroundColor: getColorForGenres(movie.genres),
                }}
                onMouseEnter={() => setHoveredMovie(movie)}
                onMouseLeave={() => setHoveredMovie(null)}
                onClick={() => setSelectedMovie(movie)}
                title={movie.title}
              />
            ))}
          </div>

          {/* Hover tooltip */}
          {hoveredMovie && (
            <div
              className="absolute z-20 pointer-events-none"
              style={{
                left: `${getMoodScores(hoveredMovie).chaos}%`,
                top: `${getMoodScores(hoveredMovie).darkness}%`,
                transform: 'translate(-50%, -120%)',
              }}
            >
              <div className="glass rounded-lg p-3 shadow-xl min-w-[200px]">
                <div className="flex gap-3">
                  {hoveredMovie.thumb && (
                    <img
                      src={hoveredMovie.thumb}
                      alt=""
                      className="w-12 h-18 object-cover rounded"
                    />
                  )}
                  <div>
                    <p className="font-medium text-sm">{hoveredMovie.title}</p>
                    <p className="text-xs text-gray-400">{hoveredMovie.year}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {hoveredMovie.genres.slice(0, 2).map((g) => (
                        <span
                          key={g}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-white/10"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Genre legend */}
        <div className="flex flex-wrap justify-center gap-3 mt-6 text-xs">
          {[
            { genre: 'Action', color: '#ef4444' },
            { genre: 'Comedy', color: '#f59e0b' },
            { genre: 'Drama', color: '#6366f1' },
            { genre: 'Horror', color: '#7c3aed' },
            { genre: 'Romance', color: '#ec4899' },
            { genre: 'Sci-Fi', color: '#06b6d4' },
            { genre: 'Other', color: '#6b7280' },
          ].map(({ genre, color }) => (
            <div key={genre} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-gray-400">{genre}</span>
            </div>
          ))}
        </div>
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

function getColorForGenres(genres: string[]): string {
  if (genres.includes('Action')) return '#ef4444';
  if (genres.includes('Comedy')) return '#f59e0b';
  if (genres.includes('Horror')) return '#7c3aed';
  if (genres.includes('Romance')) return '#ec4899';
  if (genres.includes('Science Fiction')) return '#06b6d4';
  if (genres.includes('Drama')) return '#6366f1';
  if (genres.includes('Animation')) return '#10b981';
  if (genres.includes('Thriller')) return '#dc2626';
  return '#6b7280';
}
