import { useState, useEffect } from 'react';
import { LayoutGrid, ScatterChart, Disc3, Calendar, RefreshCw, Loader2, Settings as SettingsIcon, Sparkles } from 'lucide-react';
import { usePlex, refreshMovies } from './hooks/usePlex';
import { useFilters } from './hooks/useFilters';
import { useConfig } from './hooks/useConfig';
import { useRatings } from './hooks/useRatings';
import { ImageProvider } from './contexts/ImageContext';
import { FilterSidebar } from './components/FilterSidebar';
import { MovieGrid } from './components/MovieGrid';
import { ScatterPlot } from './components/ScatterPlot';
import { RandomWheel } from './components/RandomWheel';
import { MarathonPlanner } from './components/MarathonPlanner';
import { Recommendations } from './components/Recommendations';
import { Settings } from './components/Settings';
import { MovieModal } from './components/MovieModal';
import { SurpriseMe } from './components/SurpriseMe';
import type { ViewMode, Movie } from './types';

const VIEW_OPTIONS: Array<{ value: ViewMode; label: string; icon: React.ReactNode }> = [
  { value: 'grid', label: 'Browse', icon: <LayoutGrid size={18} /> },
  { value: 'scatter', label: 'Explore', icon: <ScatterChart size={18} /> },
  { value: 'wheel', label: 'Random', icon: <Disc3 size={18} /> },
  { value: 'marathon', label: 'Marathon', icon: <Calendar size={18} /> },
];

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showSettings, setShowSettings] = useState(false);
  const [showSurpriseMe, setShowSurpriseMe] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  const { config, setConfig, clearConfig, isConfigured, getHeaders } = useConfig();
  const headers = getHeaders();

  const { data: movies = [], isLoading, error, refetch } = usePlex({
    headers,
    enabled: isConfigured,
  });

  const { syncPlexRatings } = useRatings();

  // Sync Plex ratings whenever movies data updates
  useEffect(() => {
    if (movies.length > 0) {
      syncPlexRatings(movies);
    }
  }, [movies, syncPlexRatings]);

  // Periodic background sync from Plex (every 30 seconds)
  useEffect(() => {
    if (!isConfigured || movies.length === 0) return;

    const interval = setInterval(() => {
      console.log('[Sync] Checking Plex for rating updates...');
      refetch();
    }, 30000);

    return () => clearInterval(interval);
  }, [isConfigured, movies.length, refetch]);

  const {
    filters,
    updateFilter,
    toggleGenre,
    resetFilters,
    filteredMovies,
    allGenres,
    totalCount,
    filteredCount,
  } = useFilters(movies);

  const handleRefresh = async () => {
    try {
      await refreshMovies(headers);
      refetch();
    } catch (err) {
      console.error('Failed to refresh:', err);
    }
  };

  return (
    <ImageProvider plexUrl={config.plexServerUri} plexToken={config.plexToken}>
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-dark">
        <div className="max-w-[1800px] mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎬</span>
            <div>
              <h1 className="text-xl font-bold">Movie Night</h1>
              <p className="text-xs text-gray-400">
                {isConfigured ? config.plexServerName || 'Connected' : 'Not connected'}
              </p>
            </div>
          </div>

          {/* View toggle - only show when configured */}
          {isConfigured && movies.length > 0 && (
            <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1">
              {VIEW_OPTIONS.map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => setViewMode(value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === value
                      ? 'bg-primary-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {icon}
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Right side buttons */}
          <div className="flex items-center gap-2">
            {isConfigured && config.anthropicApiKey && movies.length > 0 && (
              <button
                onClick={() => setShowSurpriseMe(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-600/20 hover:bg-primary-600/30 text-primary-300 transition-colors"
                title="Let AI pick a movie for you"
              >
                <Sparkles size={18} />
                <span className="hidden sm:inline text-sm font-medium">Surprise Me</span>
              </button>
            )}
            {isConfigured && (
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
                title="Refresh from Plex"
              >
                <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              </button>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              title="Settings"
            >
              <SettingsIcon size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[1800px] mx-auto px-4 py-6">
        {/* Not configured - show welcome */}
        {!isConfigured && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="glass rounded-2xl p-8 max-w-md text-center">
              <span className="text-6xl mb-4 block">🎬</span>
              <h2 className="text-2xl font-bold mb-2">Welcome to Movie Night</h2>
              <p className="text-gray-400 mb-6">
                Connect your Plex server to browse your movie library, get drink and snack pairings, and pick the perfect movie for any occasion.
              </p>
              <button
                onClick={() => setShowSettings(true)}
                className="px-6 py-3 bg-[#E5A00D] hover:bg-[#d4940c] text-black font-medium rounded-xl transition-colors"
              >
                Connect to Plex
              </button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isConfigured && isLoading && movies.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 size={48} className="animate-spin mb-4 text-primary-500" />
            <p className="text-lg">Loading your movie library...</p>
            <p className="text-sm">Connecting to {config.plexServerName || 'Plex'}</p>
          </div>
        )}

        {/* Error state */}
        {isConfigured && error && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="glass rounded-2xl p-8 max-w-md text-center">
              <span className="text-5xl mb-4 block">😕</span>
              <h2 className="text-xl font-semibold mb-2">Connection Issue</h2>
              <p className="text-gray-400 mb-4">
                {error instanceof Error ? error.message : 'Failed to connect to Plex'}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => refetch()}
                  className="px-4 py-2 bg-primary-600 rounded-lg font-medium hover:bg-primary-500 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-4 py-2 bg-white/10 rounded-lg font-medium hover:bg-white/20 transition-colors"
                >
                  Check Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main layout */}
        {isConfigured && !isLoading && !error && movies.length > 0 && (
          <div className="flex gap-6">
            {/* Left Sidebar - Filters (hidden in marathon mode) */}
            {viewMode !== 'marathon' && (
              <FilterSidebar
                filters={filters}
                updateFilter={updateFilter}
                toggleGenre={toggleGenre}
                resetFilters={resetFilters}
                allGenres={allGenres}
                totalCount={totalCount}
                filteredCount={filteredCount}
              />
            )}

            {/* Content area */}
            <div className="flex-1 min-w-0">
              {viewMode === 'grid' && (
                <MovieGrid
                  movies={filteredMovies}
                  occasion={filters.occasion}
                  mood={filters.mood}
                  plexHeaders={headers}
                />
              )}
              {viewMode === 'scatter' && (
                <ScatterPlot
                  movies={filteredMovies}
                  occasion={filters.occasion}
                  mood={filters.mood}
                  plexHeaders={headers}
                />
              )}
              {viewMode === 'wheel' && (
                <RandomWheel
                  movies={filteredMovies}
                  occasion={filters.occasion}
                  mood={filters.mood}
                  plexHeaders={headers}
                />
              )}
              {viewMode === 'marathon' && (
                <MarathonPlanner
                  movies={movies}
                  occasion={filters.occasion}
                  mood={filters.mood}
                  headers={headers}
                />
              )}
            </div>

            {/* Right Sidebar - Recommendations */}
            {viewMode !== 'marathon' && (
              <aside className="w-72 hidden xl:block">
                <Recommendations
                  movies={movies}
                  occasion={filters.occasion}
                  mood={filters.mood}
                  onSelectMovie={setSelectedMovie}
                  isLoading={isLoading}
                />
              </aside>
            )}
          </div>
        )}

        {/* Empty library state */}
        {isConfigured && !isLoading && !error && movies.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <span className="text-6xl mb-4">📽️</span>
            <p className="text-lg">No movies found in your Plex library</p>
            <p className="text-sm">Add some movies to Plex and refresh</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-gray-500 text-sm">
        <p>
          Powered by your Plex library
          {config.anthropicApiKey && ' • Pairings by Claude AI'}
        </p>
      </footer>

      {/* Settings modal */}
      {showSettings && (
        <Settings
          config={config}
          setConfig={setConfig}
          clearConfig={clearConfig}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Movie modal from recommendations */}
      {selectedMovie && (
        <MovieModal
          movie={selectedMovie}
          occasion={filters.occasion}
          mood={filters.mood}
          onClose={() => setSelectedMovie(null)}
          plexHeaders={headers}
        />
      )}

      {/* Surprise Me modal */}
      {showSurpriseMe && (
        <SurpriseMe
          movies={filteredMovies}
          occasion={filters.occasion}
          mood={filters.mood}
          onClose={() => setShowSurpriseMe(false)}
          plexHeaders={headers}
          apiKey={config.anthropicApiKey || undefined}
        />
      )}
    </div>
    </ImageProvider>
  );
}
