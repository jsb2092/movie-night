import { useState, useMemo } from 'react';
import { Users, Clapperboard, Film, ArrowRight, X, Search } from 'lucide-react';
import { MovieModal } from './MovieModal';
import { useImageUrl } from '../contexts/ImageContext';
import type { Movie, Occasion, Mood } from '../types';

interface ConnectionsProps {
  movies: Movie[];
  occasion: Occasion | null;
  mood: Mood | null;
  plexHeaders?: Record<string, string>;
  allMovies?: Movie[];
}

type PersonType = 'actor' | 'director';

interface Person {
  name: string;
  type: PersonType;
  movieIds: string[];
  movieCount: number;
}

interface Connection {
  movie: Movie;
  sharedPeople: { name: string; type: PersonType }[];
}

export function Connections({ movies, occasion, mood, plexHeaders, allMovies }: ConnectionsProps) {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [viewingMovie, setViewingMovie] = useState<Movie | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'actors' | 'directors'>('all');
  const getImageUrl = useImageUrl();

  // Build people index
  const peopleIndex = useMemo(() => {
    const people = new Map<string, Person>();

    movies.forEach((movie) => {
      movie.actors.forEach((actor) => {
        const key = `actor:${actor}`;
        if (!people.has(key)) {
          people.set(key, { name: actor, type: 'actor', movieIds: [], movieCount: 0 });
        }
        const person = people.get(key)!;
        person.movieIds.push(movie.id);
        person.movieCount++;
      });

      movie.directors.forEach((director) => {
        const key = `director:${director}`;
        if (!people.has(key)) {
          people.set(key, { name: director, type: 'director', movieIds: [], movieCount: 0 });
        }
        const person = people.get(key)!;
        person.movieIds.push(movie.id);
        person.movieCount++;
      });
    });

    return people;
  }, [movies]);

  // Get top people (those in multiple movies)
  const topPeople = useMemo(() => {
    return Array.from(peopleIndex.values())
      .filter((p) => p.movieCount >= 2)
      .filter((p) => {
        if (filterType === 'actors') return p.type === 'actor';
        if (filterType === 'directors') return p.type === 'director';
        return true;
      })
      .filter((p) => {
        if (!searchQuery) return true;
        return p.name.toLowerCase().includes(searchQuery.toLowerCase());
      })
      .sort((a, b) => b.movieCount - a.movieCount);
  }, [peopleIndex, filterType, searchQuery]);

  // Get movies for selected person
  const personMovies = useMemo(() => {
    if (!selectedPerson) return [];
    return selectedPerson.movieIds
      .map((id) => movies.find((m) => m.id === id))
      .filter((m): m is Movie => m !== undefined);
  }, [selectedPerson, movies]);

  // Get connections for selected movie
  const movieConnections = useMemo(() => {
    if (!selectedMovie) return [];

    const connections: Connection[] = [];
    const seen = new Set<string>();

    movies.forEach((otherMovie) => {
      if (otherMovie.id === selectedMovie.id || seen.has(otherMovie.id)) return;

      const sharedPeople: { name: string; type: PersonType }[] = [];

      // Check shared actors
      selectedMovie.actors.forEach((actor) => {
        if (otherMovie.actors.includes(actor)) {
          sharedPeople.push({ name: actor, type: 'actor' });
        }
      });

      // Check shared directors
      selectedMovie.directors.forEach((director) => {
        if (otherMovie.directors.includes(director)) {
          sharedPeople.push({ name: director, type: 'director' });
        }
      });

      if (sharedPeople.length > 0) {
        connections.push({ movie: otherMovie, sharedPeople });
        seen.add(otherMovie.id);
      }
    });

    // Sort by number of shared people
    return connections.sort((a, b) => b.sharedPeople.length - a.sharedPeople.length);
  }, [selectedMovie, movies]);

  // Find movies with most connections
  const mostConnected = useMemo(() => {
    const connectionCounts = movies.map((movie) => {
      let connections = 0;
      const seen = new Set<string>();

      movies.forEach((other) => {
        if (other.id === movie.id || seen.has(other.id)) return;

        const hasConnection =
          movie.actors.some((a) => other.actors.includes(a)) ||
          movie.directors.some((d) => other.directors.includes(d));

        if (hasConnection) {
          connections++;
          seen.add(other.id);
        }
      });

      return { movie, connections };
    });

    return connectionCounts
      .filter((c) => c.connections > 0)
      .sort((a, b) => b.connections - a.connections)
      .slice(0, 10);
  }, [movies]);

  if (movies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <span className="text-6xl mb-4">🕸️</span>
        <p className="text-lg">No movies to explore</p>
        <p className="text-sm">Adjust your filters to see connections</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-2">Connection Explorer</h2>
          <p className="text-gray-400 text-sm">
            Discover how your movies are connected through shared actors and directors
          </p>
        </div>

        {/* Mode selection */}
        {!selectedMovie && !selectedPerson && (
          <>
            {/* Most Connected Movies */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Film size={20} className="text-primary-400" />
                Most Connected Movies
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Movies that share the most actors/directors with others in your library
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {mostConnected.slice(0, 10).map(({ movie, connections }) => (
                  <button
                    key={movie.id}
                    onClick={() => setSelectedMovie(movie)}
                    className="group text-left"
                  >
                    <div className="relative">
                      {movie.thumb && (
                        <img
                          src={getImageUrl(movie.thumb)}
                          alt={movie.title}
                          className="w-full aspect-[2/3] object-cover rounded-lg group-hover:ring-2 ring-primary-400 transition-all"
                        />
                      )}
                      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded-full text-xs font-medium">
                        {connections} links
                      </div>
                    </div>
                    <p className="mt-2 text-sm font-medium truncate">{movie.title}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* People Browser */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users size={20} className="text-pink-400" />
                People in Multiple Movies
              </h3>

              {/* Search and filter */}
              <div className="flex gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    type="text"
                    placeholder="Search people..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div className="flex gap-1 bg-white/5 rounded-lg p-1">
                  {(['all', 'actors', 'directors'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-3 py-1 rounded text-sm capitalize transition-colors ${
                        filterType === type
                          ? 'bg-primary-600 text-white'
                          : 'hover:bg-white/10'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* People list */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto">
                {topPeople.slice(0, 40).map((person) => (
                  <button
                    key={`${person.type}:${person.name}`}
                    onClick={() => setSelectedPerson(person)}
                    className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-left"
                  >
                    <div className={`p-2 rounded-full ${
                      person.type === 'director' ? 'bg-purple-500/20' : 'bg-pink-500/20'
                    }`}>
                      {person.type === 'director' ? (
                        <Clapperboard size={16} className="text-purple-400" />
                      ) : (
                        <Users size={16} className="text-pink-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{person.name}</p>
                      <p className="text-xs text-gray-400">{person.movieCount} movies</p>
                    </div>
                  </button>
                ))}
              </div>
              {topPeople.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  No people found matching your search
                </p>
              )}
            </div>
          </>
        )}

        {/* Selected Person View */}
        {selectedPerson && (
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${
                  selectedPerson.type === 'director' ? 'bg-purple-500/20' : 'bg-pink-500/20'
                }`}>
                  {selectedPerson.type === 'director' ? (
                    <Clapperboard size={24} className="text-purple-400" />
                  ) : (
                    <Users size={24} className="text-pink-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{selectedPerson.name}</h3>
                  <p className="text-sm text-gray-400 capitalize">
                    {selectedPerson.type} • {selectedPerson.movieCount} movies
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPerson(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {personMovies.map((movie) => (
                <button
                  key={movie.id}
                  onClick={() => setSelectedMovie(movie)}
                  className="group text-left"
                >
                  {movie.thumb && (
                    <img
                      src={getImageUrl(movie.thumb)}
                      alt={movie.title}
                      className="w-full aspect-[2/3] object-cover rounded-lg group-hover:ring-2 ring-primary-400 transition-all"
                    />
                  )}
                  <p className="mt-2 text-sm font-medium truncate">{movie.title}</p>
                  <p className="text-xs text-gray-400">{movie.year}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Movie Connections View */}
        {selectedMovie && (
          <div className="glass rounded-2xl p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex gap-4">
                {selectedMovie.thumb && (
                  <img
                    src={getImageUrl(selectedMovie.thumb)}
                    alt={selectedMovie.title}
                    className="w-24 h-36 object-cover rounded-lg"
                  />
                )}
                <div>
                  <h3 className="text-xl font-semibold">{selectedMovie.title}</h3>
                  <p className="text-sm text-gray-400 mb-2">{selectedMovie.year}</p>
                  <button
                    onClick={() => setViewingMovie(selectedMovie)}
                    className="text-sm text-primary-400 hover:text-primary-300"
                  >
                    View details →
                  </button>
                </div>
              </div>
              <button
                onClick={() => setSelectedMovie(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Cast & Crew */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-400 mb-2">Cast & Crew</h4>
              <div className="flex flex-wrap gap-2">
                {selectedMovie.directors.map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      const person = peopleIndex.get(`director:${d}`);
                      if (person) {
                        setSelectedMovie(null);
                        setSelectedPerson(person);
                      }
                    }}
                    className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 rounded-full text-sm flex items-center gap-1.5 transition-colors"
                  >
                    <Clapperboard size={14} className="text-purple-400" />
                    {d}
                  </button>
                ))}
                {selectedMovie.actors.slice(0, 6).map((a) => (
                  <button
                    key={a}
                    onClick={() => {
                      const person = peopleIndex.get(`actor:${a}`);
                      if (person) {
                        setSelectedMovie(null);
                        setSelectedPerson(person);
                      }
                    }}
                    className="px-3 py-1.5 bg-pink-500/20 hover:bg-pink-500/30 rounded-full text-sm flex items-center gap-1.5 transition-colors"
                  >
                    <Users size={14} className="text-pink-400" />
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Connections */}
            <h4 className="text-lg font-medium mb-4">
              Connected Movies ({movieConnections.length})
            </h4>

            {movieConnections.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No connections found in your library
              </p>
            ) : (
              <div className="space-y-3">
                {movieConnections.map(({ movie, sharedPeople }) => (
                  <button
                    key={movie.id}
                    onClick={() => setSelectedMovie(movie)}
                    className="w-full flex items-center gap-4 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                  >
                    {movie.thumb && (
                      <img
                        src={getImageUrl(movie.thumb)}
                        alt=""
                        className="w-12 h-18 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 text-left">
                      <p className="font-medium">{movie.title}</p>
                      <p className="text-xs text-gray-400">{movie.year}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {sharedPeople.map((p) => (
                          <span
                            key={`${p.type}:${p.name}`}
                            className={`text-[10px] px-2 py-0.5 rounded-full ${
                              p.type === 'director'
                                ? 'bg-purple-500/20 text-purple-300'
                                : 'bg-pink-500/20 text-pink-300'
                            }`}
                          >
                            {p.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ArrowRight size={18} className="text-gray-500" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {viewingMovie && (
        <MovieModal
          movie={viewingMovie}
          occasion={occasion}
          mood={mood}
          onClose={() => setViewingMovie(null)}
          plexHeaders={plexHeaders}
          allMovies={allMovies}
        />
      )}
    </>
  );
}
