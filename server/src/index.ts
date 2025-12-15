import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { plexRouter } from './routes/plex.js';
import { pairingsRouter } from './routes/pairings.js';
import { authRouter } from './routes/auth.js';
import { marathonRouter } from './routes/marathon.js';
import dataRouter from './routes/data.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API routes
app.use('/api', plexRouter);
app.use('/api', pairingsRouter);
app.use('/api', authRouter);
app.use('/api', marathonRouter);
app.use('/api/data', dataRouter);

// Health check
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok' });
});

// Serve static client files in production
const clientDistPath = join(__dirname, '../../client/dist');
if (existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  // SPA fallback - serve index.html for any non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(join(clientDistPath, 'index.html'));
    }
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
