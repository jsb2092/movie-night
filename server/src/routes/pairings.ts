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
