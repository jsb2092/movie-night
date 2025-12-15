import { Router } from 'express';
import { getPlexConfig, isPlexConfigured, getMovies, fetchImage, PlexMovie } from '../services/plexService.js';

export const plexRouter = Router();

// Per-user cache keyed by server URL
const movieCache = new Map<string, { movies: PlexMovie[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

plexRouter.get('/movies', async (req, res) => {
  try {
    const config = getPlexConfig(req.headers);

    if (!isPlexConfigured(config)) {
      return res.status(503).json({
        error: 'Plex not configured',
        message: 'Please configure Plex in settings or set PLEX_URL and PLEX_TOKEN in .env',
      });
    }

    const forceRefresh = req.query.refresh === 'true';
    const cacheKey = config.baseUrl;

    // Check cache
    const cached = movieCache.get(cacheKey);
    if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return res.json(cached.movies);
    }

    const movies = await getMovies(config);

    // Update cache
    movieCache.set(cacheKey, { movies, timestamp: Date.now() });

    res.json(movies);
  } catch (error) {
    console.error('Error fetching movies:', error);
    res.status(500).json({
      error: 'Failed to fetch movies',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// In-memory image cache
const imageCache = new Map<string, { buffer: Buffer; contentType: string; timestamp: number }>();
const IMAGE_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

plexRouter.get('/img/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const query = {
      url: req.query.url as string | undefined,
      token: req.query.token as string | undefined,
    };
    const config = getPlexConfig(req.headers, query);

    if (!isPlexConfigured(config)) {
      return res.status(503).send('Plex not configured');
    }

    const cacheKey = `${config.baseUrl}-${type}-${id}`;

    // Check memory cache first
    const cached = imageCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < IMAGE_CACHE_DURATION) {
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(cached.buffer);
    }

    const imageType = type === 'art' ? 'art' : 'thumb';
    const { buffer, contentType } = await fetchImage(config, id, imageType);

    // Store in cache
    imageCache.set(cacheKey, { buffer, contentType, timestamp: Date.now() });

    // Limit cache size (remove oldest if over 500 images)
    if (imageCache.size > 500) {
      const oldest = [...imageCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      if (oldest) imageCache.delete(oldest[0]);
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (error) {
    res.status(500).send('Error fetching image');
  }
});

plexRouter.get('/status', (req, res) => {
  const config = getPlexConfig(req.headers);
  const cacheKey = config.baseUrl;
  const cached = movieCache.get(cacheKey);

  res.json({
    configured: isPlexConfigured(config),
    cacheAge: cached ? Date.now() - cached.timestamp : null,
    movieCount: cached?.movies.length || 0,
  });
});
