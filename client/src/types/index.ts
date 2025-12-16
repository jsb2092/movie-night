export interface Movie {
  id: string;
  title: string;
  year: number;
  summary: string;
  rating: number;
  audienceRating: number;
  userRating?: number; // Plex user rating (1-5 stars)
  duration: number; // in minutes
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

export type Occasion =
  | 'solo'
  | 'date-night'
  | 'friends'
  | 'family'
  | 'grandparents'
  | 'party';

export type Mood =
  | 'feel-good'
  | 'intense'
  | 'thought-provoking'
  | 'background'
  | 'emotional'
  | 'scary';

export type Duration =
  | 'quick'      // < 90 min
  | 'standard'   // 90-120 min
  | 'epic'       // 120-180 min
  | 'marathon';  // 180+ min

export type SortOption =
  | 'title'
  | 'recently-added'
  | 'year-new'
  | 'year-old'
  | 'rating'
  | 'duration-short'
  | 'duration-long';

export interface Filters {
  occasion: Occasion | null;
  mood: Mood | null;
  duration: Duration | null;
  genres: string[];
  search: string;
  hideWatched: boolean;
  sortBy: SortOption;
}

export const SORT_LABELS: Record<SortOption, string> = {
  'title': 'Title A-Z',
  'recently-added': 'Recently Added',
  'year-new': 'Year (Newest)',
  'year-old': 'Year (Oldest)',
  'rating': 'Highest Rated',
  'duration-short': 'Duration (Shortest)',
  'duration-long': 'Duration (Longest)',
};

export interface DrinkPairing {
  name: string;
  type: 'cocktail' | 'wine-beer' | 'non-alcoholic' | 'alcoholic';
  ingredients?: string[];
  instructions?: string;
  description?: string;
  vibe?: string;
}

export interface FoodPairing {
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'fancy';
}

export interface MoviePairings {
  movieId: string;
  drinks: DrinkPairing[];
  food: FoodPairing[];
  generatedAt: number;
}

export type ViewMode = 'grid' | 'scatter' | 'wheel' | 'marathon';

export type Holiday = 'christmas' | 'halloween' | 'thanksgiving' | 'valentines' | 'summer' | 'custom';

export interface MarathonEntry {
  movieId: string;
  date: string; // ISO date string (YYYY-MM-DD)
  phase?: string; // e.g., "Friends Phase", "Solo Phase"
  notes?: string;
  drink?: DrinkPairing; // Legacy single drink
  drinks?: DrinkPairing[]; // Multiple drink options (cocktail, wine/beer, mocktail)
  food?: FoodPairing;
  aiReason?: string; // Why AI picked this movie for this slot
}

export interface Marathon {
  id: string;
  name: string;
  holiday: Holiday;
  startDate: string;
  endDate: string;
  entries: MarathonEntry[];
  createdAt: number;
  updatedAt: number;
}

export interface UserRating {
  movieId: string;
  rating: number; // 1-5 stars
  notes?: string;
  watchedAt: number;
}

export const HOLIDAY_LABELS: Record<Holiday, string> = {
  'christmas': 'Christmas',
  'halloween': 'Halloween',
  'thanksgiving': 'Thanksgiving',
  'valentines': "Valentine's Day",
  'summer': 'Summer',
  'custom': 'Custom',
};

export const HOLIDAY_ICONS: Record<Holiday, string> = {
  'christmas': '🎄',
  'halloween': '🎃',
  'thanksgiving': '🦃',
  'valentines': '💕',
  'summer': '☀️',
  'custom': '🎬',
};

export const OCCASION_LABELS: Record<Occasion, string> = {
  'solo': 'Solo',
  'date-night': 'Date Night',
  'friends': 'Friends',
  'family': 'Family',
  'grandparents': 'Grandparents',
  'party': 'Party',
};

export const MOOD_LABELS: Record<Mood, string> = {
  'feel-good': 'Feel Good',
  'intense': 'Intense',
  'thought-provoking': 'Thought-Provoking',
  'background': 'Background',
  'emotional': 'Emotional',
  'scary': 'Scary',
};

export const DURATION_LABELS: Record<Duration, string> = {
  'quick': 'Quick (< 90 min)',
  'standard': 'Standard (90-120 min)',
  'epic': 'Epic (2-3 hrs)',
  'marathon': 'Marathon (3+ hrs)',
};
