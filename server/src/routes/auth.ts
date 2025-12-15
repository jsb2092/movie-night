import { Router } from 'express';
import { plexAuthService } from '../services/plexAuthService.js';

export const authRouter = Router();

// Create a new PIN for Plex OAuth
authRouter.post('/auth/plex/pin', async (_, res) => {
  try {
    const { pinId, code, authUrl } = await plexAuthService.createPin();
    res.json({ pinId, code, authUrl });
  } catch (error) {
    console.error('Error creating PIN:', error);
    res.status(500).json({
      error: 'Failed to create PIN',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Check PIN status
authRouter.get('/auth/plex/pin/:id', async (req, res) => {
  try {
    const pinId = parseInt(req.params.id, 10);
    if (isNaN(pinId)) {
      return res.status(400).json({ error: 'Invalid PIN ID' });
    }

    const { complete, authToken } = await plexAuthService.checkPin(pinId);
    res.json({ complete, authToken });
  } catch (error) {
    console.error('Error checking PIN:', error);
    res.status(500).json({
      error: 'Failed to check PIN',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get user's Plex servers with connection testing
authRouter.get('/auth/plex/servers', async (req, res) => {
  try {
    const authToken = req.headers['x-plex-token'] as string;
    if (!authToken) {
      return res.status(401).json({ error: 'No auth token provided' });
    }

    const servers = await plexAuthService.getServers(authToken);

    // Test all connections in parallel for speed
    const allTests: Promise<void>[] = [];
    for (const server of servers) {
      if (server.allConnections) {
        for (const conn of server.allConnections) {
          allTests.push(
            plexAuthService.testConnection(conn.uri, authToken)
              .then(works => {
                (conn as any).reachable = works;
                console.log(`[auth] Testing ${conn.uri}: ${works ? 'OK' : 'FAILED'}`);
              })
              .catch(() => {
                (conn as any).reachable = false;
                console.log(`[auth] Testing ${conn.uri}: FAILED (error)`);
              })
          );
        }
      }
    }
    await Promise.all(allTests);

    // Sort connections so reachable ones come first
    for (const server of servers) {
      if (server.allConnections) {
        server.allConnections.sort((a, b) => {
          const aReach = (a as any).reachable ? 1 : 0;
          const bReach = (b as any).reachable ? 1 : 0;
          if (aReach !== bReach) return bReach - aReach; // reachable first
          if (a.local && !b.local) return -1;
          if (b.local && !a.local) return 1;
          if (!a.relay && b.relay) return -1;
          if (a.relay && !b.relay) return 1;
          return 0;
        });
      }
    }

    res.json(servers);
  } catch (error) {
    console.error('Error getting servers:', error);
    res.status(500).json({
      error: 'Failed to get servers',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Test server connection
authRouter.post('/auth/plex/test', async (req, res) => {
  try {
    const { serverUri } = req.body;
    const authToken = req.headers['x-plex-token'] as string;

    if (!authToken || !serverUri) {
      return res.status(400).json({ error: 'Missing auth token or server URI' });
    }

    const success = await plexAuthService.testConnection(serverUri, authToken);
    res.json({ success });
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({
      error: 'Failed to test connection',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
