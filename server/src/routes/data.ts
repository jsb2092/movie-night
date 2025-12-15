import { Router } from 'express';
import { ratingsDb, marathonsDb, pairingsDb, configDb } from '../services/database.js';

const router = Router();

// ============ Ratings ============

// Get all ratings
router.get('/ratings', (req, res) => {
  try {
    const ratings = ratingsDb.getAll();
    res.json(ratings);
  } catch (error) {
    console.error('Error fetching ratings:', error);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

// Get single rating
router.get('/ratings/:movieId', (req, res) => {
  try {
    const rating = ratingsDb.get(req.params.movieId);
    if (!rating) {
      return res.status(404).json({ error: 'Rating not found' });
    }
    res.json(rating);
  } catch (error) {
    console.error('Error fetching rating:', error);
    res.status(500).json({ error: 'Failed to fetch rating' });
  }
});

// Set rating
router.post('/ratings', (req, res) => {
  try {
    const { movieId, rating, notes } = req.body;
    if (!movieId || typeof rating !== 'number') {
      return res.status(400).json({ error: 'movieId and rating are required' });
    }

    const userRating = {
      movieId,
      rating,
      notes,
      watchedAt: Date.now(),
    };

    ratingsDb.set(userRating);
    res.json(userRating);
  } catch (error) {
    console.error('Error setting rating:', error);
    res.status(500).json({ error: 'Failed to set rating' });
  }
});

// Delete rating
router.delete('/ratings/:movieId', (req, res) => {
  try {
    ratingsDb.delete(req.params.movieId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting rating:', error);
    res.status(500).json({ error: 'Failed to delete rating' });
  }
});

// ============ Marathons ============

// Get all marathons
router.get('/marathons', (req, res) => {
  try {
    const marathons = marathonsDb.getAll();
    res.json(marathons);
  } catch (error) {
    console.error('Error fetching marathons:', error);
    res.status(500).json({ error: 'Failed to fetch marathons' });
  }
});

// Get single marathon
router.get('/marathons/:id', (req, res) => {
  try {
    const marathon = marathonsDb.get(req.params.id);
    if (!marathon) {
      return res.status(404).json({ error: 'Marathon not found' });
    }
    res.json(marathon);
  } catch (error) {
    console.error('Error fetching marathon:', error);
    res.status(500).json({ error: 'Failed to fetch marathon' });
  }
});

// Save marathon (create or update)
router.post('/marathons', (req, res) => {
  try {
    const marathon = req.body;
    if (!marathon.id || !marathon.name) {
      return res.status(400).json({ error: 'Marathon id and name are required' });
    }

    // Ensure timestamps
    if (!marathon.createdAt) {
      marathon.createdAt = Date.now();
    }
    marathon.updatedAt = Date.now();

    marathonsDb.save(marathon);
    res.json(marathon);
  } catch (error) {
    console.error('Error saving marathon:', error);
    res.status(500).json({ error: 'Failed to save marathon' });
  }
});

// Delete marathon
router.delete('/marathons/:id', (req, res) => {
  try {
    marathonsDb.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting marathon:', error);
    res.status(500).json({ error: 'Failed to delete marathon' });
  }
});

// ============ Pairings Cache ============

// Get cached pairings
router.get('/pairings-cache/:cacheKey', (req, res) => {
  try {
    const pairings = pairingsDb.get(req.params.cacheKey);
    if (!pairings) {
      return res.status(404).json({ error: 'Cache not found' });
    }
    res.json(pairings);
  } catch (error) {
    console.error('Error fetching cached pairings:', error);
    res.status(500).json({ error: 'Failed to fetch cached pairings' });
  }
});

// Set cached pairings
router.post('/pairings-cache', (req, res) => {
  try {
    const { cacheKey, pairings } = req.body;
    if (!cacheKey || !pairings) {
      return res.status(400).json({ error: 'cacheKey and pairings are required' });
    }

    pairingsDb.set(cacheKey, pairings);
    res.json({ success: true });
  } catch (error) {
    console.error('Error caching pairings:', error);
    res.status(500).json({ error: 'Failed to cache pairings' });
  }
});

// ============ Config ============

// Get all config
router.get('/config', (req, res) => {
  try {
    const config = configDb.getAll();
    res.json(config);
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// Update config (merge with existing)
router.post('/config', (req, res) => {
  try {
    const updates = req.body;
    configDb.setAll(updates);
    const config = configDb.getAll();
    res.json(config);
  } catch (error) {
    console.error('Error saving config:', error);
    res.status(500).json({ error: 'Failed to save config' });
  }
});

// Clear all config
router.delete('/config', (req, res) => {
  try {
    configDb.clear();
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing config:', error);
    res.status(500).json({ error: 'Failed to clear config' });
  }
});

export default router;
