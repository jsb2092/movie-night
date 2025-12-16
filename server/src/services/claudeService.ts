import Anthropic from '@anthropic-ai/sdk';

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
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      // Extract JSON from the response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
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

    const prompt = `You are a fun, thoughtful movie recommendation expert. Based on how the user is feeling, pick the PERFECT movie for them from their library.

USER'S MOOD/SITUATION:
"${mood}"

AVAILABLE MOVIES IN THEIR LIBRARY:
${movieLibrary.map(m => `- ID: "${m.id}" | "${m.title}" (${m.year}) [${m.genres.join(', ')}] ${m.duration}min - ${(m.summary || '').slice(0, 100)}...`).join('\n')}

INSTRUCTIONS:
1. Carefully consider what the user said - their mood, energy level, situation
2. Pick ONE movie from the library that would be perfect for them right now
3. Give a warm, personalized explanation of why this movie is exactly what they need

Return ONLY valid JSON:
{
  "movieId": "exact-id-from-library",
  "title": "Movie Title",
  "reason": "2-3 sentences explaining why this is THE perfect pick for their current mood. Be specific about how the movie matches what they described. Make it feel personal and thoughtful."
}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return this.parseJsonResponse(content.text);
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
    preferences: {
      occasion?: string;
      startDate?: string;
      endDate?: string;
      phases?: { name: string; startDate: string; endDate: string; audience: string }[];
      vibe?: string[];
      drinkPreference?: string | string[];
      mustInclude?: string;
      avoid?: string;
      additionalNotes?: string;
    },
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
    const prompt = `You are a fun, knowledgeable movie expert helping plan a movie marathon. Select and schedule movies.

USER'S PREFERENCES:
- Occasion: ${preferences.occasion || 'general movie marathon'}
- Dates: ${startDate} to ${endDate} (${numDays} days)
- Vibe they want: ${preferences.vibe?.join(', ') || 'varied'}
- Must include: ${preferences.mustInclude || 'none specified'}
- Avoid: ${preferences.avoid || 'none specified'}
- Additional notes: ${preferences.additionalNotes || 'none'}
${preferences.phases?.length ? `
VIEWING PHASES:
${preferences.phases.map(p => `- ${p.name}: ${p.startDate} to ${p.endDate} (audience: ${p.audience})`).join('\n')}
` : ''}

AVAILABLE MOVIES IN THEIR LIBRARY (use the ID exactly as shown):
${movieLibrary.map(m => `- ID: "${m.id}" | "${m.title}" (${m.year}) [${m.genres.join(', ')}] ${m.contentRating || 'NR'}, ${m.duration}min`).join('\n')}

INSTRUCTIONS:
1. Pick ${Math.min(numDays, movieLibrary.length)} movies that best match their preferences
2. Schedule them across the date range, considering:
   - **IMPORTANT FOR CHRISTMAS MARATHONS**: Movies scheduled BEFORE and ON December 25th should be Christmas/holiday themed movies (look for titles with Christmas, Holiday, Santa, Carol, Miracle, etc. or movies traditionally associated with Christmas like Home Alone, It's a Wonderful Life, Elf, etc.). Movies AFTER December 25th can be non-Christmas movies unless the user specified otherwise.
   - Save family-friendly movies for when kids/grandparents are around
   - Put edgier/longer movies during solo or friends phases
   - Build momentum - save some great movies for Christmas Eve and Christmas Day
   - Consider movie length for different days (shorter on busy days)
3. Write a brief, fun reason why you picked each movie for that slot

CRITICAL: The movieId MUST be the exact ID string from the library above (e.g., "12345" not the movie title).

Return ONLY valid JSON in this exact format:
{
  "name": "Creative Marathon Name",
  "holiday": "${preferences.occasion === 'christmas' ? 'christmas' : preferences.occasion === 'halloween' ? 'halloween' : 'custom'}",
  "entries": [
    {
      "movieId": "12345",
      "date": "YYYY-MM-DD",
      "phase": "Phase Name if applicable",
      "aiReason": "Fun, brief explanation of why this movie on this day"
    }
  ]
}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return this.parseJsonResponse(content.text);
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
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return this.parseJsonResponse(content.text);
  }

  async generateMarathon(
    preferences: {
      occasion?: string;
      startDate?: string;
      endDate?: string;
      phases?: { name: string; startDate: string; endDate: string; audience: string }[];
      vibe?: string[];
      drinkPreference?: string | string[];
      mustInclude?: string;
      avoid?: string;
      additionalNotes?: string;
    },
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

        try {
          const pairings = await this.generateMoviePairings(client!, movie, occasion, drinkPref);
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
