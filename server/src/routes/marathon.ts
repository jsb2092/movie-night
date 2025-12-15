import { Router } from 'express';
import { claudeService } from '../services/claudeService.js';

export const marathonRouter = Router();

marathonRouter.post('/marathon/generate', async (req, res) => {
  try {
    const { preferences, movieLibrary } = req.body;

    if (!movieLibrary || !Array.isArray(movieLibrary) || movieLibrary.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Movie library is required',
      });
    }

    // Get API key from header or fall back to env
    const apiKey = req.headers['x-anthropic-key'] as string | undefined;

    console.log('[marathon] Generating marathon with', movieLibrary.length, 'movies');
    console.log('[marathon] Preferences:', JSON.stringify(preferences, null, 2));

    const result = await claudeService.generateMarathon(
      preferences || {},
      movieLibrary,
      apiKey
    );

    // Add ID and timestamps
    const marathon = {
      id: `marathon-${Date.now()}`,
      ...result,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    console.log('[marathon] Generated marathon:', marathon.name, 'with', marathon.entries.length, 'entries');

    res.json(marathon);
  } catch (error) {
    console.error('Error generating marathon:', error);
    res.status(500).json({
      error: 'Failed to generate marathon',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
