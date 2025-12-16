import { useMemo, useState } from 'react';
import { Film, Clock, Star, Users, Clapperboard, TrendingUp, Award, Calendar } from 'lucide-react';
import { MovieModal } from './MovieModal';
import { useImageUrl } from '../contexts/ImageContext';
import type { Movie, Occasion, Mood } from '../types';

interface StatsViewProps {
  movies: Movie[];
  occasion: Occasion | null;
  mood: Mood | null;
  plexHeaders?: Record<string, string>;
  allMovies?: Movie[];
}

interface GenreStats {
  genre: string;
  count: number;
  percentage: number;
  color: string;
}

const GENRE_COLORS: Record<string, string> = {
  'Action': '#ef4444',
  'Adventure': '#f97316',
  'Animation': '#10b981',
  'Comedy': '#f59e0b',
  'Crime': '#6b7280',
  'Documentary': '#8b5cf6',
  'Drama': '#6366f1',
  'Family': '#ec4899',
  'Fantasy': '#a855f7',
  'History': '#d4a574',
  'Horror': '#7c3aed',
  'Music': '#14b8a6',
  'Mystery': '#475569',
  'Romance': '#f472b6',
  'Science Fiction': '#06b6d4',
  'Thriller': '#dc2626',
  'War': '#78716c',
  'Western': '#ca8a04',
};

function getGenreColor(genre: string): string {
  return GENRE_COLORS[genre] || '#6b7280';
}

function formatDuration(minutes: number): string {
  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const mins = minutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${mins}m`;
  }
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

export function StatsView({ movies, occasion, mood, plexHeaders, allMovies }: StatsViewProps) {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const getImageUrl = useImageUrl();

  const stats = useMemo(() => {
    if (movies.length === 0) return null;

    // Total runtime
    const totalMinutes = movies.reduce((sum, m) => sum + m.duration, 0);

    // Average runtime
    const avgRuntime = Math.round(totalMinutes / movies.length);

    // Year stats
    const years = movies.map((m) => m.year);
    const oldestYear = Math.min(...years);
    const newestYear = Math.max(...years);
    const avgYear = Math.round(years.reduce((a, b) => a + b, 0) / years.length);

    // Genre breakdown
    const genreCounts = new Map<string, number>();
    movies.forEach((m) => {
      m.genres.forEach((g) => {
        genreCounts.set(g, (genreCounts.get(g) || 0) + 1);
      });
    });
    const genreStats: GenreStats[] = Array.from(genreCounts.entries())
      .map(([genre, count]) => ({
        genre,
        count,
        percentage: (count / movies.length) * 100,
        color: getGenreColor(genre),
      }))
      .sort((a, b) => b.count - a.count);

    // Director stats
    const directorCounts = new Map<string, number>();
    movies.forEach((m) => {
      m.directors.forEach((d) => {
        directorCounts.set(d, (directorCounts.get(d) || 0) + 1);
      });
    });
    const topDirectors = Array.from(directorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Actor stats
    const actorCounts = new Map<string, number>();
    movies.forEach((m) => {
      m.actors.forEach((a) => {
        actorCounts.set(a, (actorCounts.get(a) || 0) + 1);
      });
    });
    const topActors = Array.from(actorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Rating distribution (critic rating)
    const ratingBuckets = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // 0-1, 1-2, ..., 9-10
    movies.forEach((m) => {
      if (m.rating > 0) {
        const bucket = Math.min(9, Math.floor(m.rating));
        ratingBuckets[bucket]++;
      }
    });

    // Runtime distribution
    const runtimeBuckets = {
      short: movies.filter((m) => m.duration < 90).length,
      standard: movies.filter((m) => m.duration >= 90 && m.duration < 120).length,
      long: movies.filter((m) => m.duration >= 120 && m.duration < 150).length,
      epic: movies.filter((m) => m.duration >= 150).length,
    };

    // Decade distribution
    const decadeCounts = new Map<number, number>();
    movies.forEach((m) => {
      const decade = Math.floor(m.year / 10) * 10;
      decadeCounts.set(decade, (decadeCounts.get(decade) || 0) + 1);
    });
    const decadeStats = Array.from(decadeCounts.entries())
      .sort((a, b) => a[0] - b[0]);

    // Highest/lowest rated
    const ratedMovies = movies.filter((m) => m.rating > 0);
    const highestRated = ratedMovies.length > 0
      ? [...ratedMovies].sort((a, b) => b.rating - a.rating).slice(0, 5)
      : [];

    // Longest/shortest
    const longest = [...movies].sort((a, b) => b.duration - a.duration).slice(0, 3);
    const shortest = [...movies].sort((a, b) => a.duration - b.duration).slice(0, 3);

    // Oldest/newest
    const oldest = [...movies].sort((a, b) => a.year - b.year).slice(0, 3);
    const newest = [...movies].sort((a, b) => b.year - a.year).slice(0, 3);

    return {
      totalMinutes,
      avgRuntime,
      oldestYear,
      newestYear,
      avgYear,
      genreStats,
      topDirectors,
      topActors,
      ratingBuckets,
      runtimeBuckets,
      decadeStats,
      highestRated,
      longest,
      shortest,
      oldest,
      newest,
    };
  }, [movies]);

  if (movies.length === 0 || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <span className="text-6xl mb-4">📊</span>
        <p className="text-lg">No movies to analyze</p>
        <p className="text-sm">Adjust your filters to see stats</p>
      </div>
    );
  }

  const maxRatingCount = Math.max(...stats.ratingBuckets);
  const maxDecadeCount = Math.max(...stats.decadeStats.map(([, c]) => c));

  return (
    <>
      <div className="space-y-6">
        {/* Hero stats */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <TrendingUp size={24} className="text-primary-400" />
            Collection Overview
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <Film className="mx-auto mb-2 text-primary-400" size={32} />
              <p className="text-3xl font-bold">{movies.length}</p>
              <p className="text-sm text-gray-400">Total Movies</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <Clock className="mx-auto mb-2 text-green-400" size={32} />
              <p className="text-3xl font-bold">{formatDuration(stats.totalMinutes)}</p>
              <p className="text-sm text-gray-400">Total Runtime</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <Calendar className="mx-auto mb-2 text-yellow-400" size={32} />
              <p className="text-3xl font-bold">{stats.newestYear - stats.oldestYear}</p>
              <p className="text-sm text-gray-400">Years Spanned</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <Clapperboard className="mx-auto mb-2 text-purple-400" size={32} />
              <p className="text-3xl font-bold">{stats.genreStats.length}</p>
              <p className="text-sm text-gray-400">Genres</p>
            </div>
          </div>
        </div>

        {/* Genre breakdown */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Genre Breakdown</h3>
          <div className="space-y-3">
            {stats.genreStats.slice(0, 10).map(({ genre, count, percentage, color }) => (
              <div key={genre} className="flex items-center gap-3">
                <div className="w-24 text-sm truncate">{genre}</div>
                <div className="flex-1 h-6 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
                <div className="w-16 text-sm text-gray-400 text-right">
                  {count} ({Math.round(percentage)}%)
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Two column layout */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Decade distribution */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">Movies by Decade</h3>
            <div className="flex items-end gap-2 h-40">
              {stats.decadeStats.map(([decade, count]) => (
                <div key={decade} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-primary-500 rounded-t transition-all duration-500"
                    style={{
                      height: `${(count / maxDecadeCount) * 100}%`,
                      minHeight: count > 0 ? '8px' : '0',
                    }}
                  />
                  <span className="text-[10px] text-gray-400 mt-1">{decade}s</span>
                  <span className="text-xs font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rating distribution */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">Rating Distribution</h3>
            <div className="flex items-end gap-1 h-40">
              {stats.ratingBuckets.map((count, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-yellow-500 rounded-t transition-all duration-500"
                    style={{
                      height: `${maxRatingCount > 0 ? (count / maxRatingCount) * 100 : 0}%`,
                      minHeight: count > 0 ? '8px' : '0',
                    }}
                  />
                  <span className="text-[10px] text-gray-400 mt-1">{i + 1}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">Critic Rating (1-10)</p>
          </div>

          {/* Runtime distribution */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">Runtime Distribution</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Short (<90m)', value: stats.runtimeBuckets.short, color: 'bg-green-500' },
                { label: 'Standard (90-120m)', value: stats.runtimeBuckets.standard, color: 'bg-blue-500' },
                { label: 'Long (2-2.5h)', value: stats.runtimeBuckets.long, color: 'bg-purple-500' },
                { label: 'Epic (2.5h+)', value: stats.runtimeBuckets.epic, color: 'bg-red-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-3 h-3 rounded-full ${color}`} />
                    <span className="text-sm">{label}</span>
                  </div>
                  <p className="text-2xl font-bold">{value}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-400 mt-3 text-center">
              Average runtime: <span className="font-medium text-white">{stats.avgRuntime} min</span>
            </p>
          </div>

          {/* Top Directors */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clapperboard size={20} className="text-purple-400" />
              Top Directors
            </h3>
            <div className="space-y-2">
              {stats.topDirectors.slice(0, 5).map(([director, count], i) => (
                <div key={director} className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-500 w-6">{i + 1}</span>
                  <span className="flex-1 truncate">{director}</span>
                  <span className="text-sm text-gray-400">{count} films</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Actors */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users size={20} className="text-pink-400" />
              Top Actors
            </h3>
            <div className="space-y-2">
              {stats.topActors.slice(0, 5).map(([actor, count], i) => (
                <div key={actor} className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-500 w-6">{i + 1}</span>
                  <span className="flex-1 truncate">{actor}</span>
                  <span className="text-sm text-gray-400">{count} films</span>
                </div>
              ))}
            </div>
          </div>

          {/* Highest Rated */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Star size={20} className="text-yellow-400" />
              Highest Rated
            </h3>
            <div className="space-y-3">
              {stats.highestRated.map((movie, i) => (
                <button
                  key={movie.id}
                  onClick={() => setSelectedMovie(movie)}
                  className="w-full flex items-center gap-3 hover:bg-white/5 rounded-lg p-2 -m-2 transition-colors"
                >
                  <span className="text-lg font-bold text-gray-500 w-6">{i + 1}</span>
                  {movie.thumb && (
                    <img
                      src={getImageUrl(movie.thumb)}
                      alt=""
                      className="w-8 h-12 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 text-left truncate">
                    <p className="truncate">{movie.title}</p>
                    <p className="text-xs text-gray-400">{movie.year}</p>
                  </div>
                  <span className="text-sm text-yellow-400 font-medium">
                    {movie.rating.toFixed(1)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Extremes */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Award size={20} className="text-orange-400" />
            Record Holders
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Longest */}
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-2">Longest Movie</p>
              {stats.longest[0] && (
                <button
                  onClick={() => setSelectedMovie(stats.longest[0])}
                  className="w-full text-left hover:bg-white/5 rounded p-1 -m-1"
                >
                  <p className="font-medium truncate">{stats.longest[0].title}</p>
                  <p className="text-sm text-primary-400">{formatDuration(stats.longest[0].duration)}</p>
                </button>
              )}
            </div>
            {/* Shortest */}
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-2">Shortest Movie</p>
              {stats.shortest[0] && (
                <button
                  onClick={() => setSelectedMovie(stats.shortest[0])}
                  className="w-full text-left hover:bg-white/5 rounded p-1 -m-1"
                >
                  <p className="font-medium truncate">{stats.shortest[0].title}</p>
                  <p className="text-sm text-green-400">{formatDuration(stats.shortest[0].duration)}</p>
                </button>
              )}
            </div>
            {/* Oldest */}
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-2">Oldest Movie</p>
              {stats.oldest[0] && (
                <button
                  onClick={() => setSelectedMovie(stats.oldest[0])}
                  className="w-full text-left hover:bg-white/5 rounded p-1 -m-1"
                >
                  <p className="font-medium truncate">{stats.oldest[0].title}</p>
                  <p className="text-sm text-yellow-400">{stats.oldest[0].year}</p>
                </button>
              )}
            </div>
            {/* Newest */}
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-2">Newest Movie</p>
              {stats.newest[0] && (
                <button
                  onClick={() => setSelectedMovie(stats.newest[0])}
                  className="w-full text-left hover:bg-white/5 rounded p-1 -m-1"
                >
                  <p className="font-medium truncate">{stats.newest[0].title}</p>
                  <p className="text-sm text-blue-400">{stats.newest[0].year}</p>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Fun facts */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Fun Facts</h3>
          <div className="grid md:grid-cols-3 gap-4 text-center">
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-3xl mb-1">🍿</p>
              <p className="text-sm text-gray-400">You'd need</p>
              <p className="text-xl font-bold">{Math.ceil(stats.totalMinutes / (24 * 60))} days</p>
              <p className="text-sm text-gray-400">to watch everything</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-3xl mb-1">🎬</p>
              <p className="text-sm text-gray-400">Average movie is from</p>
              <p className="text-xl font-bold">{stats.avgYear}</p>
              <p className="text-sm text-gray-400">{new Date().getFullYear() - stats.avgYear} years ago</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-3xl mb-1">⏱️</p>
              <p className="text-sm text-gray-400">Average runtime</p>
              <p className="text-xl font-bold">{stats.avgRuntime} min</p>
              <p className="text-sm text-gray-400">{formatDuration(stats.avgRuntime)}</p>
            </div>
          </div>
        </div>
      </div>

      {selectedMovie && (
        <MovieModal
          movie={selectedMovie}
          occasion={occasion}
          mood={mood}
          onClose={() => setSelectedMovie(null)}
          plexHeaders={plexHeaders}
          allMovies={allMovies}
        />
      )}
    </>
  );
}
