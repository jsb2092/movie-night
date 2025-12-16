import {
  Users,
  Heart,
  Clock,
  Film,
  Search,
  X,
  RotateCcw,
  Eye,
  EyeOff,
  ArrowUpDown,
} from 'lucide-react';
import type { Filters, Occasion, Mood, Duration, SortOption } from '../types';
import { SORT_LABELS } from '../types';

const SORT_OPTIONS: SortOption[] = [
  'title',
  'recently-added',
  'year-new',
  'year-old',
  'rating',
  'duration-short',
  'duration-long',
];

interface FilterSidebarProps {
  filters: Filters;
  updateFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  toggleGenre: (genre: string) => void;
  resetFilters: () => void;
  allGenres: string[];
  totalCount: number;
  filteredCount: number;
}

const OCCASIONS: Array<{ value: Occasion; label: string; icon: string }> = [
  { value: 'solo', label: 'Solo', icon: '🧘' },
  { value: 'date-night', label: 'Date Night', icon: '💕' },
  { value: 'friends', label: 'Friends', icon: '👯' },
  { value: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦' },
  { value: 'grandparents', label: 'Grandparents', icon: '👵' },
  { value: 'party', label: 'Party', icon: '🎉' },
];

const MOODS: Array<{ value: Mood; label: string; icon: string }> = [
  { value: 'feel-good', label: 'Feel Good', icon: '😊' },
  { value: 'intense', label: 'Intense', icon: '🔥' },
  { value: 'thought-provoking', label: 'Thoughtful', icon: '🤔' },
  { value: 'background', label: 'Background', icon: '📺' },
  { value: 'emotional', label: 'Emotional', icon: '😢' },
  { value: 'scary', label: 'Scary', icon: '😱' },
];

const DURATIONS: Array<{ value: Duration; label: string }> = [
  { value: 'quick', label: '< 90 min' },
  { value: 'standard', label: '90-120 min' },
  { value: 'epic', label: '2-3 hrs' },
  { value: 'marathon', label: '3+ hrs' },
];

export function FilterSidebar({
  filters,
  updateFilter,
  toggleGenre,
  resetFilters,
  allGenres,
  totalCount,
  filteredCount,
}: FilterSidebarProps) {
  const hasFilters =
    filters.occasion ||
    filters.mood ||
    filters.duration ||
    filters.genres.length > 0 ||
    filters.search ||
    filters.hideWatched;

  return (
    <aside className="w-72 glass rounded-2xl p-5 h-fit sticky top-4 overflow-y-auto max-h-[calc(100vh-2rem)]">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold">Filters</h2>
        {hasFilters && (
          <button
            onClick={resetFilters}
            className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <RotateCcw size={14} />
            Reset
          </button>
        )}
      </div>

      {/* Movie count and sort */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-sm text-gray-400">
          {filteredCount} of {totalCount} movies
        </span>
        <div className="relative">
          <select
            value={filters.sortBy}
            onChange={(e) => updateFilter('sortBy', e.target.value as SortOption)}
            className="appearance-none bg-white/5 border border-white/10 rounded-lg py-1.5 pl-2 pr-7 text-xs text-gray-300 focus:outline-none focus:border-primary-500 cursor-pointer"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option} value={option} className="bg-gray-900">
                {SORT_LABELS[option]}
              </option>
            ))}
          </select>
          <ArrowUpDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search movies..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-8 text-sm focus:outline-none focus:border-primary-500 transition-colors"
          />
          {filters.search && (
            <button
              onClick={() => updateFilter('search', '')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Occasion */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
          <Users size={14} />
          Who's Watching?
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {OCCASIONS.map(({ value, label, icon }) => (
            <button
              key={value}
              onClick={() =>
                updateFilter('occasion', filters.occasion === value ? null : value)
              }
              className={`px-3 py-2 rounded-lg text-sm transition-all ${
                filters.occasion === value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300'
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Mood */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
          <Heart size={14} />
          Mood
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {MOODS.map(({ value, label, icon }) => (
            <button
              key={value}
              onClick={() =>
                updateFilter('mood', filters.mood === value ? null : value)
              }
              className={`px-3 py-2 rounded-lg text-sm transition-all ${
                filters.mood === value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300'
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
          <Clock size={14} />
          Time Available
        </h3>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() =>
                updateFilter('duration', filters.duration === value ? null : value)
              }
              className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                filters.duration === value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Genres */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
          <Film size={14} />
          Genres
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {allGenres.slice(0, 15).map((genre) => (
            <button
              key={genre}
              onClick={() => toggleGenre(genre)}
              className={`px-2 py-1 rounded-md text-xs transition-all ${
                filters.genres.includes(genre)
                  ? 'bg-primary-600 text-white'
                  : 'bg-white/5 hover:bg-white/10 text-gray-400'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Hide Watched Toggle */}
      <div className="pt-4 border-t border-white/10">
        <button
          onClick={() => updateFilter('hideWatched', !filters.hideWatched)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
            filters.hideWatched
              ? 'bg-primary-600/20 text-primary-300'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          <span className="flex items-center gap-2">
            {filters.hideWatched ? <EyeOff size={14} /> : <Eye size={14} />}
            {filters.hideWatched ? 'Hiding watched' : 'Show all'}
          </span>
        </button>
      </div>

      {/* Version */}
      <div className="mt-6 pt-4 border-t border-white/10 text-center text-xs text-gray-600">
        v{__APP_VERSION__}
      </div>
    </aside>
  );
}
