import { useState, useMemo } from 'react';
import {
  Plus,
  Calendar,
  Trash2,
  Film,
  X,
  Sparkles,
  Wine,
  UtensilsCrossed,
  RefreshCw,
  BarChart3,
  Clock,
  Star,
  Loader2,
} from 'lucide-react';
import type { Movie, Holiday, MarathonEntry, Marathon, DrinkPairing, FoodPairing } from '../types';
import { HOLIDAY_LABELS, HOLIDAY_ICONS } from '../types';
import { useMarathons } from '../hooks/useMarathons';

// Genre colors for left border (matches app primary: #c026d3)
const GENRE_COLORS: Record<string, string> = {
  'Action': '#ef4444',
  'Adventure': '#f97316',
  'Animation': '#84cc16',
  'Comedy': '#facc15',
  'Crime': '#6b7280',
  'Documentary': '#14b8a6',
  'Drama': '#3b82f6',
  'Family': '#22c55e',
  'Fantasy': '#a855f7',
  'Horror': '#991b1b',
  'Music': '#c026d3',
  'Mystery': '#6366f1',
  'Romance': '#c026d3',
  'Science Fiction': '#06b6d4',
  'Sci-Fi': '#06b6d4',
  'Thriller': '#dc2626',
  'War': '#78716c',
  'Western': '#d97706',
};

function getGenreColor(genres: string[]): string {
  for (const genre of genres) {
    if (GENRE_COLORS[genre]) return GENRE_COLORS[genre];
  }
  return '#c026d3'; // matches app primary
}
import { useRatings } from '../hooks/useRatings';
import { useImageUrl } from '../contexts/ImageContext';
import { MarathonChat } from './MarathonChat';
import { MarathonScatterPlot } from './MarathonScatterPlot';

// Star rating component
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

  return (
    <div className="flex gap-1" onMouseLeave={() => setHovered(null)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = hovered !== null ? star <= hovered : star <= rating;
        return (
          <button
            key={star}
            onClick={() => onRate(star)}
            onMouseEnter={() => setHovered(star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              size={size}
              className={`transition-colors ${
                filled
                  ? 'text-yellow-500 fill-yellow-500'
                  : 'text-gray-500 hover:text-yellow-400'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

interface MarathonPlannerProps {
  movies: Movie[];
  occasion: string | null;
  mood: string | null;
  headers: Record<string, string>;
}

export function MarathonPlanner({ movies, headers }: MarathonPlannerProps) {
  const {
    marathons,
    createMarathon,
    deleteMarathon,
    addMovieToMarathon,
    removeMovieFromMarathon,
    saveMarathon,
  } = useMarathons();

  const { getRating, setRating } = useRatings();
  const getImageUrl = useImageUrl();

  const [selectedMarathon, setSelectedMarathon] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAIWizard, setShowAIWizard] = useState(false);
  const [showMoviePicker, setShowMoviePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState<string | null>(null);
  const [replaceMovieId, setReplaceMovieId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<MarathonEntry | null>(null);
  const [generatingPairings, setGeneratingPairings] = useState(false);

  // Generate pairings for a single movie entry
  const generateEntryPairings = async (entry: MarathonEntry) => {
    const movie = movies.find(m => m.id === entry.movieId);
    if (!movie || !marathon) return;

    setGeneratingPairings(true);
    try {
      const response = await fetch('/api/pairings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movie: {
            id: movie.id,
            title: movie.title,
            year: movie.year,
            genres: movie.genres,
            summary: movie.summary,
            contentRating: movie.contentRating,
          },
          occasion: marathon.holiday === 'christmas' ? 'family' : null,
          mood: null,
        }),
      });

      if (response.ok) {
        const pairings = await response.json();

        // Convert to marathon entry format (3 drink types)
        const drinks: DrinkPairing[] = pairings.drinks?.map((d: any) => ({
          name: d.name,
          type: d.type === 'alcoholic' ? 'cocktail' : d.type,
          ingredients: d.ingredients,
          instructions: d.instructions,
          vibe: d.vibe,
        })) || [];

        const food: FoodPairing | undefined = pairings.food?.[0] || pairings.food;

        // Update the entry with pairings
        const updatedEntry = { ...entry, drinks, food };
        setSelectedEntry(updatedEntry);

        // Save to marathon
        const updatedEntries = marathon.entries.map(e =>
          e.movieId === entry.movieId ? updatedEntry : e
        );
        saveMarathon({ ...marathon, entries: updatedEntries, updatedAt: Date.now() });
      }
    } catch (error) {
      console.error('Failed to generate pairings:', error);
    } finally {
      setGeneratingPairings(false);
    }
  };

  const handleAIMarathonCreated = (marathon: Marathon) => {
    saveMarathon(marathon);
    setSelectedMarathon(marathon.id);
    setShowAIWizard(false);
  };

  const marathon = marathons.find(m => m.id === selectedMarathon);

  // Get movie by ID
  const getMovie = (movieId: string) => movies.find(m => m.id === movieId);

  // Filter movies for picker
  const filteredMovies = useMemo(() => {
    if (!searchQuery) return movies.slice(0, 50);
    const query = searchQuery.toLowerCase();
    return movies.filter(m =>
      m.title.toLowerCase().includes(query) ||
      m.genres.some(g => g.toLowerCase().includes(query))
    ).slice(0, 50);
  }, [movies, searchQuery]);

  const handleAddMovie = (movieId: string) => {
    if (!selectedMarathon || !pickerDate) return;

    if (replaceMovieId) {
      // Replace mode - remove old movie, add new one
      removeMovieFromMarathon(selectedMarathon, replaceMovieId);
    }

    addMovieToMarathon(selectedMarathon, movieId, pickerDate);
    setShowMoviePicker(false);
    setPickerDate(null);
    setReplaceMovieId(null);
    setSearchQuery('');
  };

  // Calculate marathon stats
  const marathonStats = useMemo(() => {
    if (!marathon) return null;

    const moviesList = marathon.entries
      .map(e => getMovie(e.movieId))
      .filter((m): m is Movie => m !== null);

    const totalRuntime = moviesList.reduce((sum, m) => sum + (m.duration || 0), 0);
    const genres = moviesList.flatMap(m => m.genres);
    const genreCounts = genres.reduce((acc, g) => {
      acc[g] = (acc[g] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      totalMovies: marathon.entries.length,
      totalRuntime,
      topGenres,
      avgRating: moviesList.length > 0
        ? moviesList.reduce((sum, m) => sum + (m.rating || 0), 0) / moviesList.length
        : 0,
    };
  }, [marathon, movies]);

  return (
    <div className="space-y-6">
      {/* AI Wizard Modal */}
      {showAIWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAIWizard(false)} />
          <div className="relative w-full max-w-2xl h-[80vh] flex flex-col">
            <button
              onClick={() => setShowAIWizard(false)}
              className="absolute -top-10 left-0 text-sm text-gray-400 hover:text-white flex items-center gap-1 z-10"
            >
              <X size={16} /> Cancel
            </button>
            <MarathonChat
              movies={movies}
              headers={headers}
              onMarathonCreated={handleAIMarathonCreated}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      {marathons.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <Calendar size={48} className="mx-auto mb-4 text-primary-400" />
          <h2 className="text-xl font-semibold mb-2">Create Your First Marathon</h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Plan a holiday movie marathon with scheduled viewing dates,
            phases, and all your favorite films organized in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setShowAIWizard(true)}
              className="px-6 py-3 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 rounded-xl font-medium transition-all inline-flex items-center gap-2 shadow-lg"
            >
              <Sparkles size={20} />
              AI Marathon Planner
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors inline-flex items-center gap-2"
            >
              <Plus size={20} />
              Manual Setup
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-4 max-w-sm mx-auto">
            The AI planner asks about your schedule, preferences, and who's watching to build a personalized marathon with drink pairings.
          </p>
        </div>
      ) : (
        <>
          {/* Marathon tabs */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {marathons.map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedMarathon(m.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-colors ${
                  selectedMarathon === m.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300'
                }`}
              >
                <span>{HOLIDAY_ICONS[m.holiday]}</span>
                {m.name}
                <span className="text-xs opacity-60">
                  ({m.entries.length})
                </span>
              </button>
            ))}
            <button
              onClick={() => setShowAIWizard(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-primary-600/20 to-purple-600/20 hover:from-primary-600/30 hover:to-purple-600/30 border border-primary-500/30 text-primary-400 hover:text-primary-300 transition-colors"
              title="Create with AI"
            >
              <Sparkles size={16} />
              <span className="text-sm">AI</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title="Manual setup"
            >
              <Plus size={20} />
            </button>
          </div>

          {/* Selected marathon content */}
          {marathon && (
            <div className="space-y-4">
              {/* Marathon header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    {HOLIDAY_ICONS[marathon.holiday]} {marathon.name}
                  </h2>
                  <p className="text-gray-400 text-sm">
                    {new Date(marathon.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' - '}
                    {new Date(marathon.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {' • '}
                    {marathon.entries.length} movies
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Delete this marathon?')) {
                      deleteMarathon(marathon.id);
                      setSelectedMarathon(null);
                    }
                  }}
                  className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {/* Stats summary - full width */}
              {marathonStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="glass rounded-xl p-3 text-center">
                    <Film size={18} className="mx-auto mb-1 text-primary-400" />
                    <p className="text-xl font-bold">{marathonStats.totalMovies}</p>
                    <p className="text-xs text-gray-400">Movies</p>
                  </div>
                  <div className="glass rounded-xl p-3 text-center">
                    <Clock size={18} className="mx-auto mb-1 text-green-400" />
                    <p className="text-xl font-bold">{Math.round(marathonStats.totalRuntime / 60)}h</p>
                    <p className="text-xs text-gray-400">Total Runtime</p>
                  </div>
                  <div className="glass rounded-xl p-3 text-center">
                    <BarChart3 size={18} className="mx-auto mb-1 text-yellow-400" />
                    <p className="text-xl font-bold">{marathonStats.avgRating.toFixed(1)}</p>
                    <p className="text-xs text-gray-400">Avg Rating</p>
                  </div>
                  <div className="glass rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-1">Top Genres</p>
                    <div className="flex flex-wrap gap-1">
                      {marathonStats.topGenres.slice(0, 3).map(([genre]) => (
                        <span key={genre} className="text-xs px-1.5 py-0.5 rounded bg-white/10">
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Scatter Plot and Timeline side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Scatter Plot - left side (larger) */}
                <div className="lg:col-span-3">
                  <MarathonScatterPlot
                    entries={marathon.entries}
                    movies={movies}
                  />
                </div>

                {/* Movie list sidebar - right side */}
                <div className="lg:col-span-2 max-h-[600px] overflow-y-auto pr-2 space-y-3">
                  {/* Add Movie button */}
                  <button
                    onClick={() => {
                      // Default to start date or today
                      const today = new Date().toISOString().split('T')[0];
                      const defaultDate = marathon.startDate > today ? marathon.startDate : today;
                      setPickerDate(defaultDate);
                      setReplaceMovieId(null);
                      setShowMoviePicker(true);
                    }}
                    className="w-full p-3 rounded-xl border-2 border-dashed border-white/20 hover:border-primary-500/50 hover:bg-white/5 transition-colors flex items-center justify-center gap-2 text-gray-400 hover:text-white"
                  >
                    <Plus size={18} />
                    Add Movie
                  </button>

                  {marathon.entries.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <Film size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No movies yet</p>
                      <p className="text-xs">Click "Add Movie" to start building your marathon</p>
                    </div>
                  )}

                  {marathon.entries
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map(entry => {
                      const movie = getMovie(entry.movieId);
                      if (!movie) return null;
                      const dateObj = new Date(entry.date + 'T12:00:00');
                      const isToday = entry.date === new Date().toISOString().split('T')[0];

                      return (
                        <div
                          key={entry.movieId}
                          onClick={() => setSelectedEntry(entry)}
                          className={`glass rounded-xl p-3 cursor-pointer hover:bg-white/10 transition-colors border-l-4 ${
                            isToday ? 'ring-2 ring-primary-500' : ''
                          }`}
                          style={{ borderLeftColor: getGenreColor(movie.genres) }}
                        >
                          <div className="flex items-center gap-3">
                            {movie.thumb && (
                              <img
                                src={getImageUrl(movie.thumb)}
                                alt={movie.title}
                                className="w-12 h-16 object-cover rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold truncate">{movie.title}</p>
                                <span className="text-xs text-gray-400 bg-white/10 px-2 py-0.5 rounded shrink-0">
                                  {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400">{movie.year} • {movie.duration}min</p>
                              {(entry.drinks?.length || entry.drink || entry.food) && (
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {entry.drinks ? (
                                    entry.drinks.map((d, i) => (
                                      <span key={i} className={`text-xs ${
                                        d.type === 'cocktail' ? 'text-purple-400' :
                                        d.type === 'wine-beer' ? 'text-red-400' : 'text-blue-400'
                                      }`}>
                                        {d.type === 'cocktail' ? '🍸' : d.type === 'wine-beer' ? '🍷' : '🧃'}
                                      </span>
                                    ))
                                  ) : entry.drink && (
                                    <span className="text-xs text-amber-400">🍸</span>
                                  )}
                                  {entry.food && (
                                    <span className="text-xs text-orange-400">🍿</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {!marathon && marathons.length > 0 && (
            <div className="glass rounded-2xl p-8 text-center">
              <Film size={48} className="mx-auto mb-4 text-gray-500" />
              <p className="text-gray-400">Select a marathon to view and edit</p>
            </div>
          )}
        </>
      )}

      {/* Create Marathon Modal */}
      {showCreateModal && (
        <CreateMarathonModal
          onClose={() => setShowCreateModal(false)}
          onCreate={(name, holiday, startDate, endDate) => {
            const marathon = createMarathon(name, holiday, startDate, endDate);
            setSelectedMarathon(marathon.id);
            setShowCreateModal(false);
          }}
        />
      )}

      {/* Movie Picker Modal */}
      {showMoviePicker && pickerDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowMoviePicker(false)} />
          <div className="relative w-full max-w-2xl max-h-[80vh] glass-dark rounded-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="font-semibold">
                {replaceMovieId ? 'Replace' : 'Add'} Movie for {new Date(pickerDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </h3>
              <button
                onClick={() => {
                  setShowMoviePicker(false);
                  setReplaceMovieId(null);
                }}
                className="p-1.5 rounded-lg hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 border-b border-white/10 space-y-3">
              {/* Date picker */}
              {!replaceMovieId && marathon && (
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-400">Date:</label>
                  <input
                    type="date"
                    value={pickerDate}
                    min={marathon.startDate}
                    max={marathon.endDate}
                    onChange={(e) => setPickerDate(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-primary-500 text-sm"
                  />
                </div>
              )}
              <input
                type="text"
                placeholder="Search movies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-primary-500"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredMovies.map(movie => (
                <button
                  key={movie.id}
                  onClick={() => handleAddMovie(movie.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left"
                >
                  {movie.thumb && (
                    <img
                      src={getImageUrl(movie.thumb)}
                      alt={movie.title}
                      className="w-10 h-14 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{movie.title}</p>
                    <p className="text-xs text-gray-400">
                      {movie.year} • {movie.duration} min • {movie.genres.slice(0, 2).join(', ')}
                    </p>
                  </div>
                  <Plus size={18} className="text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Entry Detail Modal */}
      {selectedEntry && (() => {
        const movie = getMovie(selectedEntry.movieId);
        if (!movie) return null;
        const dateObj = new Date(selectedEntry.date + 'T12:00:00');

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedEntry(null)} />
            <div className="relative w-full max-w-lg max-h-[85vh] bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden flex flex-col">
              {/* Header with movie poster */}
              <div className="relative h-48 shrink-0 bg-gradient-to-b from-primary-900/30 to-gray-900/50">
                {movie.thumb && (
                  <img
                    src={getImageUrl(movie.thumb)}
                    alt={movie.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-30"
                  />
                )}
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70"
                >
                  <X size={20} />
                </button>
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-xs text-gray-400">
                    {dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                  <h3 className="text-2xl font-bold">{movie.title}</h3>
                  <p className="text-sm text-gray-400">{movie.year} • {movie.duration} min • {movie.genres.slice(0, 3).join(', ')}</p>
                </div>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto">
                {/* AI Reason */}
                {selectedEntry.aiReason && (
                  <div>
                    <p className="text-sm text-gray-400 italic">"{selectedEntry.aiReason}"</p>
                  </div>
                )}

                {/* Your Rating */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                  <div>
                    <h4 className="text-sm text-gray-400 mb-2">Your Rating</h4>
                    <StarRating
                      rating={getRating(selectedEntry.movieId)?.rating || 0}
                      onRate={(rating) => setRating(selectedEntry.movieId, rating)}
                    />
                  </div>
                  {getRating(selectedEntry.movieId) && (
                    <div className="text-sm text-gray-400">
                      Watched {new Date(getRating(selectedEntry.movieId)!.watchedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* Generate Pairings Button (when no pairings exist) */}
                {!selectedEntry.drinks?.length && !selectedEntry.drink && !selectedEntry.food && (
                  <button
                    onClick={() => generateEntryPairings(selectedEntry)}
                    disabled={generatingPairings}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-primary-600/20 to-purple-600/20 hover:from-primary-600/30 hover:to-purple-600/30 border border-primary-500/30 text-primary-400 hover:text-primary-300 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {generatingPairings ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Generating pairings...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        Generate Drink & Food Pairings
                      </>
                    )}
                  </button>
                )}

                {/* Drink Options */}
                {(selectedEntry.drinks?.length || selectedEntry.drink) && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Wine size={18} className="text-purple-400" />
                        Drink Pairings
                      </h4>
                      <button
                        onClick={() => generateEntryPairings(selectedEntry)}
                        disabled={generatingPairings}
                        className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                      >
                        {generatingPairings ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <RefreshCw size={12} />
                        )}
                        Regenerate
                      </button>
                    </div>
                    <div className="grid gap-3">
                      {(selectedEntry.drinks || [selectedEntry.drink]).filter(Boolean).map((drink, i) => (
                        <div key={i} className={`p-3 rounded-lg ${
                          drink!.type === 'cocktail' ? 'bg-purple-500/10 border border-purple-500/20' :
                          drink!.type === 'wine-beer' ? 'bg-red-500/10 border border-red-500/20' :
                          'bg-blue-500/10 border border-blue-500/20'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">
                              {drink!.type === 'cocktail' ? '🍸' : drink!.type === 'wine-beer' ? '🍷' : '🧃'}
                            </span>
                            <span className="font-medium">{drink!.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              drink!.type === 'cocktail' ? 'bg-purple-500/20 text-purple-300' :
                              drink!.type === 'wine-beer' ? 'bg-red-500/20 text-red-300' :
                              'bg-blue-500/20 text-blue-300'
                            }`}>
                              {drink!.type === 'cocktail' ? 'Cocktail' : drink!.type === 'wine-beer' ? 'Wine/Beer' : 'Mocktail'}
                            </span>
                          </div>
                          {drink!.description && (
                            <p className="text-sm text-gray-300">{drink!.description}</p>
                          )}
                          {drink!.ingredients && drink!.ingredients.length > 0 && (
                            <p className="text-xs text-gray-400 mt-1">
                              {drink!.ingredients.join(' • ')}
                            </p>
                          )}
                          {drink!.instructions && (
                            <p className="text-xs text-gray-400 mt-1 italic">{drink!.instructions}</p>
                          )}
                          {drink!.vibe && (
                            <p className="text-xs text-purple-400 mt-1">✨ {drink!.vibe}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Food Pairing */}
                {selectedEntry.food && (
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <UtensilsCrossed size={18} className="text-orange-400" />
                      {selectedEntry.food.name}
                    </h4>
                    <p className="text-sm text-gray-300">{selectedEntry.food.description}</p>
                    {selectedEntry.food.difficulty && (
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        selectedEntry.food.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                        selectedEntry.food.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {selectedEntry.food.difficulty}
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-white/10">
                  <button
                    onClick={() => {
                      setPickerDate(selectedEntry.date);
                      setReplaceMovieId(selectedEntry.movieId);
                      setSelectedEntry(null);
                      setShowMoviePicker(true);
                    }}
                    className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors"
                  >
                    Replace Movie
                  </button>
                  <button
                    onClick={() => {
                      removeMovieFromMarathon(marathon!.id, selectedEntry.movieId);
                      setSelectedEntry(null);
                    }}
                    className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// Create Marathon Modal Component
function CreateMarathonModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, holiday: Holiday, startDate: string, endDate: string) => void;
}) {
  const [name, setName] = useState('');
  const [holiday, setHoliday] = useState<Holiday>('christmas');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Set default dates based on holiday
  const setDefaultDates = (h: Holiday) => {
    const year = new Date().getFullYear();
    switch (h) {
      case 'christmas':
        setStartDate(`${year}-12-13`);
        setEndDate(`${year + 1}-01-06`);
        setName('Christmas Movie Marathon');
        break;
      case 'halloween':
        setStartDate(`${year}-10-01`);
        setEndDate(`${year}-10-31`);
        setName('Halloween Horror Fest');
        break;
      case 'thanksgiving':
        // Fourth Thursday of November
        setStartDate(`${year}-11-20`);
        setEndDate(`${year}-11-28`);
        setName('Thanksgiving Watch Party');
        break;
      case 'valentines':
        setStartDate(`${year}-02-07`);
        setEndDate(`${year}-02-14`);
        setName("Valentine's Movie Week");
        break;
      case 'summer':
        setStartDate(`${year}-06-01`);
        setEndDate(`${year}-08-31`);
        setName('Summer Blockbusters');
        break;
      default:
        setName('Custom Marathon');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md glass-dark rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="font-semibold">Create Marathon</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Holiday Type */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Holiday</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(HOLIDAY_LABELS) as Holiday[]).map(h => (
                <button
                  key={h}
                  onClick={() => {
                    setHoliday(h);
                    setDefaultDates(h);
                  }}
                  className={`p-3 rounded-lg text-center transition-colors ${
                    holiday === h
                      ? 'bg-primary-600 text-white'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="text-2xl mb-1">{HOLIDAY_ICONS[h]}</div>
                  <div className="text-xs">{HOLIDAY_LABELS[h]}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Marathon Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Movie Marathon"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-primary-500"
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <button
            onClick={() => {
              if (name && startDate && endDate) {
                onCreate(name, holiday, startDate, endDate);
              }
            }}
            disabled={!name || !startDate || !endDate}
            className="w-full py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium transition-colors"
          >
            Create Marathon
          </button>
        </div>
      </div>
    </div>
  );
}
