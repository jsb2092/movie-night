import { useState } from 'react';
import { X, Sparkles, Loader2, Film } from 'lucide-react';
import { MovieModal } from './MovieModal';
import type { Movie, Occasion, Mood } from '../types';

interface SurpriseMeProps {
  movies: Movie[];
  occasion: Occasion | null;
  mood: Mood | null;
  onClose: () => void;
  plexHeaders?: Record<string, string>;
  apiKey?: string;
}

interface Suggestion {
  movieId: string;
  title: string;
  reason: string;
}

const MOOD_PROMPTS = [
  "I'm exhausted after a long week and just want to turn my brain off",
  "I'm feeling nostalgic and want something cozy",
  "I'm in the mood for something intense that will keep me on the edge of my seat",
  "I want to laugh until my sides hurt",
  "I'm hosting friends and we want something we can chat over",
  "I need a good cry",
  "I want to see something visually stunning",
  "I'm feeling adventurous and want something I'd never normally pick",
];

export function SurpriseMe({
  movies,
  occasion,
  mood: filterMood,
  onClose,
  plexHeaders,
  apiKey,
}: SurpriseMeProps) {
  const [moodInput, setMoodInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMovieModal, setShowMovieModal] = useState(false);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  const suggestedMovie = suggestion
    ? movies.find((m) => m.id === suggestion.movieId)
    : null;

  const handleSubmit = async () => {
    if (!moodInput.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setSuggestion(null);

    // Filter out excluded movies
    const availableMovies = movies.filter(m => !excludedIds.has(m.id));

    if (availableMovies.length === 0) {
      setError("You've seen all the suggestions! Start over to try again.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mood: moodInput,
          movies: availableMovies.map((m) => ({
            id: m.id,
            title: m.title,
            year: m.year,
            genres: m.genres,
            duration: m.duration,
            summary: m.summary,
            contentRating: m.contentRating,
          })),
          apiKey,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get suggestion');
      }

      const data = await response.json();
      setSuggestion(data);
      // Add to excluded list for next "Try Again"
      setExcludedIds(prev => new Set([...prev, data.movieId]));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptClick = (prompt: string) => {
    setMoodInput(prompt);
  };

  const handleTryAgain = () => {
    handleSubmit();
  };

  const handleStartOver = () => {
    setSuggestion(null);
    setMoodInput('');
    setExcludedIds(new Set());
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-lg rounded-2xl glass-dark overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary-500/20">
                <Sparkles className="text-primary-400\" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Surprise Me</h2>
                <p className="text-sm text-gray-400">Let AI pick the perfect movie</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {!suggestion ? (
              <>
                {/* Mood input */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">
                    How are you feeling? What kind of experience do you want?
                  </label>
                  <textarea
                    value={moodInput}
                    onChange={(e) => setMoodInput(e.target.value)}
                    placeholder="e.g., I'm tired after work and want something light and funny..."
                    className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-primary-500 resize-none"
                    disabled={isLoading}
                  />
                </div>

                {/* Prompt suggestions */}
                <div className="mb-6">
                  <p className="text-xs text-gray-500 mb-2">Or try one of these:</p>
                  <div className="flex flex-wrap gap-2">
                    {MOOD_PROMPTS.slice(0, 4).map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => handlePromptClick(prompt)}
                        className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                        disabled={isLoading}
                      >
                        {prompt.slice(0, 40)}...
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-sm text-red-300">
                    {error}
                  </div>
                )}

                {/* Submit button */}
                <button
                  onClick={handleSubmit}
                  disabled={!moodInput.trim() || isLoading}
                  className="w-full py-3 bg-primary-600 hover:bg-primary-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Finding the perfect movie...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Surprise Me!
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-500 text-center mt-3">
                  Choosing from {movies.length} movies in your library
                </p>
              </>
            ) : (
              /* Suggestion result */
              <div className="text-center">
                <div className="mb-4">
                  <span className="text-4xl">🎬</span>
                </div>
                <p className="text-sm text-gray-400 mb-2">Perfect pick for you:</p>
                <h3 className="text-2xl font-bold mb-4">{suggestion.title}</h3>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  {suggestion.reason}
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowMovieModal(true)}
                    className="flex-1 py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Film size={18} />
                    View Movie
                  </button>
                  <button
                    onClick={handleTryAgain}
                    disabled={isLoading}
                    className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Sparkles size={18} />
                    )}
                    Try Again
                  </button>
                </div>

                <button
                  onClick={handleStartOver}
                  className="mt-4 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Start over with different mood
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Movie modal */}
      {showMovieModal && suggestedMovie && (
        <MovieModal
          movie={suggestedMovie}
          occasion={occasion}
          mood={filterMood}
          onClose={() => setShowMovieModal(false)}
          plexHeaders={plexHeaders}
          allMovies={movies}
        />
      )}
    </>
  );
}
