import { useState, useEffect, useCallback, useRef } from 'react';
import type { Marathon, MarathonEntry, Holiday } from '../types';

// Sync status types
export type SyncStatus = 'synced' | 'syncing' | 'error' | 'loading';

export interface SyncState {
  status: SyncStatus;
  lastSynced: number | null;
  errorMessage: string | null;
}

// API helpers
async function fetchMarathonsFromServer(): Promise<{ marathons: Marathon[]; ok: boolean; error?: string }> {
  try {
    const response = await fetch('/api/data/marathons');
    if (response.ok) {
      return { marathons: await response.json(), ok: true };
    }
    return { marathons: [], ok: false, error: `Server error: ${response.status}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error';
    console.error('Failed to fetch marathons from server:', error);
    return { marathons: [], ok: false, error: message };
  }
}

async function saveMarathonToServer(marathon: Marathon): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch('/api/data/marathons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(marathon),
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return { ok: false, error: `Server error: ${response.status} - ${errorText}` };
    }
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error';
    console.error('Failed to save marathon to server:', error);
    return { ok: false, error: message };
  }
}

async function deleteMarathonFromServer(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/data/marathons/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      return { ok: false, error: `Server error: ${response.status}` };
    }
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error';
    console.error('Failed to delete marathon from server:', error);
    return { ok: false, error: message };
  }
}

// Legacy localStorage key - for migration only
const LEGACY_STORAGE_KEY = 'movie-night-marathons';

// Load from legacy localStorage (for migration)
function loadLegacyMarathons(): Marathon[] {
  try {
    const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    console.error('Failed to parse legacy localStorage marathons');
  }
  return [];
}

export function useMarathons() {
  const [marathons, setMarathons] = useState<Marathon[]>([]);
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'loading',
    lastSynced: null,
    errorMessage: null,
  });
  const loadInProgress = useRef(false);

  // Load from server on mount, migrate localStorage if needed
  useEffect(() => {
    async function loadMarathons() {
      if (loadInProgress.current) return;
      loadInProgress.current = true;

      const { marathons: serverMarathons, ok, error } = await fetchMarathonsFromServer();

      if (!ok) {
        setSyncState({
          status: 'error',
          lastSynced: null,
          errorMessage: error || 'Failed to load marathons',
        });
        loadInProgress.current = false;
        return;
      }

      // Check for legacy localStorage data that needs migration
      const legacyMarathons = loadLegacyMarathons();
      if (legacyMarathons.length > 0) {
        console.log(`[Marathons] Found ${legacyMarathons.length} marathon(s) in localStorage`);

        // Find marathons in localStorage that aren't on server (by ID)
        const serverIds = new Set(serverMarathons.map(m => m.id));
        const toMigrate = legacyMarathons.filter(m => !serverIds.has(m.id));

        // Also check for marathons that exist on both but localStorage is newer
        const toUpdate = legacyMarathons.filter(m => {
          const serverVersion = serverMarathons.find(s => s.id === m.id);
          return serverVersion && m.updatedAt > serverVersion.updatedAt;
        });

        const needsMigration = [...toMigrate, ...toUpdate];

        if (needsMigration.length > 0) {
          console.log(`[Marathons] Migrating ${needsMigration.length} marathon(s) to database...`);

          // Migrate new and updated marathons to server
          let migrationErrors = 0;
          for (const marathon of needsMigration) {
            const result = await saveMarathonToServer(marathon);
            if (!result.ok) {
              console.error(`Failed to migrate marathon "${marathon.name}":`, result.error);
              migrationErrors++;
            } else {
              console.log(`[Marathons] Migrated "${marathon.name}" to database`);
            }
          }

          if (migrationErrors > 0) {
            // Partial migration - use merged data, keep localStorage
            const merged = new Map<string, Marathon>();
            for (const m of serverMarathons) merged.set(m.id, m);
            for (const m of legacyMarathons) {
              const existing = merged.get(m.id);
              if (!existing || m.updatedAt > existing.updatedAt) {
                merged.set(m.id, m);
              }
            }
            setMarathons(Array.from(merged.values()).sort((a, b) => b.createdAt - a.createdAt));

            setSyncState({
              status: 'error',
              lastSynced: Date.now(),
              errorMessage: `Failed to migrate ${migrationErrors} marathon(s) from localStorage`,
            });
            loadInProgress.current = false;
            return;
          }

          // Re-fetch from server to get the migrated data
          const { marathons: updatedMarathons } = await fetchMarathonsFromServer();
          setMarathons(updatedMarathons);
        } else {
          // All localStorage data already exists on server
          console.log('[Marathons] All localStorage data already in database');
          setMarathons(serverMarathons);
        }

        // Clear localStorage since everything is now on server
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        console.log('[Marathons] Cleared localStorage');
      } else {
        setMarathons(serverMarathons);
      }

      setSyncState({
        status: 'synced',
        lastSynced: Date.now(),
        errorMessage: null,
      });

      loadInProgress.current = false;
    }
    loadMarathons();
  }, []);

  // Helper to sync a marathon and update status
  const syncMarathon = useCallback(async (marathon: Marathon) => {
    setSyncState(prev => ({ ...prev, status: 'syncing' }));
    const result = await saveMarathonToServer(marathon);
    if (result.ok) {
      setSyncState({
        status: 'synced',
        lastSynced: Date.now(),
        errorMessage: null,
      });
    } else {
      setSyncState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: result.error || 'Failed to save marathon',
      }));
    }
    return result;
  }, []);

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
    syncMarathon(marathon);
    return marathon;
  }, [syncMarathon]);

  const updateMarathon = useCallback((id: string, updates: Partial<Omit<Marathon, 'id' | 'createdAt'>>) => {
    let updatedMarathon: Marathon | undefined;
    setMarathons(prev => {
      const updated = prev.map(m =>
        m.id === id
          ? { ...m, ...updates, updatedAt: Date.now() }
          : m
      );
      updatedMarathon = updated.find(m => m.id === id);
      return updated;
    });
    if (updatedMarathon) {
      syncMarathon(updatedMarathon);
    }
  }, [syncMarathon]);

  const deleteMarathon = useCallback(async (id: string) => {
    setMarathons(prev => prev.filter(m => m.id !== id));
    setSyncState(prev => ({ ...prev, status: 'syncing' }));
    const result = await deleteMarathonFromServer(id);
    if (result.ok) {
      setSyncState(prev => ({
        ...prev,
        status: 'synced',
        lastSynced: Date.now(),
        errorMessage: null,
      }));
    } else {
      setSyncState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: result.error || 'Failed to delete marathon',
      }));
    }
  }, []);

  const addMovieToMarathon = useCallback((
    marathonId: string,
    movieId: string,
    date: string,
    phase?: string
  ) => {
    let updatedMarathon: Marathon | undefined;
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
      updatedMarathon = updated.find(m => m.id === marathonId);
      return updated;
    });
    if (updatedMarathon) {
      syncMarathon(updatedMarathon);
    }
  }, [syncMarathon]);

  const removeMovieFromMarathon = useCallback((marathonId: string, movieId: string) => {
    let updatedMarathon: Marathon | undefined;
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
      updatedMarathon = updated.find(m => m.id === marathonId);
      return updated;
    });
    if (updatedMarathon) {
      syncMarathon(updatedMarathon);
    }
  }, [syncMarathon]);

  const updateEntry = useCallback((
    marathonId: string,
    movieId: string,
    updates: Partial<MarathonEntry>
  ) => {
    let updatedMarathon: Marathon | undefined;
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
      updatedMarathon = updated.find(m => m.id === marathonId);
      return updated;
    });
    if (updatedMarathon) {
      syncMarathon(updatedMarathon);
    }
  }, [syncMarathon]);

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
    syncMarathon(marathon);
  }, [syncMarathon]);

  // Manual retry - reload from server
  const retrySync = useCallback(async () => {
    setSyncState({ status: 'loading', lastSynced: null, errorMessage: null });
    const { marathons: serverMarathons, ok, error } = await fetchMarathonsFromServer();
    if (ok) {
      setMarathons(serverMarathons);
      setSyncState({
        status: 'synced',
        lastSynced: Date.now(),
        errorMessage: null,
      });
    } else {
      setSyncState({
        status: 'error',
        lastSynced: null,
        errorMessage: error || 'Failed to load marathons',
      });
    }
  }, []);

  return {
    marathons,
    syncState,
    createMarathon,
    updateMarathon,
    deleteMarathon,
    addMovieToMarathon,
    removeMovieFromMarathon,
    updateEntry,
    getActiveMarathon,
    getUpcomingEntry,
    saveMarathon,
    retrySync,
  };
}
