import { Wine, Coffee, Utensils, Loader2 } from 'lucide-react';
import type { MoviePairings } from '../types';

interface PairingCardProps {
  pairings: MoviePairings | null;
  loading: boolean;
  error: string | null;
}

export function PairingCard({ pairings, loading, error }: PairingCardProps) {
  if (loading) {
    return (
      <div className="glass rounded-xl p-6 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-400 mr-2" size={20} />
        <span className="text-gray-400">Generating perfect pairings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass rounded-xl p-6 text-center text-gray-400">
        <p>Couldn't generate pairings</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!pairings) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Drinks */}
      <div className="glass rounded-xl p-5">
        <h4 className="font-medium mb-4 flex items-center gap-2">
          <Wine size={18} className="text-primary-400" />
          Drink Pairings
        </h4>
        <div className="space-y-4">
          {pairings.drinks.map((drink, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg ${
                drink.type === 'alcoholic'
                  ? 'bg-amber-500/10 border border-amber-500/20'
                  : 'bg-blue-500/10 border border-blue-500/20'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {drink.type === 'alcoholic' ? (
                  <Wine size={14} className="text-amber-400" />
                ) : (
                  <Coffee size={14} className="text-blue-400" />
                )}
                <h5 className="font-medium">{drink.name}</h5>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    drink.type === 'alcoholic'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-blue-500/20 text-blue-300'
                  }`}
                >
                  {drink.type === 'alcoholic' ? 'Cocktail' : 'Mocktail'}
                </span>
              </div>
              <p className="text-sm text-gray-400 italic mb-3">{drink.vibe}</p>
              <div className="text-sm">
                <p className="text-gray-300 mb-1">
                  <span className="text-gray-500">Ingredients:</span>{' '}
                  {drink.ingredients.join(', ')}
                </p>
                <p className="text-gray-400">{drink.instructions}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Food */}
      <div className="glass rounded-xl p-5">
        <h4 className="font-medium mb-4 flex items-center gap-2">
          <Utensils size={18} className="text-primary-400" />
          Snack Pairings
        </h4>
        <div className="space-y-3">
          {pairings.food.map((food, idx) => (
            <div key={idx} className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <h5 className="font-medium">{food.name}</h5>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    food.difficulty === 'easy'
                      ? 'bg-green-500/20 text-green-300'
                      : food.difficulty === 'medium'
                      ? 'bg-yellow-500/20 text-yellow-300'
                      : 'bg-purple-500/20 text-purple-300'
                  }`}
                >
                  {food.difficulty}
                </span>
              </div>
              <p className="text-sm text-gray-400">{food.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
