import { useState, useMemo, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { MovieModal } from './MovieModal';
import { useImageUrl } from '../contexts/ImageContext';
import type { Movie, Occasion, Mood } from '../types';

interface TimelineProps {
  movies: Movie[];
  occasion: Occasion | null;
  mood: Mood | null;
  plexHeaders?: Record<string, string>;
  allMovies?: Movie[];
}

interface DecadeData {
  decade: number;
  label: string;
  movies: Movie[];
  color: string;
}

const DECADE_COLORS: Record<number, string> = {
  1920: '#d4a574',
  1930: '#c9a87c',
  1940: '#a8c686',
  1950: '#7ecba1',
  1960: '#6bc5d2',
  1970: '#f4a460',
  1980: '#ff6b9d',
  1990: '#9b6bff',
  2000: '#4ecdc4',
  2010: '#45b7d1',
  2020: '#96e6a1',
};

function getDecadeColor(decade: number): string {
  return DECADE_COLORS[decade] || '#6b7280';
}

export function Timeline({ movies, occasion, mood, plexHeaders, allMovies }: TimelineProps) {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [hoveredMovie, setHoveredMovie] = useState<Movie | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [scrollPosition, setScrollPosition] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const getImageUrl = useImageUrl();

  // Filter out movies with invalid years (first movie was 1888)
  const validMovies = useMemo(() => {
    return movies.filter((m) => m.year >= 1888);
  }, [movies]);

  // Group movies by decade
  const decadeData = useMemo(() => {
    const byDecade = new Map<number, Movie[]>();

    validMovies.forEach((movie) => {
      const decade = Math.floor(movie.year / 10) * 10;
      if (!byDecade.has(decade)) {
        byDecade.set(decade, []);
      }
      byDecade.get(decade)!.push(movie);
    });

    // Sort movies within each decade by year
    byDecade.forEach((movies) => {
      movies.sort((a, b) => a.year - b.year);
    });

    // Convert to array and sort by decade
    const decades: DecadeData[] = Array.from(byDecade.entries())
      .map(([decade, movies]) => ({
        decade,
        label: `${decade}s`,
        movies,
        color: getDecadeColor(decade),
      }))
      .sort((a, b) => a.decade - b.decade);

    return decades;
  }, [validMovies]);

  // Get year range
  const yearRange = useMemo(() => {
    if (validMovies.length === 0) return { min: 1980, max: 2024 };
    const years = validMovies.map((m) => m.year);
    return {
      min: Math.min(...years),
      max: Math.max(...years),
    };
  }, [validMovies]);

  // Group movies by individual year for detailed view
  const moviesByYear = useMemo(() => {
    const byYear = new Map<number, Movie[]>();
    validMovies.forEach((movie) => {
      if (!byYear.has(movie.year)) {
        byYear.set(movie.year, []);
      }
      byYear.get(movie.year)!.push(movie);
    });
    return byYear;
  }, [validMovies]);

  const handleScroll = useCallback((direction: 'left' | 'right') => {
    if (!containerRef.current) return;
    const scrollAmount = containerRef.current.clientWidth * 0.5;
    const newPosition = direction === 'left'
      ? Math.max(0, scrollPosition - scrollAmount)
      : scrollPosition + scrollAmount;
    setScrollPosition(newPosition);
    containerRef.current.scrollTo({ left: newPosition, behavior: 'smooth' });
  }, [scrollPosition]);

  const handleZoom = useCallback((direction: 'in' | 'out' | 'reset') => {
    if (direction === 'reset') {
      setZoomLevel(1);
    } else if (direction === 'in') {
      setZoomLevel((z) => Math.min(4, z * 1.5));
    } else {
      setZoomLevel((z) => Math.max(0.5, z / 1.5));
    }
  }, []);

  if (validMovies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <span className="text-6xl mb-4">📅</span>
        <p className="text-lg">No movies to show</p>
        <p className="text-sm">Adjust your filters to see movies</p>
      </div>
    );
  }

  const baseWidth = 120;
  const yearWidth = baseWidth * zoomLevel;
  const showPosters = zoomLevel >= 2;

  return (
    <>
      <div className="glass rounded-2xl p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold">Timeline Explorer</h2>
            <p className="text-sm text-gray-400">
              {validMovies.length} movies from {yearRange.min} to {yearRange.max}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleZoom('out')}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              title="Zoom out"
            >
              <ZoomOut size={18} />
            </button>
            <span className="text-sm text-gray-400 min-w-[50px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => handleZoom('in')}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              title="Zoom in"
            >
              <ZoomIn size={18} />
            </button>
            <button
              onClick={() => handleZoom('reset')}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              title="Reset zoom"
            >
              <Maximize2 size={18} />
            </button>
          </div>
        </div>

        {/* Decade overview */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {decadeData.map(({ decade, label, movies, color }) => (
            <button
              key={decade}
              onClick={() => {
                // Scroll to decade
                const container = containerRef.current;
                if (container) {
                  const yearStart = decade - yearRange.min;
                  container.scrollTo({ left: yearStart * yearWidth, behavior: 'smooth' });
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-sm"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span>{label}</span>
              <span className="text-gray-500">({movies.length})</span>
            </button>
          ))}
        </div>

        {/* Navigation arrows */}
        <div className="relative">
          <button
            onClick={() => handleScroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/70 hover:bg-black/90 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={() => handleScroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/70 hover:bg-black/90 transition-colors"
          >
            <ChevronRight size={24} />
          </button>

          {/* Timeline container */}
          <div
            ref={containerRef}
            className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent pb-4"
            onScroll={(e) => setScrollPosition(e.currentTarget.scrollLeft)}
          >
            <div
              className="relative"
              style={{
                width: `${(yearRange.max - yearRange.min + 1) * yearWidth}px`,
                minHeight: showPosters ? '320px' : '200px',
              }}
            >
              {/* Year markers and grid */}
              <div className="absolute inset-0 flex">
                {Array.from({ length: yearRange.max - yearRange.min + 1 }, (_, i) => {
                  const year = yearRange.min + i;
                  const decade = Math.floor(year / 10) * 10;
                  const isDecadeStart = year % 10 === 0;
                  const moviesThisYear = moviesByYear.get(year) || [];

                  return (
                    <div
                      key={year}
                      className="relative flex-shrink-0 border-l border-white/5"
                      style={{
                        width: `${yearWidth}px`,
                        backgroundColor: isDecadeStart ? `${getDecadeColor(decade)}10` : 'transparent',
                      }}
                    >
                      {/* Year label */}
                      <div
                        className={`absolute bottom-0 left-1/2 -translate-x-1/2 text-xs ${
                          isDecadeStart ? 'text-white font-bold' : 'text-gray-600'
                        }`}
                      >
                        {zoomLevel >= 1 || isDecadeStart ? year : ''}
                      </div>

                      {/* Movies for this year */}
                      <div className="absolute inset-x-1 top-2 bottom-8 flex flex-col gap-1 items-center overflow-hidden">
                        {moviesThisYear.slice(0, showPosters ? 3 : 8).map((movie, idx) => (
                          <button
                            key={movie.id}
                            onClick={() => setSelectedMovie(movie)}
                            onMouseEnter={() => setHoveredMovie(movie)}
                            onMouseLeave={() => setHoveredMovie(null)}
                            className="relative group"
                            style={{ zIndex: moviesThisYear.length - idx }}
                          >
                            {showPosters && movie.thumb ? (
                              <div className="relative">
                                <img
                                  src={getImageUrl(movie.thumb)}
                                  alt={movie.title}
                                  className="w-14 h-20 object-cover rounded shadow-lg ring-2 ring-transparent group-hover:ring-primary-400 transition-all"
                                />
                                {zoomLevel >= 3 && (
                                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1 py-0.5 bg-black/80 rounded text-[8px] whitespace-nowrap max-w-[60px] truncate">
                                    {movie.title}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div
                                className="w-3 h-3 rounded-full shadow-lg group-hover:scale-150 transition-transform"
                                style={{ backgroundColor: getDecadeColor(decade) }}
                                title={movie.title}
                              />
                            )}
                          </button>
                        ))}
                        {moviesThisYear.length > (showPosters ? 3 : 8) && (
                          <span className="text-[10px] text-gray-500">
                            +{moviesThisYear.length - (showPosters ? 3 : 8)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Hover tooltip */}
        {hoveredMovie && !showPosters && (
          <div className="mt-4 p-3 glass rounded-lg">
            <div className="flex gap-3">
              {hoveredMovie.thumb && (
                <img
                  src={getImageUrl(hoveredMovie.thumb)}
                  alt=""
                  className="w-12 h-18 object-cover rounded"
                />
              )}
              <div>
                <p className="font-medium">{hoveredMovie.title}</p>
                <p className="text-sm text-gray-400">{hoveredMovie.year}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {hoveredMovie.genres.slice(0, 3).map((g) => (
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
        )}

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-2xl font-bold">{yearRange.max - yearRange.min + 1}</p>
            <p className="text-xs text-gray-400">Years Spanned</p>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-2xl font-bold">{decadeData.length}</p>
            <p className="text-xs text-gray-400">Decades</p>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-2xl font-bold">
              {decadeData.reduce((max, d) => Math.max(max, d.movies.length), 0)}
            </p>
            <p className="text-xs text-gray-400">Most in a Decade</p>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-2xl font-bold">
              {Math.round(validMovies.reduce((sum, m) => sum + m.year, 0) / validMovies.length)}
            </p>
            <p className="text-xs text-gray-400">Average Year</p>
          </div>
        </div>

        {/* Zoom hint */}
        {zoomLevel < 2 && (
          <p className="text-center text-xs text-gray-500 mt-4">
            Zoom in to see movie posters
          </p>
        )}
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
