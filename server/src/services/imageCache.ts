import path from 'path';
import fs from 'fs';

// Determine data directory - use DATA_DIR env var or default to ./data
const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const imageCacheDir = path.join(dataDir, 'images');

// Ensure image cache directory exists
if (!fs.existsSync(imageCacheDir)) {
  fs.mkdirSync(imageCacheDir, { recursive: true });
  console.log(`[ImageCache] Created cache directory: ${imageCacheDir}`);
}

interface CachedImage {
  buffer: Buffer;
  contentType: string;
}

// In-memory cache for fast access (limited size, short TTL)
const memoryCache = new Map<string, { data: CachedImage; timestamp: number }>();
const MEMORY_CACHE_TTL = 60 * 60 * 1000; // 1 hour
const MAX_MEMORY_CACHE_SIZE = 200;

function getCacheFilePath(cacheKey: string): string {
  // Sanitize key for filesystem
  const safeKey = cacheKey.replace(/[^a-zA-Z0-9-_]/g, '_');
  return path.join(imageCacheDir, safeKey);
}

function getMetaFilePath(cacheKey: string): string {
  return getCacheFilePath(cacheKey) + '.meta';
}

export async function getImage(cacheKey: string): Promise<CachedImage | null> {
  // Check memory cache first
  const memCached = memoryCache.get(cacheKey);
  if (memCached && Date.now() - memCached.timestamp < MEMORY_CACHE_TTL) {
    return memCached.data;
  }

  // Check disk cache
  const filePath = getCacheFilePath(cacheKey);
  const metaPath = getMetaFilePath(cacheKey);

  if (fs.existsSync(filePath) && fs.existsSync(metaPath)) {
    try {
      const buffer = fs.readFileSync(filePath);
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      const cached: CachedImage = { buffer, contentType: meta.contentType };

      // Populate memory cache
      setMemoryCache(cacheKey, cached);

      return cached;
    } catch {
      // Corrupted cache, remove it
      try {
        fs.unlinkSync(filePath);
        fs.unlinkSync(metaPath);
      } catch { /* ignore */ }
    }
  }

  return null;
}

function setMemoryCache(cacheKey: string, data: CachedImage): void {
  // Evict oldest if at capacity
  if (memoryCache.size >= MAX_MEMORY_CACHE_SIZE) {
    const oldest = [...memoryCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) memoryCache.delete(oldest[0]);
  }
  memoryCache.set(cacheKey, { data, timestamp: Date.now() });
}

export async function setImage(cacheKey: string, data: CachedImage): Promise<void> {
  // Save to disk
  const filePath = getCacheFilePath(cacheKey);
  const metaPath = getMetaFilePath(cacheKey);

  try {
    fs.writeFileSync(filePath, data.buffer);
    fs.writeFileSync(metaPath, JSON.stringify({ contentType: data.contentType }));
  } catch (error) {
    console.error(`[ImageCache] Failed to write cache for ${cacheKey}:`, error);
  }

  // Also cache in memory
  setMemoryCache(cacheKey, data);
}

export function getCacheStats(): { memorySize: number; diskSize: number } {
  let diskSize = 0;
  try {
    const files = fs.readdirSync(imageCacheDir).filter(f => !f.endsWith('.meta'));
    diskSize = files.length;
  } catch { /* ignore */ }

  return {
    memorySize: memoryCache.size,
    diskSize,
  };
}
