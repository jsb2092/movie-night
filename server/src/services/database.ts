import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Determine data directory - use DATA_DIR env var or default to ./data
const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'movie-night.db');
console.log(`[Database] Using database at: ${dbPath}`);

const db = new Database(dbPath);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS ratings (
    movie_id TEXT PRIMARY KEY,
    rating INTEGER NOT NULL,
    notes TEXT,
    watched_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS marathons (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    holiday TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    entries TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pairings_cache (
    cache_key TEXT PRIMARY KEY,
    pairings TEXT NOT NULL,
    generated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

console.log('[Database] Tables initialized');

// Rating operations
export interface UserRating {
  movieId: string;
  rating: number;
  notes?: string;
  watchedAt: number;
}

export const ratingsDb = {
  getAll(): UserRating[] {
    const stmt = db.prepare('SELECT movie_id, rating, notes, watched_at FROM ratings');
    const rows = stmt.all() as { movie_id: string; rating: number; notes: string | null; watched_at: number }[];
    return rows.map(row => ({
      movieId: row.movie_id,
      rating: row.rating,
      notes: row.notes || undefined,
      watchedAt: row.watched_at,
    }));
  },

  get(movieId: string): UserRating | null {
    const stmt = db.prepare('SELECT movie_id, rating, notes, watched_at FROM ratings WHERE movie_id = ?');
    const row = stmt.get(movieId) as { movie_id: string; rating: number; notes: string | null; watched_at: number } | undefined;
    if (!row) return null;
    return {
      movieId: row.movie_id,
      rating: row.rating,
      notes: row.notes || undefined,
      watchedAt: row.watched_at,
    };
  },

  set(rating: UserRating): void {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO ratings (movie_id, rating, notes, watched_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(rating.movieId, rating.rating, rating.notes || null, rating.watchedAt);
  },

  delete(movieId: string): void {
    const stmt = db.prepare('DELETE FROM ratings WHERE movie_id = ?');
    stmt.run(movieId);
  },
};

// Marathon operations
export interface Marathon {
  id: string;
  name: string;
  holiday: string;
  startDate: string;
  endDate: string;
  entries: any[];
  createdAt: number;
  updatedAt: number;
}

export const marathonsDb = {
  getAll(): Marathon[] {
    const stmt = db.prepare('SELECT * FROM marathons ORDER BY created_at DESC');
    const rows = stmt.all() as any[];
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      holiday: row.holiday,
      startDate: row.start_date,
      endDate: row.end_date,
      entries: JSON.parse(row.entries),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  get(id: string): Marathon | null {
    const stmt = db.prepare('SELECT * FROM marathons WHERE id = ?');
    const row = stmt.get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      holiday: row.holiday,
      startDate: row.start_date,
      endDate: row.end_date,
      entries: JSON.parse(row.entries),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  save(marathon: Marathon): void {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO marathons (id, name, holiday, start_date, end_date, entries, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      marathon.id,
      marathon.name,
      marathon.holiday,
      marathon.startDate,
      marathon.endDate,
      JSON.stringify(marathon.entries),
      marathon.createdAt,
      marathon.updatedAt
    );
  },

  delete(id: string): void {
    const stmt = db.prepare('DELETE FROM marathons WHERE id = ?');
    stmt.run(id);
  },
};

// Pairings cache operations
export interface CachedPairings {
  cacheKey: string;
  pairings: any;
  generatedAt: number;
}

const CACHE_DURATION = 1000 * 60 * 60 * 24 * 7; // 7 days

export const pairingsDb = {
  get(cacheKey: string): any | null {
    const stmt = db.prepare('SELECT pairings, generated_at FROM pairings_cache WHERE cache_key = ?');
    const row = stmt.get(cacheKey) as { pairings: string; generated_at: number } | undefined;
    if (!row) return null;

    // Check if cache is still valid
    if (Date.now() - row.generated_at > CACHE_DURATION) {
      // Cache expired, delete it
      this.delete(cacheKey);
      return null;
    }

    return JSON.parse(row.pairings);
  },

  set(cacheKey: string, pairings: any): void {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO pairings_cache (cache_key, pairings, generated_at)
      VALUES (?, ?, ?)
    `);
    stmt.run(cacheKey, JSON.stringify(pairings), Date.now());
  },

  delete(cacheKey: string): void {
    const stmt = db.prepare('DELETE FROM pairings_cache WHERE cache_key = ?');
    stmt.run(cacheKey);
  },

  // Clean up expired cache entries
  cleanup(): number {
    const stmt = db.prepare('DELETE FROM pairings_cache WHERE generated_at < ?');
    const result = stmt.run(Date.now() - CACHE_DURATION);
    return result.changes;
  },
};

// Run cleanup on startup
const cleaned = pairingsDb.cleanup();
if (cleaned > 0) {
  console.log(`[Database] Cleaned up ${cleaned} expired cache entries`);
}

// Config operations (key-value store)
export interface AppConfig {
  plexToken?: string;
  plexServerUri?: string;
  plexServerName?: string;
  anthropicApiKey?: string;
}

export const configDb = {
  get(key: string): string | null {
    const stmt = db.prepare('SELECT value FROM config WHERE key = ?');
    const row = stmt.get(key) as { value: string } | undefined;
    return row?.value || null;
  },

  set(key: string, value: string): void {
    const stmt = db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');
    stmt.run(key, value);
  },

  delete(key: string): void {
    const stmt = db.prepare('DELETE FROM config WHERE key = ?');
    stmt.run(key);
  },

  getAll(): AppConfig {
    const stmt = db.prepare('SELECT key, value FROM config');
    const rows = stmt.all() as { key: string; value: string }[];
    const config: AppConfig = {};
    for (const row of rows) {
      (config as any)[row.key] = row.value;
    }
    return config;
  },

  setAll(config: Partial<AppConfig>): void {
    for (const [key, value] of Object.entries(config)) {
      if (value !== undefined && value !== null) {
        this.set(key, value);
      }
    }
  },

  clear(): void {
    db.prepare('DELETE FROM config').run();
  },
};

export default db;
