export interface PlexMovie {
  id: string;
  title: string;
  year: number;
  summary: string;
  rating: number;
  audienceRating: number;
  duration: number;
  genres: string[];
  directors: string[];
  actors: string[];
  thumb: string;
  art: string;
  contentRating: string;
  tagline?: string;
  viewCount?: number;
  lastViewedAt?: number;
  addedAt: number;
}

interface PlexVideo {
  ratingKey: string;
  title: string;
  year?: number;
  summary?: string;
  rating?: string;
  audienceRating?: string;
  duration?: number;
  thumb?: string;
  art?: string;
  contentRating?: string;
  tagline?: string;
  viewCount?: number;
  lastViewedAt?: number;
  addedAt?: number;
  Genre?: Array<{ tag: string }>;
  Director?: Array<{ tag: string }>;
  Role?: Array<{ tag: string }>;
}

interface PlexResponse {
  MediaContainer: {
    size: number;
    Video?: PlexVideo[];
    Metadata?: PlexVideo[];
  };
}

export interface PlexConfig {
  baseUrl: string;
  token: string;
}

function normalizeUrl(url: string): string {
  if (!url) return '';
  // Remove trailing slashes
  url = url.replace(/\/+$/, '');
  // Add http:// if no protocol specified
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'http://' + url;
  }
  return url;
}

export function getPlexConfig(
  headers?: Record<string, string | string[] | undefined>,
  query?: Record<string, string | undefined>
): PlexConfig {
  // Try query params first (for image requests), then headers, then env
  const rawUrl = query?.url || (headers?.['x-plex-url'] as string) || process.env.PLEX_URL || '';
  const baseUrl = normalizeUrl(rawUrl);
  const token = query?.token || (headers?.['x-plex-token'] as string) || process.env.PLEX_TOKEN || '';
  return { baseUrl, token };
}

export function isPlexConfigured(config: PlexConfig): boolean {
  return Boolean(config.baseUrl && config.token);
}

async function plexFetch(config: PlexConfig, endpoint: string): Promise<PlexResponse> {
  const url = `${config.baseUrl}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'X-Plex-Token': config.token,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Plex API error: ${response.status}`);
  }

  return response.json();
}

export async function getMovies(config: PlexConfig): Promise<PlexMovie[]> {
  // Check if a specific section ID is configured
  const configuredSectionId = process.env.PLEX_LIBRARY_SECTION_ID;

  let sectionKey: string;

  if (configuredSectionId) {
    // Use configured section ID directly
    sectionKey = configuredSectionId;
  } else {
    // Auto-detect: get libraries to find the movies section
    const sectionsResponse = await plexFetch(config, '/library/sections');
    const sections = (sectionsResponse.MediaContainer as unknown as {
      Directory?: Array<{ key: string; type: string; title: string }>;
    }).Directory || [];

    // Prefer a library named "Movies", otherwise use the first movie library
    const movieSection = sections.find(s => s.type === 'movie' && s.title === 'Movies')
      || sections.find(s => s.type === 'movie');
    if (!movieSection) {
      throw new Error('No movie library found in Plex');
    }
    sectionKey = movieSection.key;
  }

  // Fetch all movies from the library
  const response = await plexFetch(
    config,
    `/library/sections/${sectionKey}/all`
  );

  const videos = response.MediaContainer.Metadata || response.MediaContainer.Video || [];

  return videos.map((video): PlexMovie => ({
    id: video.ratingKey,
    title: video.title,
    year: video.year || 0,
    summary: video.summary || '',
    rating: parseFloat(video.rating || '0'),
    audienceRating: parseFloat(video.audienceRating || '0'),
    duration: Math.round((video.duration || 0) / 60000), // Convert ms to minutes
    genres: video.Genre?.map(g => g.tag) || [],
    directors: video.Director?.map(d => d.tag) || [],
    actors: video.Role?.slice(0, 5).map(r => r.tag) || [], // Top 5 actors
    // Use proxied/cached URLs instead of direct Plex URLs
    thumb: video.thumb ? `/api/img/thumb/${video.ratingKey}` : '',
    art: video.art ? `/api/img/art/${video.ratingKey}` : '',
    contentRating: video.contentRating || 'NR',
    tagline: video.tagline,
    viewCount: video.viewCount,
    lastViewedAt: video.lastViewedAt,
    addedAt: video.addedAt || 0,
  }));
}

export async function fetchImage(
  config: PlexConfig,
  movieId: string,
  type: 'thumb' | 'art'
): Promise<{ buffer: Buffer; contentType: string }> {
  const endpoint = type === 'art' ? 'art' : 'thumb';
  const url = `${config.baseUrl}/library/metadata/${movieId}/${endpoint}?X-Plex-Token=${config.token}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const buffer = Buffer.from(await response.arrayBuffer());

  return { buffer, contentType };
}
