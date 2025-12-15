import { useMemo, useState } from 'react';
import type { Movie, MarathonEntry } from '../types';

interface MarathonScatterPlotProps {
  entries: MarathonEntry[];
  movies: Movie[];
  onSelectEntry?: (entry: MarathonEntry) => void;
}

// Estimate movie "vibe" based on genres
function getMoviePosition(movie: Movie): { x: number; y: number } {
  const genres = movie.genres.map(g => g.toLowerCase());

  // X axis: Dark/Cynical (-1) to Heartwarming/Sentimental (1)
  let x = 0;
  if (genres.includes('horror') || genres.includes('thriller')) x -= 0.6;
  if (genres.includes('crime') || genres.includes('mystery')) x -= 0.3;
  if (genres.includes('drama')) x -= 0.1;
  if (genres.includes('war')) x -= 0.4;
  if (genres.includes('romance')) x += 0.4;
  if (genres.includes('family')) x += 0.5;
  if (genres.includes('animation')) x += 0.3;
  if (genres.includes('holiday')) x += 0.6;
  if (genres.includes('comedy')) x += 0.2;

  // Y axis: Calm (-1) to Chaotic (1)
  let y = 0;
  if (genres.includes('action')) y += 0.6;
  if (genres.includes('adventure')) y += 0.3;
  if (genres.includes('thriller')) y += 0.4;
  if (genres.includes('horror')) y += 0.3;
  if (genres.includes('comedy')) y += 0.2;
  if (genres.includes('drama')) y -= 0.3;
  if (genres.includes('romance')) y -= 0.2;
  if (genres.includes('documentary')) y -= 0.5;

  // Clamp to -1 to 1
  x = Math.max(-1, Math.min(1, x));
  y = Math.max(-1, Math.min(1, y));

  // Add small random offset to prevent overlap
  x += (Math.random() - 0.5) * 0.15;
  y += (Math.random() - 0.5) * 0.15;

  return { x, y };
}

// Get color based on primary genre
function getGenreColor(movie: Movie): string {
  const genre = movie.genres[0]?.toLowerCase() || '';
  if (genre.includes('action')) return '#ef4444'; // red
  if (genre.includes('comedy')) return '#f59e0b'; // amber
  if (genre.includes('drama')) return '#8b5cf6'; // purple
  if (genre.includes('horror') || genre.includes('thriller')) return '#1f2937'; // dark
  if (genre.includes('family') || genre.includes('animation')) return '#10b981'; // green
  if (genre.includes('romance')) return '#ec4899'; // pink
  if (genre.includes('adventure')) return '#3b82f6'; // blue
  return '#6b7280'; // gray
}

export function MarathonScatterPlot({ entries, movies, onSelectEntry }: MarathonScatterPlotProps) {
  const [hoveredEntry, setHoveredEntry] = useState<MarathonEntry | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);

  const getMovie = (movieId: string) => movies.find(m => m.id === movieId);

  // Get standard phases only (ignore custom/unique phases)
  const STANDARD_PHASES = ['Friends Phase', 'Solo Phase', 'Family Phase', 'Extended Phase', 'Friends', 'Solo', 'Family', 'Grandma'];
  const phases = useMemo(() => {
    const phaseSet = new Set(entries.map(e => e.phase).filter(Boolean));
    // Only include phases that match standard ones or appear multiple times
    const phaseCounts = entries.reduce((acc, e) => {
      if (e.phase) acc[e.phase] = (acc[e.phase] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Array.from(phaseSet).filter(p => {
      if (!p) return false;
      return STANDARD_PHASES.some(sp => p.toLowerCase().includes(sp.toLowerCase())) ||
        (phaseCounts[p] ?? 0) >= 2;
    }) as string[];
  }, [entries]);

  // Filter entries by phase
  const filteredEntries = useMemo(() => {
    if (!selectedPhase) return entries;
    return entries.filter(e => e.phase === selectedPhase);
  }, [entries, selectedPhase]);

  // Calculate positions for each entry
  const plottedEntries = useMemo(() => {
    return filteredEntries.map(entry => {
      const movie = getMovie(entry.movieId);
      if (!movie) return null;

      const pos = getMoviePosition(movie);
      const color = getGenreColor(movie);
      const date = new Date(entry.date + 'T12:00:00');
      const dayLabel = date.getDate().toString();

      return {
        entry,
        movie,
        x: pos.x,
        y: pos.y,
        color,
        dayLabel,
      };
    }).filter(Boolean);
  }, [filteredEntries, movies]);

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Vibe Map</h3>
        {phases.length > 0 && (
          <div className="flex gap-1">
            <button
              onClick={() => setSelectedPhase(null)}
              className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                !selectedPhase ? 'bg-primary-600 text-white' : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              All
            </button>
            {phases.map(phase => (
              <button
                key={phase}
                onClick={() => setSelectedPhase(phase)}
                className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                  selectedPhase === phase ? 'bg-primary-600 text-white' : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                {phase.replace(' Phase', '')}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scatter plot */}
      <div className="relative h-[500px] bg-gray-900/50 rounded-xl overflow-hidden">
        {/* Axis labels */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs text-gray-500">Chaotic</div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-gray-500">Calm</div>
        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 -rotate-90">Dark</div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 rotate-90">Heartwarming</div>

        {/* Grid lines */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-px bg-white/10" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-full w-px bg-white/10" />
        </div>

        {/* Quadrant labels */}
        <div className="absolute top-4 left-4 text-xs text-gray-600">Chaotic Dark</div>
        <div className="absolute top-4 right-4 text-xs text-gray-600">Chaotic Good</div>
        <div className="absolute bottom-4 left-4 text-xs text-gray-600">Calm Dark</div>
        <div className="absolute bottom-4 right-4 text-xs text-gray-600">Calm Good</div>

        {/* Movie dots */}
        {plottedEntries.map((item) => {
          if (!item) return null;
          const { entry, movie, x, y, color, dayLabel } = item;

          // Convert -1..1 to percentage (with padding)
          const left = ((x + 1) / 2) * 80 + 10; // 10-90%
          const top = ((1 - y) / 2) * 80 + 10; // invert y, 10-90%

          const isHovered = hoveredEntry?.movieId === entry.movieId;

          return (
            <div
              key={entry.movieId}
              className="absolute transition-all duration-200 cursor-pointer"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                transform: `translate(-50%, -50%) scale(${isHovered ? 1.3 : 1})`,
                zIndex: isHovered ? 10 : 1,
              }}
              onMouseEnter={() => setHoveredEntry(entry)}
              onMouseLeave={() => setHoveredEntry(null)}
              onClick={() => onSelectEntry?.(entry)}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shadow-lg border-2 border-white/20"
                style={{ backgroundColor: color }}
              >
                {dayLabel}
              </div>

              {/* Tooltip */}
              {isHovered && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 rounded-lg shadow-xl text-sm whitespace-nowrap z-20">
                  <p className="font-semibold">{movie.title}</p>
                  <p className="text-xs text-gray-400">{movie.genres.slice(0, 2).join(', ')}</p>
                  {entry.drink && (
                    <p className="text-xs text-purple-400 mt-1">🍸 {entry.drink.name}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-3 justify-center">
        <div className="flex items-center gap-1 text-xs">
          <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
          <span className="text-gray-400">Action</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
          <span className="text-gray-400">Comedy</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <div className="w-3 h-3 rounded-full bg-[#8b5cf6]" />
          <span className="text-gray-400">Drama</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <div className="w-3 h-3 rounded-full bg-[#10b981]" />
          <span className="text-gray-400">Family</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <div className="w-3 h-3 rounded-full bg-[#ec4899]" />
          <span className="text-gray-400">Romance</span>
        </div>
      </div>
    </div>
  );
}
