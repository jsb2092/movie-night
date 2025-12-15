import { useState, useCallback, useRef } from 'react';
import { Shuffle, Play } from 'lucide-react';
import { MovieModal } from './MovieModal';
import type { Movie, Occasion, Mood } from '../types';

interface RandomWheelProps {
  movies: Movie[];
  occasion: Occasion | null;
  mood: Mood | null;
}

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
];

export function RandomWheel({ movies, occasion, mood }: RandomWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState<Movie | null>(null);
  const [showModal, setShowModal] = useState(false);
  const spinTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Display up to 14 movies on wheel for visual, but pick from ALL filtered movies
  const displayMovies = movies.slice(0, 14);

  const spin = useCallback(() => {
    if (isSpinning || movies.length === 0) return;

    setIsSpinning(true);
    setWinner(null);

    // Pick winner from ALL filtered movies, not just displayed ones
    const winnerIndex = Math.floor(Math.random() * movies.length);
    const selectedMovie = movies[winnerIndex];

    // For the wheel animation, pick a random display segment to land on
    const displaySegment = Math.floor(Math.random() * displayMovies.length);
    const segmentAngle = 360 / displayMovies.length;
    const targetAngle = displaySegment * segmentAngle + segmentAngle / 2;
    const spins = 5 + Math.random() * 3; // 5-8 full rotations
    const finalRotation = rotation + (spins * 360) + (360 - targetAngle);

    setRotation(finalRotation);

    // Wait for animation to complete, then reveal actual winner
    spinTimeout.current = setTimeout(() => {
      setIsSpinning(false);
      setWinner(selectedMovie);
    }, 4000);
  }, [isSpinning, movies, displayMovies.length, rotation]);

  if (movies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <span className="text-6xl mb-4">🎰</span>
        <p className="text-lg">No movies to spin</p>
        <p className="text-sm">Adjust your filters to add movies to the wheel</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center gap-8">
        {/* Wheel container */}
        <div className="relative">
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
            <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[25px] border-l-transparent border-r-transparent border-t-white drop-shadow-lg" />
          </div>

          {/* Wheel */}
          <div
            className="relative w-80 h-80 md:w-96 md:h-96 rounded-full shadow-2xl"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning
                ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
                : 'none',
            }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {displayMovies.map((movie, index) => {
                const segmentAngle = 360 / displayMovies.length;
                const startAngle = index * segmentAngle;
                const endAngle = startAngle + segmentAngle;

                // Convert to radians and calculate path
                const startRad = (startAngle - 90) * (Math.PI / 180);
                const endRad = (endAngle - 90) * (Math.PI / 180);

                const x1 = 50 + 50 * Math.cos(startRad);
                const y1 = 50 + 50 * Math.sin(startRad);
                const x2 = 50 + 50 * Math.cos(endRad);
                const y2 = 50 + 50 * Math.sin(endRad);

                const largeArc = segmentAngle > 180 ? 1 : 0;

                const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`;

                // Text position (middle of segment, offset from center)
                const midAngle = startAngle + segmentAngle / 2 - 90;
                const midRad = midAngle * (Math.PI / 180);
                const textX = 50 + 35 * Math.cos(midRad);
                const textY = 50 + 35 * Math.sin(midRad);

                return (
                  <g key={movie.id}>
                    <path
                      d={pathData}
                      fill={COLORS[index % COLORS.length]}
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="0.5"
                    />
                    <text
                      x={textX}
                      y={textY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="2.5"
                      fontWeight="bold"
                      transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                    >
                      {movie.title.length > 15
                        ? movie.title.slice(0, 12) + '...'
                        : movie.title}
                    </text>
                  </g>
                );
              })}

              {/* Center circle */}
              <circle
                cx="50"
                cy="50"
                r="10"
                fill="white"
                stroke="rgba(0,0,0,0.2)"
                strokeWidth="0.5"
              />
              <text
                x="50"
                y="50"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="4"
              >
                🎬
              </text>
            </svg>
          </div>
        </div>

        {/* Spin button */}
        <button
          onClick={spin}
          disabled={isSpinning || displayMovies.length === 0}
          className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-500 rounded-full font-semibold text-lg shadow-lg hover:shadow-primary-500/25 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isSpinning ? (
            <>
              <Shuffle className="animate-spin" size={24} />
              Spinning...
            </>
          ) : (
            <>
              <Play size={24} />
              Spin the Wheel!
            </>
          )}
        </button>

        {/* Info text */}
        <p className="text-gray-400 text-sm text-center">
          Selecting from {movies.length} filtered movie{movies.length !== 1 ? 's' : ''}
        </p>

        {/* Winner announcement */}
        {winner && !isSpinning && (
          <div className="glass rounded-2xl p-6 max-w-md text-center animate-fade-in">
            <p className="text-gray-400 mb-2">Tonight's movie is...</p>
            <h3 className="text-2xl font-bold mb-3">{winner.title}</h3>
            <p className="text-gray-400 mb-4">
              {winner.year} • {winner.genres.slice(0, 3).join(', ')}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 bg-primary-600 rounded-lg font-medium hover:bg-primary-500 transition-colors"
              >
                View Details & Pairings
              </button>
              <button
                onClick={spin}
                className="px-4 py-2 bg-white/10 rounded-lg font-medium hover:bg-white/20 transition-colors"
              >
                Spin Again
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && winner && (
        <MovieModal
          movie={winner}
          occasion={occasion}
          mood={mood}
          onClose={() => setShowModal(false)}
        />
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
