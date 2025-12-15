import { useState, useEffect, useCallback, useMemo } from 'react';
import type { UserRating, Movie } from '../types';

const STORAGE_KEY = 'movie-night-ratings';

// Helper to sync with server
async function fetchRatingsFromServer(): Promise<UserRating[]> {
  try {
    const response = await fetch('/api/data/ratings');
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch ratings from server:', error);
  }
  return [];
}

async function saveRatingToServer(rating: UserRating): Promise<void> {
  try {
    await fetch('/api/data/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rating),
    });
  } catch (error) {
    console.error('Failed to save rating to server:', error);
  }
}

async function syncRatingToPlex(movieId: string, rating: number, headers: Record<string, string>): Promise<void> {
  try {
    const response = await fetch(`/api/rate/${movieId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ rating }),
    });
    if (!response.ok) {
      console.error('[Ratings] Failed to sync rating to Plex:', response.status);
    }
  } catch (error) {
    console.error('[Ratings] Failed to sync rating to Plex:', error);
  }
}

async function deleteRatingFromServer(movieId: string): Promise<void> {
  try {
    await fetch(`/api/data/ratings/${movieId}`, { method: 'DELETE' });
  } catch (error) {
    console.error('Failed to delete rating from server:', error);
  }
}

export function useRatings() {
  const [ratings, setRatings] = useState<UserRating[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load from server first, fall back to localStorage
  useEffect(() => {
    async function loadRatings() {
      // Try server first
      const serverRatings = await fetchRatingsFromServer();
      if (serverRatings.length > 0) {
        setRatings(serverRatings);
        // Update localStorage cache
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serverRatings));
      } else {
        // Fall back to localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const localRatings = JSON.parse(stored);
            setRatings(localRatings);
            // Sync local ratings to server
            for (const rating of localRatings) {
              await saveRatingToServer(rating);
            }
          } catch {
            console.error('Failed to parse stored ratings');
          }
        }
      }
      setLoaded(true);
    }
    loadRatings();
  }, []);

  // Save to localStorage as cache whenever ratings change
  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ratings));
    }
  }, [ratings, loaded]);

  const setRating = useCallback((
    movieId: string,
    rating: number,
    notes?: string,
    plexHeaders?: Record<string, string>
  ) => {
    const newRating: UserRating = {
      movieId,
      rating,
      notes,
      watchedAt: Date.now(),
    };

    setRatings(prev => {
      const existing = prev.findIndex(r => r.movieId === movieId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newRating;
        return updated;
      }
      return [...prev, newRating];
    });

    // Sync to server
    saveRatingToServer(newRating);

    // Also sync to Plex if headers provided
    if (plexHeaders) {
      syncRatingToPlex(movieId, rating, plexHeaders);
    }
  }, []);

  const removeRating = useCallback((movieId: string) => {
    setRatings(prev => prev.filter(r => r.movieId !== movieId));
    // Sync to server
    deleteRatingFromServer(movieId);
  }, []);

  // Sync ratings from Plex (imports new and updates changed ratings)
  const syncPlexRatings = useCallback((movies: Movie[]) => {
    const moviesWithPlexRatings = movies.filter(m => m.userRating && m.userRating > 0);
    let imported = 0;
    let updated = 0;

    setRatings(prev => {
      const existingMap = new Map(prev.map(r => [r.movieId, r]));
      const newRatings: UserRating[] = [];
      const updatedRatings: UserRating[] = [];

      for (const movie of moviesWithPlexRatings) {
        if (!movie.userRating) continue;

        const existing = existingMap.get(movie.id);

        if (!existing) {
          // New rating from Plex
          const newRating: UserRating = {
            movieId: movie.id,
            rating: movie.userRating,
            watchedAt: movie.lastViewedAt ? movie.lastViewedAt * 1000 : Date.now(),
          };
          newRatings.push(newRating);
          saveRatingToServer(newRating);
          imported++;
        } else if (existing.rating !== movie.userRating) {
          // Rating changed in Plex - update it
          const updatedRating: UserRating = {
            ...existing,
            rating: movie.userRating,
            watchedAt: Date.now(),
          };
          updatedRatings.push(updatedRating);
          saveRatingToServer(updatedRating);
          updated++;
        }
      }

      if (newRatings.length > 0 || updatedRatings.length > 0) {
        if (imported > 0) console.log(`[Ratings] Imported ${imported} ratings from Plex`);
        if (updated > 0) console.log(`[Ratings] Updated ${updated} ratings from Plex`);

        // Merge: keep existing, update changed, add new
        const result = prev.map(r => {
          const upd = updatedRatings.find(u => u.movieId === r.movieId);
          return upd || r;
        });
        return [...result, ...newRatings];
      }
      return prev;
    });

    return { imported, updated };
  }, []);

  const getRating = useCallback((movieId: string): UserRating | undefined => {
    return ratings.find(r => r.movieId === movieId);
  }, [ratings]);

  const hasRating = useCallback((movieId: string): boolean => {
    return ratings.some(r => r.movieId === movieId);
  }, [ratings]);

  // Get average user rating
  const averageRating = useMemo(() => {
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return sum / ratings.length;
  }, [ratings]);

  // Get recently watched (sorted by date)
  const recentlyWatched = useMemo(() => {
    return [...ratings].sort((a, b) => b.watchedAt - a.watchedAt);
  }, [ratings]);

  // Get favorite movies (4+ stars)
  const favorites = useMemo(() => {
    return ratings.filter(r => r.rating >= 4).sort((a, b) => b.rating - a.rating);
  }, [ratings]);

  return {
    ratings,
    setRating,
    removeRating,
    getRating,
    hasRating,
    averageRating,
    recentlyWatched,
    favorites,
    syncPlexRatings,
  };
}

// Recommendation engine based on user ratings
export function useRecommendations(movies: Movie[], ratings: UserRating[]) {
  return useMemo(() => {
    if (ratings.length < 3) {
      // Not enough data, return random selection
      return {
        recommendations: movies.slice(0, 10),
        reason: 'Rate more movies to get personalized recommendations',
      };
    }

    // Analyze user preferences from high-rated movies
    const highRatedIds = new Set(
      ratings.filter(r => r.rating >= 4).map(r => r.movieId)
    );
    const ratedIds = new Set(ratings.map(r => r.movieId));

    const highRatedMovies = movies.filter(m => highRatedIds.has(m.id));

    // Count genre preferences
    const genreScores = new Map<string, number>();
    highRatedMovies.forEach(movie => {
      const rating = ratings.find(r => r.movieId === movie.id);
      const weight = rating ? rating.rating : 3;
      movie.genres.forEach(genre => {
        genreScores.set(genre, (genreScores.get(genre) || 0) + weight);
      });
    });

    // Find favorite genres
    const topGenres = [...genreScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre);

    // Score unwatched movies based on genre match
    const unwatchedMovies = movies.filter(m => !ratedIds.has(m.id));
    const scoredMovies = unwatchedMovies.map(movie => {
      let score = 0;

      // Genre matching
      movie.genres.forEach(genre => {
        const genreScore = genreScores.get(genre) || 0;
        score += genreScore;
      });

      // Boost movies with good critic ratings
      if (movie.rating > 7) score += 2;
      if (movie.audienceRating > 7) score += 2;

      // Slight boost for newer movies
      const yearBoost = Math.max(0, (movie.year - 2000) / 10);
      score += yearBoost;

      return { movie, score };
    });

    // Sort by score and return top recommendations
    const recommendations = scoredMovies
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(s => s.movie);

    return {
      recommendations,
      reason: topGenres.length > 0
        ? `Based on your love for ${topGenres.join(', ')}`
        : 'Based on your ratings',
      topGenres,
    };
  }, [movies, ratings]);
}
