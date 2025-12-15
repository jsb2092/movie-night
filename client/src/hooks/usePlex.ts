import { useQuery } from '@tanstack/react-query';
import type { Movie } from '../types';

interface UsePlexOptions {
  headers?: Record<string, string>;
  enabled?: boolean;
}

async function fetchMovies(headers: Record<string, string> = {}): Promise<Movie[]> {
  console.log('[usePlex] fetchMovies called with headers:', headers);
  const response = await fetch('/api/movies', { headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch movies' }));
    throw new Error(error.message || 'Failed to fetch movies');
  }
  return response.json();
}

export function usePlex(options: UsePlexOptions = {}) {
  const { headers = {}, enabled = true } = options;
  console.log('[usePlex] hook called with options:', { headers, enabled });

  return useQuery({
    queryKey: ['movies', headers['X-Plex-Url'] || 'default'],
    queryFn: () => fetchMovies(headers),
    enabled,
  });
}

export async function refreshMovies(headers: Record<string, string> = {}): Promise<Movie[]> {
  const response = await fetch('/api/movies?refresh=true', { headers });
  if (!response.ok) {
    throw new Error('Failed to refresh movies');
  }
  return response.json();
}
