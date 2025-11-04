import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Grid, List as ListIcon } from 'lucide-react';
import { marketplaceService } from '../services/api';
import ListingCard from '../components/ListingCard';

export default function Marketplace() {
  const [viewMode, setViewMode] = useState('grid');
  const [filters, setFilters] = useState({
    search: '',
    weapon: '',
    rarity: '',
    minPrice: '',
    maxPrice: '',
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['listings', filters],
    queryFn: () => marketplaceService.getListings(filters),
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">Marketplace</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg ${
              viewMode === 'grid' ? 'bg-primary-600 text-white' : 'bg-dark-700 text-dark-300'
            }`}
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg ${
              viewMode === 'list' ? 'bg-primary-600 text-white' : 'bg-dark-700 text-dark-300'
            }`}
          >
            <ListIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-primary-400" />
          <h2 className="text-lg font-semibold">Filters</h2>
        </div>

        <div className="grid md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Search skins..."
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white w-full"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>

          {/* Weapon Filter */}
          <select
            className="input"
            value={filters.weapon}
            onChange={(e) => handleFilterChange('weapon', e.target.value)}
          >
            <option value="">All Weapons</option>
            <option value="AK-47">AK-47</option>
            <option value="AWP">AWP</option>
            <option value="M4A4">M4A4</option>
            <option value="M4A1-S">M4A1-S</option>
            <option value="USP-S">USP-S</option>
            <option value="Glock">Glock</option>
            <option value="Pistols">Pistols</option>
          </select>

          {/* Rarity Filter */}
          <select
            className="input"
            value={filters.rarity}
            onChange={(e) => handleFilterChange('rarity', e.target.value)}
          >
            <option value="">All Rarities</option>
            <option value="Consumer Grade">Consumer Grade</option>
            <option value="Industrial Grade">Industrial Grade</option>
            <option value="Mil-Spec Grade">Mil-Spec Grade</option>
            <option value="Restricted">Restricted</option>
            <option value="Classified">Classified</option>
            <option value="Covert">Covert</option>
          </select>

          {/* Min Price */}
          <input
            type="number"
            placeholder="Min Price"
            className="input"
            value={filters.minPrice}
            onChange={(e) => handleFilterChange('minPrice', e.target.value)}
          />

          {/* Max Price */}
          <input
            type="number"
            placeholder="Max Price"
            className="input"
            value={filters.maxPrice}
            onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
          />
        </div>
      </div>

      {/* Results */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      )}

      {error && (
        <div className="card bg-red-500/10 border-red-500 text-center py-12">
          <p className="text-red-400">Failed to load listings</p>
        </div>
      )}

      {data && (
        <>
          {/* Stats */}
          <div className="mb-6 text-dark-300">
            Found {data.listings?.length || 0} listings
          </div>

          {/* Listings Grid */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {data.listings?.map((listing) => (
                <ListingCard key={listing._id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {data.listings?.map((listing) => (
                <ListingCard key={listing._id} listing={listing} />
              ))}
            </div>
          )}

          {!data.listings?.length && (
            <div className="text-center py-12">
              <p className="text-dark-400 text-lg">No listings found</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
