import { useState, useMemo, useCallback, useRef } from 'react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { MovieModal } from './MovieModal';
import type { Movie, Occasion, Mood } from '../types';

interface ScatterPlotProps {
  movies: Movie[];
  occasion: Occasion | null;
  mood: Mood | null;
  plexHeaders?: Record<string, string>;
  allMovies?: Movie[];
}

interface Viewport {
  scale: number;
  positionX: number;
  positionY: number;
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

// Zoom level thresholds
const SHOW_TITLES_ZOOM = 4;
const SHOW_POSTERS_ZOOM = 6;

export function ScatterPlot({ movies, occasion, mood, plexHeaders, allMovies }: ScatterPlotProps) {
  const [hoveredMovie, setHoveredMovie] = useState<Movie | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [viewport, setViewport] = useState<Viewport>({ scale: 1, positionX: 0, positionY: 0 });
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const plotData = useMemo(() => {
    return movies.map((movie) => ({
      movie,
      ...getMoodScores(movie),
    }));
  }, [movies]);

  const handleTransform = useCallback((ref: ReactZoomPanPinchRef) => {
    const { scale, positionX, positionY } = ref.state;
    setViewport({ scale, positionX, positionY });
  }, []);

  // Get visible movies based on viewport
  const visibleMovies = useMemo(() => {
    if (!containerRef.current) return plotData;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const { scale, positionX, positionY } = viewport;

    // Calculate visible area in percentage coordinates
    const visibleLeft = (-positionX / scale) / rect.width * 100;
    const visibleTop = (-positionY / scale) / rect.height * 100;
    const visibleWidth = (rect.width / scale) / rect.width * 100;
    const visibleHeight = (rect.height / scale) / rect.height * 100;

    // Add some padding to prevent popping
    const padding = 10;

    return plotData.filter(({ chaos, darkness }) => {
      return (
        chaos >= visibleLeft - padding &&
        chaos <= visibleLeft + visibleWidth + padding &&
        darkness >= visibleTop - padding &&
        darkness <= visibleTop + visibleHeight + padding
      );
    });
  }, [plotData, viewport]);

  if (movies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <span className="text-6xl mb-4">📊</span>
        <p className="text-lg">No movies to plot</p>
        <p className="text-sm">Adjust your filters to see movies</p>
      </div>
    );
  }

  const showTitles = viewport.scale >= SHOW_TITLES_ZOOM;
  const showPosters = viewport.scale >= SHOW_POSTERS_ZOOM;

  return (
    <>
      <div className="glass rounded-2xl p-6">
        {/* Legend */}
        <div className="flex justify-between items-center mb-4 text-sm text-gray-400">
          <span>Calm</span>
          <div className="text-center">
            <span className="text-lg font-medium text-white">Movie Mood Map</span>
            <p className="text-xs text-gray-500">
              Scroll to zoom • Drag to pan
              {viewport.scale > 1 && ` • ${Math.round(viewport.scale * 100)}%`}
            </p>
          </div>
          <span>Chaotic</span>
        </div>

        {/* Plot area */}
        <div
          ref={containerRef}
          className="relative aspect-[4/3] md:aspect-[2/1] overflow-hidden rounded-xl bg-black/20"
        >
          <TransformWrapper
            ref={transformRef}
            initialScale={1}
            minScale={1}
            maxScale={8}
            wheel={{ step: 0.15 }}
            panning={{ velocityDisabled: true }}
            onTransformed={handleTransform}
            doubleClick={{ disabled: true }}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                {/* Zoom controls */}
                <div className="absolute top-2 right-2 z-30 flex gap-1">
                  <button
                    onClick={() => zoomIn()}
                    className="p-2 rounded-lg bg-black/50 hover:bg-black/70 transition-colors"
                    title="Zoom in"
                  >
                    <ZoomIn size={16} />
                  </button>
                  <button
                    onClick={() => zoomOut()}
                    className="p-2 rounded-lg bg-black/50 hover:bg-black/70 transition-colors"
                    title="Zoom out"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <button
                    onClick={() => resetTransform()}
                    className="p-2 rounded-lg bg-black/50 hover:bg-black/70 transition-colors"
                    title="Reset view"
                  >
                    <Maximize2 size={16} />
                  </button>
                </div>

                {/* Axis labels - fixed position outside transform */}
                <div className="absolute left-2 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 py-2 pointer-events-none z-20">
                  <span>Dark</span>
                  <span>Heartwarming</span>
                </div>

                <TransformComponent
                  wrapperStyle={{ width: '100%', height: '100%' }}
                  contentStyle={{ width: '100%', height: '100%' }}
                >
                  <div className="relative w-full h-full">
                    {/* Grid - scales with zoom */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
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
                      <text x="25%" y="25%" textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="12">
                        Dark & Calm
                      </text>
                      <text x="75%" y="25%" textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="12">
                        Dark & Chaotic
                      </text>
                      <text x="25%" y="75%" textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="12">
                        Cozy & Calm
                      </text>
                      <text x="75%" y="75%" textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="12">
                        Fun & Wild
                      </text>
                    </svg>

                    {/* Movie markers */}
                    <div className="absolute inset-0">
                      {visibleMovies.map(({ movie, chaos, darkness }) => {
                        // Counter-scale to keep markers same screen size
                        const markerScale = 1 / viewport.scale;

                        return (
                          <div
                            key={movie.id}
                            className="absolute -translate-x-1/2 -translate-y-1/2"
                            style={{
                              left: `${chaos}%`,
                              top: `${darkness}%`,
                              transform: `translate(-50%, -50%) scale(${markerScale})`,
                              transformOrigin: 'center center',
                            }}
                          >
                            {showPosters && movie.thumb ? (
                              // Poster view
                              <button
                                className="group relative flex flex-col items-center"
                                onClick={() => setSelectedMovie(movie)}
                                onMouseEnter={() => setHoveredMovie(movie)}
                                onMouseLeave={() => setHoveredMovie(null)}
                              >
                                <div
                                  className="w-16 h-24 rounded-lg overflow-hidden shadow-lg ring-2 ring-transparent group-hover:ring-primary-400 transition-all"
                                  style={{ borderColor: getColorForGenres(movie.genres) }}
                                >
                                  <img
                                    src={movie.thumb}
                                    alt={movie.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="mt-1 px-2 py-0.5 bg-black/80 rounded text-[10px] font-medium max-w-[80px] truncate">
                                  {movie.title}
                                </div>
                              </button>
                            ) : showTitles ? (
                              // Title + dot view
                              <button
                                className="group flex flex-col items-center"
                                onClick={() => setSelectedMovie(movie)}
                                onMouseEnter={() => setHoveredMovie(movie)}
                                onMouseLeave={() => setHoveredMovie(null)}
                              >
                                <div
                                  className="w-4 h-4 rounded-full shadow-lg ring-2 ring-transparent group-hover:ring-white group-hover:scale-125 transition-all"
                                  style={{ backgroundColor: getColorForGenres(movie.genres) }}
                                />
                                <div className="mt-1 px-1.5 py-0.5 bg-black/70 rounded text-[9px] font-medium whitespace-nowrap max-w-[70px] truncate">
                                  {movie.title}
                                </div>
                              </button>
                            ) : (
                              // Dot only view
                              <button
                                className="w-4 h-4 rounded-full shadow-lg hover:scale-150 hover:z-10 transition-all focus:outline-none focus:ring-2 focus:ring-primary-400"
                                style={{ backgroundColor: getColorForGenres(movie.genres) }}
                                onClick={() => setSelectedMovie(movie)}
                                onMouseEnter={() => setHoveredMovie(movie)}
                                onMouseLeave={() => setHoveredMovie(null)}
                                title={movie.title}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </TransformComponent>

                {/* Hover tooltip - fixed position, outside transform */}
                {hoveredMovie && !showTitles && (
                  <div className="absolute z-40 pointer-events-none left-1/2 bottom-4 -translate-x-1/2">
                    <div className="glass rounded-lg p-3 shadow-xl">
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
              </>
            )}
          </TransformWrapper>
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

        {/* Zoom hint */}
        {viewport.scale < SHOW_POSTERS_ZOOM && (
          <p className="text-center text-xs text-gray-500 mt-3">
            {viewport.scale < SHOW_TITLES_ZOOM
              ? 'Zoom in to see movie titles'
              : 'Zoom in more to see movie posters'}
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
