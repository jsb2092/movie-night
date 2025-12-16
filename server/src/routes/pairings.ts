import { Router } from 'express';
import { claudeService } from '../services/claudeService.js';

export const pairingsRouter = Router();

pairingsRouter.post('/pairings', async (req, res) => {
  try {
    const { movie, occasion, mood } = req.body;

    if (!movie || !movie.id || !movie.title) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Movie object with id and title is required',
      });
    }

    const pairings = await claudeService.generatePairings(
      {
        title: movie.title,
        year: movie.year,
        genres: movie.genres,
        summary: movie.summary,
        contentRating: movie.contentRating,
      },
      movie.id,
      occasion,
      mood
    );

    res.json(pairings);
  } catch (error) {
    console.error('Error generating pairings:', error);
    res.status(500).json({
      error: 'Failed to generate pairings',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

pairingsRouter.get('/pairings/status', (_, res) => {
  res.json({
    configured: claudeService.isConfigured(),
  });
});

// Surprise Me - AI movie suggestion based on mood
pairingsRouter.post('/suggest', async (req, res) => {
  try {
    const { mood, movies, apiKey } = req.body;

    if (!mood || typeof mood !== 'string' || mood.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Mood description is required',
      });
    }

    if (!movies || !Array.isArray(movies) || movies.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Movies array is required',
      });
    }

    const suggestion = await claudeService.suggestMovie(
      mood.trim(),
      movies.map((m: any) => ({
        id: m.id,
        title: m.title,
        year: m.year,
        genres: m.genres,
        duration: m.duration,
        summary: m.summary,
        contentRating: m.contentRating,
      })),
      apiKey
    );

    res.json(suggestion);
  } catch (error) {
    console.error('Error suggesting movie:', error);
    res.status(500).json({
      error: 'Failed to suggest movie',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
