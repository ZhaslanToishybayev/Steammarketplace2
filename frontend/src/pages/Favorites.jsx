import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookmarkCheck, Heart, Trash2 } from 'lucide-react';
import { favoritesService } from '../services/favoritesService';
import { marketplaceService } from '../services/api';
import ListingCard from '../components/ListingCard';
import { Link } from 'react-router-dom';

export default function Favorites() {
  const [viewMode, setViewMode] = useState('grid');
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['favorites'],
    queryFn: favoritesService.getFavorites,
  });

  const handleRemoveFavorite = async (listingId) => {
    try {
      await favoritesService.removeFromFavorites(listingId);
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const handleClearAllFavorites = async () => {
    if (window.confirm('Are you sure you want to remove all favorites?')) {
      try {
        const favoriteIds = data.favorites.map(f => f.listingId || f._id);
        await Promise.all(
          favoriteIds.map(id => favoritesService.removeFromFavorites(id))
        );
        queryClient.invalidateQueries({ queryKey: ['favorites'] });
      } catch (error) {
        console.error('Error clearing favorites:', error);
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Heart className="w-8 h-8 text-red-500 fill-red-500" />
            <h1 className="text-4xl font-bold">My Favorites</h1>
          </div>
          <p className="text-dark-400">
            Your collection of favorite items
          </p>
        </div>

        {data?.favorites?.length > 0 && (
          <button
            onClick={handleClearAllFavorites}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-20">
          <div className="inline-flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
            <p className="text-dark-400">Loading your favorites...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="card bg-red-500/10 border-red-500 text-center py-12">
          <Heart className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 text-lg font-semibold mb-2">Failed to load favorites</p>
          <p className="text-dark-400 text-sm">
            {error.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['favorites'] })}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {data && (!data.favorites || data.favorites.length === 0) && (
        <div className="text-center py-20">
          <BookmarkCheck className="w-20 h-20 text-dark-600 mx-auto mb-6" />
          <h3 className="text-2xl font-semibold text-dark-300 mb-3">No favorites yet</h3>
          <p className="text-dark-500 mb-8 max-w-md mx-auto">
            Start exploring the marketplace and add items to your favorites by clicking the heart icon
          </p>
          <Link
            to="/marketplace"
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Browse Marketplace
          </Link>
        </div>
      )}

      {/* Favorites List */}
      {data && data.favorites && data.favorites.length > 0 && (
        <>
          {/* Stats */}
          <div className="mb-6 flex items-center justify-between">
            <div className="text-dark-300">
              You have <span className="text-red-400 font-semibold">{data.favorites.length}</span> favorite items
            </div>
          </div>

          {/* Grid/List Toggle */}
          <div className="flex justify-end mb-6">
            <div className="flex items-center border border-dark-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${
                  viewMode === 'grid'
                    ? 'bg-primary-600 text-white'
                    : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                }`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${
                  viewMode === 'list'
                    ? 'bg-primary-600 text-white'
                    : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                }`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          {/* Listings */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {data.favorites.map((favorite) => (
                <div key={favorite._id || favorite.listingId} className="relative">
                  <ListingCard
                    listing={favorite.listing || favorite}
                    isFavorite={true}
                    onFavoriteToggle={handleRemoveFavorite}
                  />
                  <button
                    onClick={() => handleRemoveFavorite(favorite.listingId || favorite._id)}
                    className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors z-10"
                    title="Remove from favorites"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {data.favorites.map((favorite) => (
                <div key={favorite._id || favorite.listingId} className="relative">
                  <ListingCard
                    listing={favorite.listing || favorite}
                    isFavorite={true}
                    onFavoriteToggle={handleRemoveFavorite}
                  />
                  <button
                    onClick={() => handleRemoveFavorite(favorite.listingId || favorite._id)}
                    className="absolute top-4 right-4 p-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors z-10"
                    title="Remove from favorites"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
