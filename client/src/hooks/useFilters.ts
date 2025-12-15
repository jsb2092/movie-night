import { useState, useMemo, useCallback } from 'react';
import type { Movie, Filters, Duration } from '../types';

const initialFilters: Filters = {
  occasion: null,
  mood: null,
  duration: null,
  genres: [],
  search: '',
  hideWatched: false,
};

function getDurationCategory(minutes: number): Duration {
  if (minutes < 90) return 'quick';
  if (minutes <= 120) return 'standard';
  if (minutes <= 180) return 'epic';
  return 'marathon';
}

// Maps genres to likely moods
const GENRE_MOOD_MAP: Record<string, string[]> = {
  'Comedy': ['feel-good', 'background'],
  'Romance': ['feel-good', 'emotional', 'date-night'],
  'Horror': ['scary', 'intense'],
  'Thriller': ['intense', 'thought-provoking'],
  'Action': ['intense', 'background'],
  'Drama': ['emotional', 'thought-provoking'],
  'Documentary': ['thought-provoking'],
  'Animation': ['feel-good', 'family'],
  'Family': ['feel-good'],
  'Science Fiction': ['thought-provoking', 'intense'],
  'Fantasy': ['feel-good', 'epic'],
  'Mystery': ['thought-provoking', 'intense'],
  'Crime': ['intense', 'thought-provoking'],
  'War': ['intense', 'emotional'],
  'History': ['thought-provoking'],
  'Music': ['feel-good', 'emotional'],
  'Adventure': ['feel-good', 'intense'],
};

// Content rating suitability
const FAMILY_SAFE_RATINGS = ['G', 'PG', 'TV-G', 'TV-PG', 'TV-Y', 'TV-Y7'];
const GRANDPARENT_SAFE_RATINGS = ['G', 'PG', 'PG-13', 'TV-G', 'TV-PG', 'TV-14'];

export function useFilters(movies: Movie[]) {
  const [filters, setFilters] = useState<Filters>(initialFilters);

  const updateFilter = useCallback(<K extends keyof Filters>(
    key: K,
    value: Filters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleGenre = useCallback((genre: string) => {
    setFilters(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre],
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  const allGenres = useMemo(() => {
    const genreSet = new Set<string>();
    movies.forEach(m => m.genres.forEach(g => genreSet.add(g)));
    return Array.from(genreSet).sort();
  }, [movies]);

  const filteredMovies = useMemo(() => {
    return movies.filter(movie => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          movie.title.toLowerCase().includes(searchLower) ||
          movie.directors.some(d => d.toLowerCase().includes(searchLower)) ||
          movie.actors.some(a => a.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Genre filter
      if (filters.genres.length > 0) {
        const hasGenre = filters.genres.some(g => movie.genres.includes(g));
        if (!hasGenre) return false;
      }

      // Duration filter
      if (filters.duration) {
        const movieDuration = getDurationCategory(movie.duration);
        if (movieDuration !== filters.duration) return false;
      }

      // Hide watched filter
      if (filters.hideWatched && movie.viewCount && movie.viewCount > 0) {
        return false;
      }

      // Occasion-based filtering
      if (filters.occasion) {
        switch (filters.occasion) {
          case 'family':
            if (!FAMILY_SAFE_RATINGS.includes(movie.contentRating)) return false;
            break;
          case 'grandparents':
            if (!GRANDPARENT_SAFE_RATINGS.includes(movie.contentRating)) return false;
            break;
          case 'party':
            // Party movies should be fun, not heavy dramas
            if (movie.genres.includes('Drama') && !movie.genres.includes('Comedy')) {
              if (movie.duration > 120) return false;
            }
            // No documentaries at parties
            if (movie.genres.includes('Documentary')) return false;
            break;
          case 'date-night':
            // Avoid kids movies
            if (movie.genres.includes('Animation') && movie.genres.includes('Family')) {
              return false;
            }
            // Prefer romantic, dramatic, or thriller content
            const dateGenres = ['Romance', 'Drama', 'Thriller', 'Comedy', 'Mystery'];
            if (!movie.genres.some(g => dateGenres.includes(g))) return false;
            break;
          case 'solo':
            // Solo viewing: deeper content, longer movies OK
            // Filter out very light kids content
            if (FAMILY_SAFE_RATINGS.includes(movie.contentRating) &&
                movie.genres.includes('Animation') &&
                movie.genres.includes('Family') &&
                !movie.genres.includes('Comedy')) {
              return false;
            }
            break;
          case 'friends':
            // Friends: fun, engaging content - comedies, action, horror, adventure
            const friendsGenres = ['Comedy', 'Action', 'Horror', 'Adventure', 'Thriller', 'Science Fiction'];
            if (!movie.genres.some(g => friendsGenres.includes(g))) {
              // Allow if it's not too long and heavy
              if (movie.duration > 150 && movie.genres.includes('Drama')) return false;
            }
            // No documentaries with friends (usually)
            if (movie.genres.includes('Documentary') && movie.genres.length === 1) return false;
            break;
        }
      }

      // Mood-based filtering
      if (filters.mood) {
        const movieMoods = movie.genres.flatMap(g => GENRE_MOOD_MAP[g] || []);
        const uniqueMoods = [...new Set(movieMoods)];

        // Check if movie matches the mood
        const moodMatches = uniqueMoods.includes(filters.mood);

        // Special handling for some moods
        if (filters.mood === 'scary' && !movie.genres.includes('Horror')) {
          return false;
        }
        if (filters.mood === 'background') {
          // Background movies should be lighter fare, not too long
          if (movie.duration > 120 && !movie.genres.includes('Comedy')) return false;
        }

        // If we have genre-mood data and it doesn't match, filter out
        if (uniqueMoods.length > 0 && !moodMatches) {
          return false;
        }
      }

      return true;
    });
  }, [movies, filters]);

  return {
    filters,
    updateFilter,
    toggleGenre,
    resetFilters,
    filteredMovies,
    allGenres,
    totalCount: movies.length,
    filteredCount: filteredMovies.length,
  };
}
