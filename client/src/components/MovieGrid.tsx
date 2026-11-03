import { useState, useRef, useEffect, useCallback, CSSProperties } from 'react';
import { Grid, type GridImperativeAPI } from 'react-window';
import { MovieCard } from './MovieCard';
import { MovieModal } from './MovieModal';
import type { Movie, Occasion, Mood } from '../types';

interface MovieGridProps {
  movies: Movie[];
  occasion: Occasion | null;
  mood: Mood | null;
  plexHeaders?: Record<string, string>;
  allMovies?: Movie[];
}

// Breakpoints matching Tailwind's defaults
const getColumnCount = (width: number): number => {
  if (width >= 1280) return 5; // xl
  if (width >= 1024) return 4; // lg
  if (width >= 768) return 4;  // md
  if (width >= 640) return 3;  // sm
  return 2;                     // default
};

const GAP = 16; // gap-4 = 16px
const CARD_INFO_HEIGHT = 68; // Height of info section below poster

interface CellProps {
  movies: Movie[];
  columnCount: number;
  columnWidth: number;
  onSelectMovie: (movie: Movie) => void;
}

function Cell({
  columnIndex,
  rowIndex,
  style,
  movies,
  columnCount,
  columnWidth,
  onSelectMovie
}: {
  ariaAttributes: { "aria-colindex": number; role: "gridcell" };
  columnIndex: number;
  rowIndex: number;
  style: CSSProperties;
} & CellProps) {
  const movieIndex = rowIndex * columnCount + columnIndex;
  const movie = movies[movieIndex];

  if (!movie) return <div style={style} />;

  // react-window positions each cell at columnIndex * (columnWidth + GAP),
  // so the gap is already included in style.left. Just shrink the cell so the
  // trailing GAP becomes visible spacing.
  const adjustedStyle: CSSProperties = {
    ...style,
    width: columnWidth,
    height: Number(style.height) - GAP,
  };

  return (
    <div style={adjustedStyle}>
      <MovieCard
        movie={movie}
        onClick={() => onSelectMovie(movie)}
      />
    </div>
  );
}

export function MovieGrid({ movies, occasion, mood, plexHeaders, allMovies }: MovieGridProps) {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  // The grid's scroll container can be narrower than its parent when a
  // vertical scrollbar takes up space, so size columns from its clientWidth.
  const [gridApi, setGridApi] = useState<GridImperativeAPI | null>(null);
  const [gridWidth, setGridWidth] = useState(0);

  const handleSelectMovie = useCallback((movie: Movie) => {
    setSelectedMovie(movie);
  }, []);

  // Measure container and update on resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const rect = container.getBoundingClientRect();
      setDimensions({ width: rect.width, height: window.innerHeight - rect.top - 32 });
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);
    window.addEventListener('resize', updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  useEffect(() => {
    const el = gridApi?.element;
    if (!el) return;

    const updateWidth = () => setGridWidth(el.clientWidth);
    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, [gridApi]);

  const availableWidth = gridWidth || dimensions.width;
  const columnCount = getColumnCount(availableWidth);
  const rowCount = Math.ceil(movies.length / columnCount);

  // Calculate cell dimensions
  const totalGapWidth = GAP * (columnCount - 1);
  const columnWidth = Math.floor((availableWidth - totalGapWidth) / columnCount);
  const posterHeight = Math.floor(columnWidth * 1.5); // 2:3 aspect ratio
  const rowHeight = posterHeight + CARD_INFO_HEIGHT + GAP;

  if (movies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <span className="text-6xl mb-4">🎬</span>
        <p className="text-lg">No movies match your filters</p>
        <p className="text-sm">Try adjusting your criteria</p>
      </div>
    );
  }

  return (
    <>
      <div ref={containerRef} className="w-full" style={{ minHeight: '400px' }}>
        {dimensions.width > 0 && dimensions.height > 0 && (
          <Grid
            gridRef={setGridApi}
            cellComponent={Cell}
            cellProps={{
              movies,
              columnCount,
              columnWidth,
              onSelectMovie: handleSelectMovie,
            }}
            columnCount={columnCount}
            columnWidth={columnWidth + GAP}
            rowCount={rowCount}
            rowHeight={rowHeight}
            style={{ height: dimensions.height, width: '100%', overflowX: 'hidden' }}
          />
        )}
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
