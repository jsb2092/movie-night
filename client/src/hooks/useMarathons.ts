import { useState, useEffect, useCallback, useRef } from 'react';
import type { Marathon, MarathonEntry, Holiday } from '../types';

const STORAGE_KEY = 'movie-night-marathons';

// Helper to sync with server
async function fetchMarathonsFromServer(): Promise<Marathon[]> {
  try {
    const response = await fetch('/api/data/marathons');
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch marathons from server:', error);
  }
  return [];
}

async function saveMarathonToServer(marathon: Marathon): Promise<void> {
  try {
    await fetch('/api/data/marathons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(marathon),
    });
  } catch (error) {
    console.error('Failed to save marathon to server:', error);
  }
}

async function deleteMarathonFromServer(id: string): Promise<void> {
  try {
    await fetch(`/api/data/marathons/${id}`, { method: 'DELETE' });
  } catch (error) {
    console.error('Failed to delete marathon from server:', error);
  }
}

// Load initial state from localStorage
function loadMarathonsFromCache(): Marathon[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    console.error('Failed to parse stored marathons');
  }
  return [];
}

export function useMarathons() {
  const [marathons, setMarathons] = useState<Marathon[]>(loadMarathonsFromCache);
  const [loaded, setLoaded] = useState(false);
  const syncInProgress = useRef(false);

  // Load from server on mount
  useEffect(() => {
    async function loadMarathons() {
      if (syncInProgress.current) return;
      syncInProgress.current = true;

      const serverMarathons = await fetchMarathonsFromServer();
      if (serverMarathons.length > 0) {
        setMarathons(serverMarathons);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serverMarathons));
      } else {
        // If server is empty but we have local data, sync to server
        const localMarathons = loadMarathonsFromCache();
        if (localMarathons.length > 0) {
          for (const marathon of localMarathons) {
            await saveMarathonToServer(marathon);
          }
        }
      }
      setLoaded(true);
      syncInProgress.current = false;
    }
    loadMarathons();
  }, []);

  // Save to localStorage as cache whenever marathons change
  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(marathons));
    }
  }, [marathons, loaded]);

  const createMarathon = useCallback((
    name: string,
    holiday: Holiday,
    startDate: string,
    endDate: string
  ): Marathon => {
    const marathon: Marathon = {
      id: `marathon-${Date.now()}`,
      name,
      holiday,
      startDate,
      endDate,
      entries: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setMarathons(prev => [...prev, marathon]);
    saveMarathonToServer(marathon);
    return marathon;
  }, []);

  const updateMarathon = useCallback((id: string, updates: Partial<Omit<Marathon, 'id' | 'createdAt'>>) => {
    setMarathons(prev => {
      const updated = prev.map(m =>
        m.id === id
          ? { ...m, ...updates, updatedAt: Date.now() }
          : m
      );
      // Sync updated marathon to server
      const updatedMarathon = updated.find(m => m.id === id);
      if (updatedMarathon) {
        saveMarathonToServer(updatedMarathon);
      }
      return updated;
    });
  }, []);

  const deleteMarathon = useCallback((id: string) => {
    setMarathons(prev => prev.filter(m => m.id !== id));
    deleteMarathonFromServer(id);
  }, []);

  const addMovieToMarathon = useCallback((
    marathonId: string,
    movieId: string,
    date: string,
    phase?: string
  ) => {
    setMarathons(prev => {
      const updated = prev.map(m =>
        m.id === marathonId
          ? {
              ...m,
              entries: [...m.entries, { movieId, date, phase }],
              updatedAt: Date.now(),
            }
          : m
      );
      const updatedMarathon = updated.find(m => m.id === marathonId);
      if (updatedMarathon) {
        saveMarathonToServer(updatedMarathon);
      }
      return updated;
    });
  }, []);

  const removeMovieFromMarathon = useCallback((marathonId: string, movieId: string) => {
    setMarathons(prev => {
      const updated = prev.map(m =>
        m.id === marathonId
          ? {
              ...m,
              entries: m.entries.filter(e => e.movieId !== movieId),
              updatedAt: Date.now(),
            }
          : m
      );
      const updatedMarathon = updated.find(m => m.id === marathonId);
      if (updatedMarathon) {
        saveMarathonToServer(updatedMarathon);
      }
      return updated;
    });
  }, []);

  const updateEntry = useCallback((
    marathonId: string,
    movieId: string,
    updates: Partial<MarathonEntry>
  ) => {
    setMarathons(prev => {
      const updated = prev.map(m =>
        m.id === marathonId
          ? {
              ...m,
              entries: m.entries.map(e =>
                e.movieId === movieId ? { ...e, ...updates } : e
              ),
              updatedAt: Date.now(),
            }
          : m
      );
      const updatedMarathon = updated.find(m => m.id === marathonId);
      if (updatedMarathon) {
        saveMarathonToServer(updatedMarathon);
      }
      return updated;
    });
  }, []);

  const getActiveMarathon = useCallback((): Marathon | null => {
    const today = new Date().toISOString().split('T')[0];
    return marathons.find(m => m.startDate <= today && m.endDate >= today) || null;
  }, [marathons]);

  const getUpcomingEntry = useCallback((marathonId: string): MarathonEntry | null => {
    const marathon = marathons.find(m => m.id === marathonId);
    if (!marathon) return null;

    const today = new Date().toISOString().split('T')[0];
    const upcoming = marathon.entries
      .filter(e => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));

    return upcoming[0] || null;
  }, [marathons]);

  // Save a complete marathon (e.g., from AI generation)
  const saveMarathon = useCallback((marathon: Marathon) => {
    setMarathons(prev => {
      // Replace if exists, otherwise add
      const exists = prev.some(m => m.id === marathon.id);
      if (exists) {
        return prev.map(m => m.id === marathon.id ? marathon : m);
      }
      return [...prev, marathon];
    });
    // Sync to server
    saveMarathonToServer(marathon);
  }, []);

  return {
    marathons,
    createMarathon,
    updateMarathon,
    deleteMarathon,
    addMovieToMarathon,
    removeMovieFromMarathon,
    updateEntry,
    getActiveMarathon,
    getUpcomingEntry,
    saveMarathon,
  };
}
