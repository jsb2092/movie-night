import { Router } from 'express';
import { getPlexConfig, isPlexConfigured, getMovies, fetchImage, setPlexRating, PlexMovie } from '../services/plexService.js';
import { getImage, setImage, getCacheStats } from '../services/imageCache.js';

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

    const cacheKey = `${type}-${id}`;

    // Check cache (memory + disk)
    const cached = await getImage(cacheKey);
    if (cached) {
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(cached.buffer);
    }

    const imageType = type === 'art' ? 'art' : 'thumb';
    const { buffer, contentType } = await fetchImage(config, id, imageType);

    // Store in cache (memory + disk)
    await setImage(cacheKey, { buffer, contentType });

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
  const imageStats = getCacheStats();

  res.json({
    configured: isPlexConfigured(config),
    cacheAge: cached ? Date.now() - cached.timestamp : null,
    movieCount: cached?.movies.length || 0,
    imageCache: imageStats,
  });
});

// Set rating on Plex
plexRouter.post('/rate/:movieId', async (req, res) => {
  try {
    const { movieId } = req.params;
    const { rating } = req.body;
    const config = getPlexConfig(req.headers);

    if (!isPlexConfigured(config)) {
      return res.status(503).json({ error: 'Plex not configured' });
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be a number between 1 and 5' });
    }

    await setPlexRating(config, movieId, rating);
    res.json({ success: true, movieId, rating });
  } catch (error) {
    console.error('Error setting Plex rating:', error);
    res.status(500).json({
      error: 'Failed to set rating',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
