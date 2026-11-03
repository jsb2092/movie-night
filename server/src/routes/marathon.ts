import { Router } from 'express';
import { claudeService } from '../services/claudeService.js';

export const marathonRouter = Router();

// Conversational intake: returns a follow-up question or ready-to-use preferences
marathonRouter.post('/marathon/chat', async (req, res) => {
  try {
    const { messages, today } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Invalid request', message: 'Messages are required' });
    }

    const turns = messages
      .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m: any) => ({ role: m.role, content: m.content }));

    if (turns.length === 0 || turns[turns.length - 1].role !== 'user') {
      return res.status(400).json({ error: 'Invalid request', message: 'Last message must be from the user' });
    }

    const apiKey = req.headers['x-anthropic-key'] as string | undefined;
    const todayStr = typeof today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(today)
      ? today
      : new Date().toISOString().split('T')[0];

    const result = await claudeService.planMarathonChat(turns, todayStr, apiKey);
    res.json(result);
  } catch (error) {
    console.error('Error in marathon chat:', error);
    res.status(500).json({
      error: 'Failed to continue conversation',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

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
