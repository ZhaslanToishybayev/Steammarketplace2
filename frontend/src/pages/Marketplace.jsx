import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Grid, List as ListIcon, BookmarkCheck, Filter as FilterIcon } from 'lucide-react';
import { marketplaceService } from '../services/api';
import { favoritesService } from '../services/favoritesService';
import FilterPanel from '../components/filters/FilterPanel';
import SortDropdown from '../components/filters/SortDropdown';
import ListingCard from '../components/ListingCard';

export default function Marketplace() {
  const [viewMode, setViewMode] = useState('grid');
  const [favorites, setFavorites] = useState(new Set());
  const [sortBy, setSortBy] = useState('price_asc');
  const [filters, setFilters] = useState({
    search: '',
    game: '',
    weapon: '',
    rarity: '',
    exterior: '',
    stattrak: false,
    stickers: '',
    minPrice: '',
    maxPrice: '',
    minFloat: 0,
    maxFloat: 1,
  });

  const queryClient = useQueryClient();

  // Fetch listings with filters and sorting
  const { data, isLoading, error } = useQuery({
    queryKey: ['listings', filters, sortBy],
    queryFn: () => marketplaceService.getListings({ ...filters, sortBy }),
  });

  // Fetch favorites
  const { data: favoritesData } = useQuery({
    queryKey: ['favorites'],
    queryFn: favoritesService.getFavorites,
    onSuccess: (data) => {
      if (data?.favorites) {
        setFavorites(new Set(data.favorites.map(f => f.listingId || f._id)));
      }
    },
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      game: '',
      weapon: '',
      rarity: '',
      exterior: '',
      stattrak: false,
      stickers: '',
      minPrice: '',
      maxPrice: '',
      minFloat: 0,
      maxFloat: 1,
    });
  };

  const handleFavoriteToggle = async (listingId) => {
    try {
      await favoritesService.toggleFavorite(listingId);
      setFavorites(prev => {
        const newFavorites = new Set(prev);
        if (newFavorites.has(listingId)) {
          newFavorites.delete(listingId);
        } else {
          newFavorites.add(listingId);
        }
        return newFavorites;
      });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const hasActiveFilters = () => {
    return (
      filters.search ||
      filters.game ||
      filters.weapon ||
      filters.rarity ||
      filters.exterior ||
      filters.stattrak ||
      filters.stickers ||
      filters.minPrice ||
      filters.maxPrice ||
      filters.minFloat !== 0 ||
      filters.maxFloat !== 1
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Marketplace</h1>
          <p className="text-dark-400">
            Discover and trade CS2, CSGO, Dota 2, and Rust skins
          </p>
        </div>

        <div className="flex items-center gap-2">
          <SortDropdown sortBy={sortBy} onSortChange={setSortBy} />

          <div className="flex items-center border border-dark-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${
                viewMode === 'grid'
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${
                viewMode === 'list'
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
              }`}
            >
              <ListIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <FilterPanel
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      {/* Results */}
      {isLoading && (
        <div className="text-center py-20">
          <div className="inline-flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
            <p className="text-dark-400">Loading marketplace listings...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="card bg-red-500/10 border-red-500 text-center py-12">
          <FilterIcon className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 text-lg font-semibold mb-2">Failed to load listings</p>
          <p className="text-dark-400 text-sm">
            {error.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['listings'] })}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {data && (
        <>
          {/* Stats */}
          <div className="mb-6 flex items-center justify-between">
            <div className="text-dark-300 flex items-center gap-2">
              <span>
                Found <span className="text-primary-400 font-semibold">{data.listings?.length || 0}</span> listings
              </span>
              {hasActiveFilters() && (
                <span className="text-dark-500">•</span>
              )}
              {hasActiveFilters() && (
                <span className="text-dark-400 text-sm">
                  Filtered results
                </span>
              )}
            </div>

            {favorites.size > 0 && (
              <div className="flex items-center gap-2 text-sm text-dark-400">
                <BookmarkCheck className="w-4 h-4" />
                <span>{favorites.size} favorites</span>
              </div>
            )}
          </div>

          {/* Listings */}
          {data.listings && data.listings.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {data.listings.map((listing) => (
                  <ListingCard
                    key={listing._id}
                    listing={listing}
                    onFavoriteToggle={handleFavoriteToggle}
                    isFavorite={favorites.has(listing._id)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {data.listings.map((listing) => (
                  <ListingCard
                    key={listing._id}
                    listing={listing}
                    onFavoriteToggle={handleFavoriteToggle}
                    isFavorite={favorites.has(listing._id)}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-20">
              <FilterIcon className="w-16 h-16 text-dark-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-dark-300 mb-2">No listings found</h3>
              <p className="text-dark-500 mb-6">
                {hasActiveFilters()
                  ? 'Try adjusting your filters or search terms'
                  : 'There are no active listings at the moment'}
              </p>
              {hasActiveFilters() && (
                <button
                  onClick={handleClearFilters}
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
