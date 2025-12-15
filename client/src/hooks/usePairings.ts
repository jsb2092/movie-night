import { useState, useCallback } from 'react';
import type { Movie, MoviePairings, Occasion, Mood } from '../types';

const CACHE_KEY = 'movie-pairings-cache';
const CACHE_DURATION = 1000 * 60 * 60 * 24 * 7; // 7 days

// Local cache helpers
function getLocalCache(): Record<string, MoviePairings> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

function setLocalCache(cache: Record<string, MoviePairings>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage might be full, just continue without caching
  }
}

// Server cache helpers
async function getServerCache(cacheKey: string): Promise<MoviePairings | null> {
  try {
    const response = await fetch(`/api/data/pairings-cache/${encodeURIComponent(cacheKey)}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch cached pairings from server:', error);
  }
  return null;
}

async function setServerCache(cacheKey: string, pairings: MoviePairings): Promise<void> {
  try {
    await fetch('/api/data/pairings-cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cacheKey, pairings }),
    });
  } catch (error) {
    console.error('Failed to save pairings to server cache:', error);
  }
}

export function usePairings() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check local cache without making API call (for instant UI)
  const getCachedPairings = useCallback((
    movieId: string,
    occasion?: Occasion | null,
    mood?: Mood | null
  ): MoviePairings | null => {
    const cacheKey = `${movieId}-${occasion || 'any'}-${mood || 'any'}`;
    const cache = getLocalCache();
    const cached = cache[cacheKey];
    if (cached && Date.now() - cached.generatedAt < CACHE_DURATION) {
      return cached;
    }
    return null;
  }, []);

  const getPairings = useCallback(async (
    movie: Movie,
    occasion?: Occasion | null,
    mood?: Mood | null
  ): Promise<MoviePairings | null> => {
    const cacheKey = `${movie.id}-${occasion || 'any'}-${mood || 'any'}`;
    const localCache = getLocalCache();

    // Check local cache first (fastest)
    const localCached = localCache[cacheKey];
    if (localCached && Date.now() - localCached.generatedAt < CACHE_DURATION) {
      return localCached;
    }

    // Check server cache (synced across devices)
    const serverCached = await getServerCache(cacheKey);
    if (serverCached && Date.now() - serverCached.generatedAt < CACHE_DURATION) {
      // Update local cache
      localCache[cacheKey] = serverCached;
      setLocalCache(localCache);
      return serverCached;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/pairings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movie, occasion, mood }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate pairings');
      }

      const pairings: MoviePairings = await response.json();

      // Cache locally
      localCache[cacheKey] = pairings;
      setLocalCache(localCache);

      // Cache on server (async, don't wait)
      setServerCache(cacheKey, pairings);

      return pairings;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
  }, []);

  return { getPairings, getCachedPairings, loading, error, clearCache };
}
