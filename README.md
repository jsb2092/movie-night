# Movie Night

A movie night planner that connects to your Plex library. Browse your collection, plan movie marathons, and get AI-powered drink and food pairing suggestions.

![Movie Night](https://img.shields.io/badge/docker-ready-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Browse Movies**: Filter by genre, duration, mood, and occasion
- **AI Marathon Planner**: Conversational AI that builds personalized movie schedules based on your preferences, who's watching, and special occasions
- **Drink & Food Pairings**: AI-generated cocktail, wine/beer, and mocktail suggestions for each movie, plus snack ideas
- **Movie Ratings**: Rate movies and track what you've watched
- **Scatter Plot Visualization**: See your marathon plotted by "vibe" (dark to heartwarming, calm to chaotic)
- **Cross-Device Sync**: SQLite database persists ratings, marathons, and cached pairings

## Quick Start with Docker

### Using Docker Compose (Recommended)

1. Create a `.env` file:
```bash
PLEX_URL=http://your-plex-ip:32400
PLEX_TOKEN=your-plex-token
ANTHROPIC_API_KEY=sk-ant-...  # Optional, for AI features
```

2. Run:
```bash
docker-compose up -d
```

3. Open `http://localhost:3001`

### Using Pre-built Image

```bash
docker run -d \
  -p 3001:3001 \
  -e PLEX_URL=http://your-plex-ip:32400 \
  -e PLEX_TOKEN=your-plex-token \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -v movie-data:/app/data \
  ghcr.io/jsb2092/movie-night:latest
```

### TrueNAS Scale

1. Add a new custom app
2. Image: `ghcr.io/jsb2092/movie-night:latest`
3. Port: `3001:3001`
4. Environment variables:
   - `PLEX_URL`: Your Plex server URL
   - `PLEX_TOKEN`: Your Plex auth token
   - `ANTHROPIC_API_KEY`: (Optional) For AI pairings
   - `DATA_DIR`: `/app/data`
5. Storage: Mount a dataset to `/app/data` for persistence

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `PLEX_URL` | Yes | Your Plex server URL (e.g., `http://192.168.1.100:32400`) |
| `PLEX_TOKEN` | Yes | Your Plex authentication token ([How to find](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/)) |
| `PLEX_LIBRARY_SECTION_ID` | No | Specific library section ID (auto-detects if not set) |
| `ANTHROPIC_API_KEY` | No | Required for AI features (marathon planner, pairings) |
| `PORT` | No | Server port (default: 3001) |
| `DATA_DIR` | No | SQLite database location (default: `./data`) |

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
# Install all dependencies
npm run install:all

# Create .env in server directory
cp .env.example server/.env
# Edit server/.env with your credentials

# Start development servers
npm run dev
```

The app will be available at `http://localhost:5173` (client) with API at `http://localhost:3001`.

### Project Structure

```
movie-app/
├── client/                 # React frontend (Vite + TailwindCSS)
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── hooks/         # Custom React hooks
│   │   └── types/         # TypeScript types
├── server/                 # Express backend
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   └── services/      # Business logic (Plex, Claude, DB)
└── docker-compose.yml
```

### Building for Production

```bash
# Build client
cd client && npm run build

# Build server
cd server && npm run build

# Start production server
cd server && npm start
```

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, Vite
- **Backend**: Express, TypeScript
- **Database**: SQLite (better-sqlite3)
- **AI**: Anthropic Claude API
- **Media**: Plex API

## License

MIT
