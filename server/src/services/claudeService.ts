import Anthropic from '@anthropic-ai/sdk';
import { configDb } from './database.js';

// Claude Sonnet 4 was retired in June 2026. Default to the current Sonnet.
export const DEFAULT_CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

// The model chosen in Settings wins, then the env override, then the default.
export function getConfiguredModel(): string {
  return configDb.get('anthropicModel') || DEFAULT_CLAUDE_MODEL;
}

// Current models think before answering and the thinking counts against
// max_tokens. These are short JSON tasks, so keep the effort low.
function requestDefaults(effort: 'low' | 'medium' | 'high' = 'low') {
  return {
    model: getConfiguredModel(),
    output_config: { effort },
  } as const;
}

export interface ClaudeModelInfo {
  id: string;
  displayName: string;
  createdAt: string;
}

export interface MarathonPhase {
  name: string;
  startDate: string;
  endDate: string;
  audience: string;
  /** Drink preference for this phase, e.g. "cocktails", "mocktails", "none" */
  drinks?: string;
}

export interface MarathonPreferences {
  occasion?: string;
  startDate?: string;
  endDate?: string;
  /** Total movies to schedule; defaults to one per day */
  movieCount?: number;
  phases?: MarathonPhase[];
  vibe?: string[];
  drinkPreference?: string | string[];
  mustInclude?: string;
  avoid?: string;
  additionalNotes?: string;
}

export interface MarathonChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface MarathonChatResult {
  status: 'question' | 'ready';
  message: string;
  quickReplies: string[];
  preferences: MarathonPreferences | null;
}

const HOLIDAYS = ['christmas', 'halloween', 'thanksgiving', 'valentines', 'summer'];

// Current models return a thinking block before the text, so don't assume
// the first block is text.
function extractText(response: Anthropic.Message): string {
  for (const block of response.content) {
    if (block.type === 'text') return block.text;
  }
  throw new Error(`No text in Claude response (stop_reason: ${response.stop_reason})`);
}

interface Movie {
  title: string;
  year: number;
  genres: string[];
  summary: string;
  contentRating: string;
}

interface DrinkPairing {
  name: string;
  type: 'alcoholic' | 'non-alcoholic';
  ingredients: string[];
  instructions: string;
  vibe: string;
}

interface FoodPairing {
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'fancy';
}

interface Pairings {
  movieId: string;
  drinks: DrinkPairing[];
  food: FoodPairing[];
  generatedAt: number;
}

export class ClaudeService {
  private _client: Anthropic | null = null;

  private get client(): Anthropic | null {
    if (!this._client && process.env.ANTHROPIC_API_KEY) {
      this._client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    return this._client;
  }

  /** Models available to the given API key, newest first. */
  async listModels(apiKey?: string): Promise<ClaudeModelInfo[]> {
    const client = apiKey ? new Anthropic({ apiKey }) : this.client;
    if (!client) {
      throw new Error('Anthropic API key not configured');
    }

    const response = await client.get<{ limit: number }, {
      data: { id: string; display_name: string; created_at: string }[];
    }>('/v1/models', { query: { limit: 100 } });

    return response.data
      .map((m) => ({ id: m.id, displayName: m.display_name, createdAt: m.created_at }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async generatePairings(
    movie: Movie,
    movieId: string,
    occasion?: string | null,
    mood?: string | null
  ): Promise<Pairings> {
    if (!this.client) {
      // Return default pairings if API not configured
      return this.getDefaultPairings(movie, movieId);
    }

    const occasionContext = occasion
      ? `The viewer is watching ${occasion === 'date-night' ? 'on a date night' :
          occasion === 'solo' ? 'alone' :
          occasion === 'friends' ? 'with friends' :
          occasion === 'family' ? 'with family including kids' :
          occasion === 'grandparents' ? 'with grandparents' :
          occasion === 'party' ? 'at a party'
          : ''}.`
      : '';

    const moodContext = mood
      ? `They're in the mood for something ${mood}.`
      : '';

    const prompt = `Generate drink and food pairings for watching the movie "${movie.title}" (${movie.year}).

Movie info:
- Genres: ${movie.genres.join(', ')}
- Summary: ${movie.summary.slice(0, 200)}...
- Rating: ${movie.contentRating}

Context: ${occasionContext} ${moodContext}

Return a JSON object with this exact structure:
{
  "drinks": [
    {
      "name": "drink name",
      "type": "alcoholic",
      "ingredients": ["ingredient 1", "ingredient 2"],
      "instructions": "How to make it",
      "vibe": "Why this pairs well with the movie"
    },
    {
      "name": "mocktail name",
      "type": "non-alcoholic",
      "ingredients": ["ingredient 1", "ingredient 2"],
      "instructions": "How to make it",
      "vibe": "Why this pairs well"
    }
  ],
  "food": [
    {
      "name": "snack name",
      "description": "Brief description and why it pairs well",
      "difficulty": "easy"
    },
    {
      "name": "fancier option",
      "description": "Brief description",
      "difficulty": "medium"
    }
  ]
}

Be creative and thematic! Match the drinks and food to the movie's setting, era, themes, or notable scenes. For family occasions, keep it appropriate. For parties, suggest shareable options.`;

    try {
      const response = await this.client.messages.create({
        ...requestDefaults(),
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = extractText(response);

      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        movieId,
        drinks: parsed.drinks,
        food: parsed.food,
        generatedAt: Date.now(),
      };
    } catch (error) {
      console.error('Claude API error:', error);
      return this.getDefaultPairings(movie, movieId);
    }
  }

  private getDefaultPairings(movie: Movie, movieId: string): Pairings {
    // Genre-based defaults
    const isAction = movie.genres.includes('Action');
    const isComedy = movie.genres.includes('Comedy');
    const isRomance = movie.genres.includes('Romance');
    const isHorror = movie.genres.includes('Horror');
    const isSciFi = movie.genres.includes('Science Fiction');

    let drinks: DrinkPairing[] = [
      {
        name: isAction ? 'Whiskey Sour' :
              isComedy ? 'Margarita' :
              isRomance ? 'French 75' :
              isHorror ? 'Bloody Mary' :
              isSciFi ? 'Blue Lagoon' : 'Old Fashioned',
        type: 'alcoholic',
        ingredients: ['2 oz whiskey', '1 oz lemon juice', '0.5 oz simple syrup'],
        instructions: 'Shake with ice and strain into a glass',
        vibe: 'A classic choice that matches the movie\'s energy',
      },
      {
        name: 'Sparkling Lemonade',
        type: 'non-alcoholic',
        ingredients: ['Fresh lemon juice', 'Simple syrup', 'Sparkling water', 'Mint'],
        instructions: 'Mix and serve over ice with fresh mint',
        vibe: 'Refreshing and perfect for any movie night',
      },
    ];

    let food: FoodPairing[] = [
      {
        name: 'Classic Buttered Popcorn',
        description: 'The timeless movie snack, can\'t go wrong',
        difficulty: 'easy',
      },
      {
        name: isAction ? 'Loaded Nachos' :
              isComedy ? 'Pizza Rolls' :
              isRomance ? 'Chocolate Covered Strawberries' :
              isHorror ? 'Deviled Eggs' :
              'Cheese Board',
        description: 'Something special to elevate the viewing experience',
        difficulty: 'medium',
      },
    ];

    return {
      movieId,
      drinks,
      food,
      generatedAt: Date.now(),
    };
  }

  isConfigured(): boolean {
    return Boolean(this.client);
  }

  async suggestMovie(
    mood: string,
    movieLibrary: {
      id: string;
      title: string;
      year: number;
      genres: string[];
      duration: number;
      summary?: string;
      contentRating?: string;
    }[],
    apiKey?: string
  ): Promise<{
    movieId: string;
    title: string;
    reason: string;
  }> {
    let client = this.client;
    if (apiKey) {
      client = new Anthropic({ apiKey });
    }

    if (!client) {
      throw new Error('Anthropic API key not configured');
    }

    // Send minimal data per movie to stay under token limits
    const movieList = movieLibrary.map(m => `${m.id}|${m.title} (${m.year})`).join('\n');

    const prompt = `You are a movie recommendation expert. Pick the perfect movie for the user's mood from their library.

MOOD: "${mood}"

LIBRARY (id|title):
${movieList}

Pick ONE movie and return ONLY valid JSON:
{
  "movieId": "exact-id",
  "title": "Movie Title",
  "reason": "2-3 sentences explaining why this is perfect for their mood."
}`;

    const response = await client.messages.create({
      ...requestDefaults(),
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = extractText(response);

    return this.parseJsonResponse(text);
  }

  // Helper to parse JSON from Claude response
  private parseJsonResponse(text: string): any {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    let jsonStr = jsonMatch[0];
    // Remove trailing commas before ] or }
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');

    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('JSON parse error, attempting fix...');
      // Try more aggressive cleanup - remove any control characters
      jsonStr = jsonStr.replace(/[\x00-\x1F\x7F]/g, ' ');
      return JSON.parse(jsonStr);
    }
  }

  // Step 1: Select and schedule movies
  private async selectMovies(
    client: Anthropic,
    preferences: MarathonPreferences,
    movieLibrary: {
      id: string;
      title: string;
      year: number;
      genres: string[];
      rating: number;
      contentRating: string;
      duration: number;
      summary?: string;
    }[],
    startDate: string,
    endDate: string,
    numDays: number
  ): Promise<{
    name: string;
    holiday: string;
    entries: { movieId: string; date: string; phase?: string; aiReason?: string }[];
  }> {
    // Send minimal data per movie - Claude knows movies by title/year
    const movieList = movieLibrary.map(m => `${m.id}|${m.title} (${m.year})|${m.contentRating || 'NR'}`).join('\n');
    const movieCount = Math.min(
      movieLibrary.length,
      preferences.movieCount && preferences.movieCount > 0 ? Math.round(preferences.movieCount) : numDays
    );

    const prompt = `You are a movie expert planning a ${preferences.occasion || 'movie'} marathon.

PREFERENCES:
- Dates: ${startDate} to ${endDate} (${numDays} days)
- Vibe: ${preferences.vibe?.join(', ') || 'varied'}
${preferences.mustInclude ? `- Must include: ${preferences.mustInclude}` : ''}
${preferences.avoid ? `- Avoid: ${preferences.avoid}` : ''}
${preferences.additionalNotes ? `- Notes: ${preferences.additionalNotes}` : ''}
${preferences.drinkPreference ? `- Drinks: ${Array.isArray(preferences.drinkPreference) ? preferences.drinkPreference.join(', ') : preferences.drinkPreference}` : ''}
${preferences.phases?.length ? `
PHASES (who is watching when):
${preferences.phases.map(p => `- ${p.name}: ${p.startDate} to ${p.endDate} (audience: ${p.audience}${p.drinks ? `, drinks: ${p.drinks}` : ''})`).join('\n')}` : ''}

LIBRARY (id|title|rating):
${movieList}

INSTRUCTIONS:
- Pick ${movieCount} movies${movieCount < numDays ? ` spread across the ${numDays} days (not every day needs a movie; favor weekends and the days called out in the notes)` : ', one per day'}
- Every entry's "phase" must be the name of one of the PHASES above when phases are given, chosen by the entry's date
- For Christmas marathons: schedule Christmas-themed movies ON and BEFORE Dec 25
- Match content ratings to audience (kids/family phases = G/PG)
- Build to the key dates (e.g. Christmas Eve/Day) with the best picks

Return ONLY valid JSON:
{
  "name": "Creative Marathon Name",
  "holiday": "${HOLIDAYS.includes(preferences.occasion || '') ? preferences.occasion : 'custom'}",
  "entries": [
    {"movieId": "123", "date": "YYYY-MM-DD", "phase": "Phase Name", "aiReason": "Brief reason"}
  ]
}`;

    const response = await client.messages.create({
      ...requestDefaults(),
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = extractText(response);

    return this.parseJsonResponse(text);
  }

  // Step 2: Generate pairings for a single movie
  private async generateMoviePairings(
    client: Anthropic,
    movie: { id: string; title: string; year: number; genres: string[]; summary?: string },
    occasion: string,
    drinkPreference: string
  ): Promise<{
    drinks: Array<{
      name: string;
      type: 'cocktail' | 'wine-beer' | 'non-alcoholic';
      ingredients?: string[];
      instructions?: string;
      description?: string;
      vibe?: string;
    }>;
    food: { name: string; description: string; difficulty: 'easy' | 'medium' | 'fancy' };
  }> {
    const prompt = `Generate drink and food pairings for "${movie.title}" (${movie.year}).

Movie info:
- Genres: ${movie.genres.join(', ')}
- Summary: ${(movie.summary || '').slice(0, 150)}...

Context: ${occasion} marathon. Drink preference: ${drinkPreference}

Return ONLY valid JSON:
{
  "drinks": [
    {
      "name": "Thematic Cocktail Name",
      "type": "cocktail",
      "ingredients": ["liquor", "mixer", "etc"],
      "instructions": "Brief instructions",
      "vibe": "Why this matches the movie"
    },
    {
      "name": "Wine or Beer",
      "type": "wine-beer",
      "description": "Specific varietal or style that pairs well"
    },
    {
      "name": "Thematic Mocktail (NO ALCOHOL - no rum, vodka, whiskey, etc!)",
      "type": "non-alcoholic",
      "ingredients": ["juices", "sodas", "syrups only"],
      "instructions": "Brief instructions"
    }
  ],
  "food": {
    "name": "Snack Name",
    "description": "Brief description and why it pairs",
    "difficulty": "easy"
  }
}

Be creative and thematic! Match to movie's setting, era, or themes.`;

    const response = await client.messages.create({
      ...requestDefaults(),
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = extractText(response);

    return this.parseJsonResponse(text);
  }

  /**
   * Conversational intake for the marathon planner. Takes the chat so far and
   * returns either a follow-up question or a ready-to-generate preferences object.
   */
  async planMarathonChat(
    messages: MarathonChatTurn[],
    today: string,
    apiKey?: string
  ): Promise<MarathonChatResult> {
    const client = apiKey ? new Anthropic({ apiKey }) : this.client;
    if (!client) {
      throw new Error('Anthropic API key not configured');
    }

    const system = `You are the intake assistant for a movie-marathon planner. The user describes what they want in their own words; you ask short, friendly follow-up questions until you can fill in the plan, then hand off.

Today's date is ${today}. Resolve relative dates ("the month before Christmas", "Halloween week", "next weekend") into concrete YYYY-MM-DD dates in the future, and say what you assumed.

What you need before you are ready:
1. Dates: startDate and endDate.
2. How many movies: every day, a few per week, or a total count. Turn "a bunch" or "a few a week" into a concrete movieCount and say so.
3. Who is watching and when: solo, partner, friends, family, kids, grandparents. If different people on different days (e.g. "kids on some days"), capture that as phases with date ranges when the user gives them, otherwise ask which days or weekdays.
4. Drinks: cocktails / wine & beer / mocktails / hot drinks / none, overall and per phase (kid days usually mean mocktails).
Nice to have: occasion, vibe, must-include movies, movies to avoid, special days.

Rules:
- Ask ONE question per turn, two to three sentences max. Never re-ask something already answered; fill gaps with sensible assumptions and state them briefly.
- Offer 2-5 quickReplies when a question has natural short answers. Leave quickReplies empty for open questions.
- As soon as you have dates, audience and drinks, set status "ready": message is a short recap of the plan (dates, movie count, who/when, drinks, must-haves) ending by inviting changes. Still return the full preferences object. If the user then asks for changes, apply them and return status "ready" again.
- preferences.additionalNotes should carry every nuance that doesn't fit a field (which days are kid days, cocktail days, special dates, traditions).
- occasion is one of: christmas, halloween, thanksgiving, valentines, summer, custom.
- phases[].audience is one of: solo, partner, friends, family, kids, grandparents, mixed. phases[].drinks is a short phrase like "cocktails", "wine and beer", "mocktails", "hot drinks", "none".
- vibe is an array of short tags, e.g. ["cozy", "comedy", "dark", "family", "action", "animated", "romantic", "classic"].

Return ONLY valid JSON, no prose outside it:
{
  "status": "question" | "ready",
  "message": "what you say to the user",
  "quickReplies": ["short answer", "..."],
  "preferences": null | {
    "occasion": "christmas",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "movieCount": 12,
    "phases": [{"name": "Date nights", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "audience": "partner", "drinks": "cocktails"}],
    "vibe": ["cozy"],
    "drinkPreference": ["cocktails", "mocktails"],
    "mustInclude": "Die Hard, Elf",
    "avoid": "nothing too scary",
    "additionalNotes": "Kids are over on weekends, so weekend picks must be PG with mocktails. Christmas Eve should be special."
  }
}`;

    const response = await client.messages.create({
      ...requestDefaults('medium'),
      max_tokens: 3000,
      system,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    const parsed = this.parseJsonResponse(extractText(response));
    const status: MarathonChatResult['status'] = parsed.status === 'ready' ? 'ready' : 'question';
    return {
      status,
      message: typeof parsed.message === 'string' && parsed.message.trim()
        ? parsed.message
        : 'Tell me a bit more about what you have in mind.',
      quickReplies: Array.isArray(parsed.quickReplies)
        ? parsed.quickReplies.filter((q: unknown) => typeof q === 'string').slice(0, 5)
        : [],
      preferences: status === 'ready' && parsed.preferences && typeof parsed.preferences === 'object'
        ? parsed.preferences
        : null,
    };
  }

  async generateMarathon(
    preferences: MarathonPreferences,
    movieLibrary: {
      id: string;
      title: string;
      year: number;
      genres: string[];
      rating: number;
      contentRating: string;
      duration: number;
      summary?: string;
    }[],
    apiKey?: string
  ): Promise<{
    name: string;
    holiday: string;
    startDate: string;
    endDate: string;
    entries: {
      movieId: string;
      date: string;
      phase?: string;
      notes?: string;
      drinks?: Array<{
        name: string;
        type: 'cocktail' | 'wine-beer' | 'non-alcoholic';
        ingredients?: string[];
        instructions?: string;
        description?: string;
        vibe?: string;
      }>;
      food?: { name: string; description: string; difficulty: 'easy' | 'medium' | 'fancy' };
      aiReason?: string;
    }[];
  }> {
    // Use provided API key or fall back to env
    let client = this.client;
    if (apiKey) {
      client = new Anthropic({ apiKey });
    }

    if (!client) {
      throw new Error('Anthropic API key not configured');
    }

    const startDate = preferences.startDate || new Date().toISOString().split('T')[0];
    const endDate = preferences.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Calculate number of days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const numDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    console.log(`[Marathon] Step 1: Selecting ${numDays} movies...`);

    // Step 1: Select and schedule movies
    const selection = await this.selectMovies(
      client,
      preferences,
      movieLibrary,
      startDate,
      endDate,
      numDays
    );

    // Validate movie IDs exist in library
    const validMovieIds = new Set(movieLibrary.map(m => m.id));
    const movieMap = new Map(movieLibrary.map(m => [m.id, m]));
    const validEntries = selection.entries.filter((e: any) => validMovieIds.has(e.movieId));

    console.log(`[Marathon] Step 1 complete: ${validEntries.length} valid movies selected`);
    console.log(`[Marathon] Step 2: Generating pairings for ${validEntries.length} movies in batches...`);

    // Step 2: Generate pairings for each movie in batches to avoid rate limiting
    const drinkPref = Array.isArray(preferences.drinkPreference)
      ? preferences.drinkPreference.join(', ')
      : preferences.drinkPreference || 'varied';
    const occasion = preferences.occasion || 'movie';

    // Process in batches of 5 to avoid rate limits
    const BATCH_SIZE = 5;
    const entriesWithPairings: any[] = [];

    for (let i = 0; i < validEntries.length; i += BATCH_SIZE) {
      const batch = validEntries.slice(i, i + BATCH_SIZE);
      console.log(`[Marathon] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(validEntries.length / BATCH_SIZE)}...`);

      const batchPromises = batch.map(async (entry: any) => {
        const movie = movieMap.get(entry.movieId);
        if (!movie) return { ...entry, drinks: [], food: null };

        // A phase can override the drink preference (e.g. mocktails on kid days)
        const phase = preferences.phases?.find(p => p.name === entry.phase)
          || preferences.phases?.find(p => entry.date >= p.startDate && entry.date <= p.endDate);
        const entryDrinkPref = phase?.drinks || drinkPref;

        try {
          const pairings = await this.generateMoviePairings(client!, movie, occasion, entryDrinkPref);
          return {
            ...entry,
            drinks: pairings.drinks,
            food: pairings.food,
          };
        } catch (error) {
          console.error(`[Marathon] Failed to generate pairings for ${movie.title}:`, error);
          // Return entry without pairings on error
          return { ...entry, drinks: [], food: null };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      entriesWithPairings.push(...batchResults);

      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < validEntries.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`[Marathon] Step 2 complete: All pairings generated`);

    return {
      name: selection.name || `${preferences.occasion || 'Movie'} Marathon`,
      holiday: selection.holiday || 'custom',
      startDate,
      endDate,
      entries: entriesWithPairings,
    };
  }
}

export const claudeService = new ClaudeService();
