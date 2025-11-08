import { Link } from 'react-router-dom';
import { Eye, Tag, Star, Heart } from 'lucide-react';
import { useState } from 'react';

export default function ListingCard({ listing, onFavoriteToggle, isFavorite }) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const getRarityColor = (rarity) => {
    const colors = {
      'Consumer Grade': 'bg-gray-500',
      'Industrial Grade': 'bg-blue-500',
      'Mil-Spec Grade': 'bg-blue-600',
      'Restricted': 'bg-purple-500',
      'Classified': 'bg-pink-500',
      'Covert': 'bg-red-500',
      'Contraband': 'bg-orange-500',
      'Covert Knife': 'bg-red-600',
      'Contraband Knife': 'bg-orange-600',
      'Rare Special': 'bg-yellow-500',
    };
    return colors[rarity] || 'bg-gray-500';
  };

  const getFloatColor = (float) => {
    if (float === null || float === undefined) return 'text-dark-400';
    if (float <= 0.07) return 'text-green-400';
    if (float <= 0.15) return 'text-blue-400';
    if (float <= 0.38) return 'text-yellow-400';
    if (float <= 0.70) return 'text-orange-400';
    return 'text-red-400';
  };

  const getExteriorShort = (exterior) => {
    const short = {
      'Factory New': 'FN',
      'Minimal Wear': 'MW',
      'Field-Tested': 'FT',
      'Well-Worn': 'WW',
      'Battle-Scarred': 'BS',
    };
    return short[exterior] || exterior;
  };

  const stickerCount = listing.item?.stickers?.length || listing.stickers?.length || 0;
  const floatValue = listing.item?.float || listing.float || null;
  const exterior = listing.item?.exterior || listing.exterior || '';
  const isStatTrak = listing.item?.stattrak || listing.stattrak || false;

  return (
    <div className="card group hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
      <Link to={`/listing/${listing._id}`} className="block">
        {/* Item Image */}
        <div className="relative aspect-[4/3] bg-dark-700 rounded-lg overflow-hidden mb-4">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          )}
          <img
            src={listing.item.iconUrl || listing.imageUrl}
            alt={listing.item.marketName || listing.itemName}
            className={`w-full h-full object-contain group-hover:scale-110 transition-transform duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              e.target.src = '/images/image_placeholder.png';
              setImageLoaded(true);
            }}
          />

          {/* Top badges */}
          <div className="absolute top-2 left-2 flex gap-2">
            {/* Rarity Badge */}
            {listing.item.rarity && (
              <div className={`${getRarityColor(listing.item.rarity)} text-white text-xs px-2 py-1 rounded font-medium`}>
                {listing.item.rarity}
              </div>
            )}

            {/* Exterior Badge */}
            {exterior && (
              <div className="bg-dark-800 text-dark-300 text-xs px-2 py-1 rounded font-medium">
                {getExteriorShort(exterior)}
              </div>
            )}
          </div>

          <div className="absolute top-2 right-2 flex flex-col gap-2">
            {/* StatTrak Badge */}
            {isStatTrak && (
              <div className="bg-orange-500 text-black text-xs px-2 py-1 rounded font-bold">
                StatTrak™
              </div>
            )}

            {/* Sticker Count */}
            {stickerCount > 0 && (
              <div className="bg-primary-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                <Star className="w-3 h-3" />
                <span>{stickerCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Item Info */}
        <div className="space-y-2">
          <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary-400 transition-colors">
            {listing.item.marketName || listing.itemName}
          </h3>

          {/* Float and Condition */}
          {floatValue !== null && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-dark-400">Float:</span>
              <span className={`text-sm font-medium ${getFloatColor(floatValue)}`}>
                {floatValue.toFixed(4)}
              </span>
              {exterior && (
                <span className="text-xs text-dark-500">({exterior})</span>
              )}
            </div>
          )}

          {/* Seller Info */}
          <div className="flex items-center justify-between text-sm text-dark-400">
            <span>by {listing.seller?.username || listing.sellerName || 'Unknown'}</span>
            <div className="flex items-center space-x-1">
              <Eye className="w-4 h-4" />
              <span>{listing.views || 0}</span>
            </div>
          </div>

          {/* Price and Status */}
          <div className="flex items-center justify-between pt-2 border-t border-dark-700">
            <div className="flex items-center space-x-1 text-primary-400">
              <Tag className="w-4 h-4" />
              <span className="text-xl font-bold">
                ${typeof listing.price === 'number' ? listing.price.toFixed(2) : listing.price}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {listing.status !== 'active' && (
                <span className={`text-xs px-2 py-1 rounded ${
                  listing.status === 'sold' ? 'bg-green-500/20 text-green-400' :
                  listing.status === 'pending_trade' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {listing.status.replace('_', ' ').toUpperCase()}
                </span>
              )}

              {/* Favorite Button */}
              {onFavoriteToggle && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onFavoriteToggle(listing._id);
                  }}
                  className="p-1 hover:bg-dark-700 rounded transition-colors"
                >
                  <Heart
                    className={`w-5 h-5 ${
                      isFavorite ? 'fill-red-500 text-red-500' : 'text-dark-400'
                    }`}
                  />
                </button>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
