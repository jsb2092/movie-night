import { useState, useMemo, useCallback } from 'react';
import { Trophy, RefreshCw, Play, Crown } from 'lucide-react';
import { MovieModal } from './MovieModal';
import { useImageUrl } from '../contexts/ImageContext';
import type { Movie, Occasion, Mood } from '../types';

interface BracketProps {
  movies: Movie[];
  occasion: Occasion | null;
  mood: Mood | null;
  plexHeaders?: Record<string, string>;
  allMovies?: Movie[];
}

interface Match {
  id: string;
  round: number;
  position: number;
  movie1: Movie | null;
  movie2: Movie | null;
  winner: Movie | null;
}

type BracketSize = 8 | 16 | 32;

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generateBracket(movies: Movie[], size: BracketSize): Match[] {
  const shuffled = shuffleArray(movies).slice(0, size);
  const matches: Match[] = [];

  // Calculate number of rounds
  const numRounds = Math.log2(size);

  // First round matches
  for (let i = 0; i < size / 2; i++) {
    matches.push({
      id: `r1-${i}`,
      round: 1,
      position: i,
      movie1: shuffled[i * 2] || null,
      movie2: shuffled[i * 2 + 1] || null,
      winner: null,
    });
  }

  // Create empty matches for subsequent rounds
  let matchesInRound = size / 4;
  for (let round = 2; round <= numRounds; round++) {
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        id: `r${round}-${i}`,
        round,
        position: i,
        movie1: null,
        movie2: null,
        winner: null,
      });
    }
    matchesInRound /= 2;
  }

  return matches;
}

function getRoundName(round: number, totalRounds: number): string {
  const fromFinal = totalRounds - round;
  if (fromFinal === 0) return 'Final';
  if (fromFinal === 1) return 'Semi-Finals';
  if (fromFinal === 2) return 'Quarter-Finals';
  return `Round ${round}`;
}

export function Bracket({ movies, occasion, mood, plexHeaders, allMovies }: BracketProps) {
  const [bracketSize, setBracketSize] = useState<BracketSize>(8);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [champion, setChampion] = useState<Movie | null>(null);
  const getImageUrl = useImageUrl();

  const numRounds = Math.log2(bracketSize);

  const currentMatch = useMemo(() => {
    if (!isStarted) return null;
    // Find first incomplete match where both movies are set
    return matches.find((m) => m.movie1 && m.movie2 && !m.winner) || null;
  }, [matches, isStarted]);

  const progress = useMemo(() => {
    const total = matches.length;
    const completed = matches.filter((m) => m.winner).length;
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
  }, [matches]);

  const startBracket = useCallback(() => {
    const newMatches = generateBracket(movies, bracketSize);
    setMatches(newMatches);
    setIsStarted(true);
    setChampion(null);
  }, [movies, bracketSize]);

  const selectWinner = useCallback((match: Match, winner: Movie) => {
    setMatches((prev) => {
      const updated = prev.map((m) => {
        if (m.id === match.id) {
          return { ...m, winner };
        }
        return m;
      });

      // If this was the final, we have a champion
      if (match.round === numRounds) {
        setChampion(winner);
        return updated;
      }

      // Advance winner to next round
      const nextRound = match.round + 1;
      const nextPosition = Math.floor(match.position / 2);
      const isFirstInPair = match.position % 2 === 0;

      return updated.map((m) => {
        if (m.round === nextRound && m.position === nextPosition) {
          return isFirstInPair
            ? { ...m, movie1: winner }
            : { ...m, movie2: winner };
        }
        return m;
      });
    });
  }, [numRounds]);

  const resetBracket = useCallback(() => {
    setMatches([]);
    setIsStarted(false);
    setChampion(null);
  }, []);

  // Available bracket sizes based on movie count
  const availableSizes: BracketSize[] = useMemo(() => {
    const sizes: BracketSize[] = [];
    if (movies.length >= 8) sizes.push(8);
    if (movies.length >= 16) sizes.push(16);
    if (movies.length >= 32) sizes.push(32);
    return sizes;
  }, [movies.length]);

  if (movies.length < 8) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <span className="text-6xl mb-4">🏆</span>
        <p className="text-lg">Not enough movies for a bracket</p>
        <p className="text-sm">You need at least 8 movies to start a tournament</p>
      </div>
    );
  }

  // Champion celebration screen
  if (champion) {
    return (
      <div className="glass rounded-2xl p-8">
        <div className="text-center">
          <div className="relative inline-block mb-6">
            <Crown className="absolute -top-8 left-1/2 -translate-x-1/2 text-yellow-400" size={48} />
            {champion.thumb && (
              <img
                src={getImageUrl(champion.thumb)}
                alt={champion.title}
                className="w-48 h-72 object-cover rounded-xl shadow-2xl ring-4 ring-yellow-400"
              />
            )}
          </div>
          <h2 className="text-3xl font-bold mb-2">Champion!</h2>
          <p className="text-xl text-primary-400 mb-2">{champion.title}</p>
          <p className="text-gray-400 mb-6">{champion.year} • {champion.genres.slice(0, 3).join(', ')}</p>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setSelectedMovie(champion)}
              className="px-6 py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-medium transition-colors"
            >
              View Movie
            </button>
            <button
              onClick={resetBracket}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              <RefreshCw size={18} />
              New Tournament
            </button>
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
      </div>
    );
  }

  // Setup screen
  if (!isStarted) {
    return (
      <div className="glass rounded-2xl p-8">
        <div className="text-center max-w-md mx-auto">
          <Trophy className="mx-auto mb-4 text-yellow-400\" size={64} />
          <h2 className="text-2xl font-bold mb-2">Movie Bracket</h2>
          <p className="text-gray-400 mb-6">
            Can't decide what to watch? Let your movies battle it out tournament-style!
          </p>

          <div className="mb-6">
            <p className="text-sm text-gray-400 mb-3">Select bracket size:</p>
            <div className="flex gap-3 justify-center">
              {availableSizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setBracketSize(size)}
                  className={`px-6 py-3 rounded-xl font-medium transition-all ${
                    bracketSize === size
                      ? 'bg-primary-600 text-white'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {size} Movies
                </button>
              ))}
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-6">
            {bracketSize} random movies will compete in {Math.log2(bracketSize)} rounds
          </p>

          <button
            onClick={startBracket}
            className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 rounded-xl font-semibold text-lg transition-all flex items-center gap-2 mx-auto"
          >
            <Play size={24} />
            Start Tournament
          </button>
        </div>
      </div>
    );
  }

  // Active tournament - show current matchup
  return (
    <>
      <div className="space-y-6">
        {/* Progress bar */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">
              {currentMatch ? getRoundName(currentMatch.round, numRounds) : 'Tournament'}
            </span>
            <span className="text-sm text-gray-400">
              Match {progress.completed + 1} of {progress.total}
            </span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-500"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

        {/* Current matchup */}
        {currentMatch && (
          <div className="glass rounded-2xl p-6">
            <h3 className="text-center text-lg font-semibold mb-6">
              {getRoundName(currentMatch.round, numRounds)} - Choose Your Winner
            </h3>

            <div className="flex items-center justify-center gap-4 md:gap-8">
              {/* Movie 1 */}
              {currentMatch.movie1 && (
                <button
                  onClick={() => selectWinner(currentMatch, currentMatch.movie1!)}
                  className="group flex flex-col items-center"
                >
                  <div className="relative">
                    {currentMatch.movie1.thumb && (
                      <img
                        src={getImageUrl(currentMatch.movie1.thumb)}
                        alt={currentMatch.movie1.title}
                        className="w-32 h-48 md:w-40 md:h-60 object-cover rounded-xl shadow-lg ring-2 ring-transparent group-hover:ring-primary-400 transition-all group-hover:scale-105"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-xl transition-all flex items-center justify-center">
                      <Trophy className="opacity-0 group-hover:opacity-100 text-yellow-400 transition-opacity" size={32} />
                    </div>
                  </div>
                  <p className="mt-3 font-medium text-center max-w-[140px] truncate">
                    {currentMatch.movie1.title}
                  </p>
                  <p className="text-sm text-gray-400">{currentMatch.movie1.year}</p>
                </button>
              )}

              {/* VS */}
              <div className="text-3xl font-bold text-gray-600">VS</div>

              {/* Movie 2 */}
              {currentMatch.movie2 && (
                <button
                  onClick={() => selectWinner(currentMatch, currentMatch.movie2!)}
                  className="group flex flex-col items-center"
                >
                  <div className="relative">
                    {currentMatch.movie2.thumb && (
                      <img
                        src={getImageUrl(currentMatch.movie2.thumb)}
                        alt={currentMatch.movie2.title}
                        className="w-32 h-48 md:w-40 md:h-60 object-cover rounded-xl shadow-lg ring-2 ring-transparent group-hover:ring-primary-400 transition-all group-hover:scale-105"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-xl transition-all flex items-center justify-center">
                      <Trophy className="opacity-0 group-hover:opacity-100 text-yellow-400 transition-opacity" size={32} />
                    </div>
                  </div>
                  <p className="mt-3 font-medium text-center max-w-[140px] truncate">
                    {currentMatch.movie2.title}
                  </p>
                  <p className="text-sm text-gray-400">{currentMatch.movie2.year}</p>
                </button>
              )}
            </div>

            <p className="text-center text-sm text-gray-500 mt-6">
              Click on the movie you'd rather watch
            </p>
          </div>
        )}

        {/* Mini bracket view */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Tournament Bracket</h3>
          <div className="overflow-x-auto">
            <div className="flex gap-6 min-w-max">
              {Array.from({ length: numRounds }, (_, roundIndex) => {
                const round = roundIndex + 1;
                const roundMatches = matches.filter((m) => m.round === round);

                return (
                  <div key={round} className="flex flex-col gap-2">
                    <p className="text-xs text-gray-500 text-center mb-2">
                      {getRoundName(round, numRounds)}
                    </p>
                    {roundMatches.map((match) => (
                      <div
                        key={match.id}
                        className={`bg-white/5 rounded-lg p-2 text-xs space-y-1 min-w-[120px] ${
                          currentMatch?.id === match.id ? 'ring-2 ring-primary-400' : ''
                        }`}
                      >
                        <div className={`truncate ${match.winner?.id === match.movie1?.id ? 'text-yellow-400 font-medium' : 'text-gray-400'}`}>
                          {match.movie1?.title || '—'}
                        </div>
                        <div className="border-t border-white/10" />
                        <div className={`truncate ${match.winner?.id === match.movie2?.id ? 'text-yellow-400 font-medium' : 'text-gray-400'}`}>
                          {match.movie2?.title || '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Reset button */}
        <div className="text-center">
          <button
            onClick={resetBracket}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
          >
            Cancel Tournament
          </button>
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
