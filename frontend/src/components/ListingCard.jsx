import { Link } from 'react-router-dom';
import { Eye, Tag } from 'lucide-react';

export default function ListingCard({ listing }) {
  const getRarityColor = (rarity) => {
    const colors = {
      'Consumer Grade': 'bg-gray-500',
      'Industrial Grade': 'bg-blue-500',
      'Mil-Spec Grade': 'bg-blue-600',
      'Restricted': 'bg-purple-500',
      'Classified': 'bg-pink-500',
      'Covert': 'bg-red-500',
      'Contraband': 'bg-orange-500',
    };
    return colors[rarity] || 'bg-gray-500';
  };

  return (
    <Link to={`/listing/${listing._id}`} className="card block group">
      {/* Item Image */}
      <div className="relative aspect-[4/3] bg-dark-700 rounded-lg overflow-hidden mb-4">
        <img
          src={listing.item.iconUrl || listing.imageUrl}
          alt={listing.item.marketName || listing.itemName}
          className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
        />

        {/* Rarity Badge */}
        {listing.item.rarity && (
          <div className={`absolute top-2 left-2 ${getRarityColor(listing.item.rarity)} text-white text-xs px-2 py-1 rounded`}>
            {listing.item.rarity}
          </div>
        )}

        {/* StatTrak Badge */}
        {(listing.item.stattrak || listing.stattrak) && (
          <div className="absolute top-2 right-2 bg-orange-500 text-black text-xs px-2 py-1 rounded font-bold">
            StatTrak™
          </div>
        )}
      </div>

      {/* Item Info */}
      <div className="space-y-2">
        <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary-400 transition-colors">
          {listing.item.marketName || listing.itemName}
        </h3>

        {listing.item.exterior && (
          <p className="text-sm text-dark-400">{listing.item.exterior}</p>
        )}

        {/* Seller Info */}
        <div className="flex items-center justify-between text-sm text-dark-400">
          <span>by {listing.seller.username || listing.sellerName}</span>
          <div className="flex items-center space-x-1">
            <Eye className="w-4 h-4" />
            <span>{listing.views || 0}</span>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between pt-2 border-t border-dark-700">
          <div className="flex items-center space-x-1 text-primary-400">
            <Tag className="w-4 h-4" />
            <span className="text-xl font-bold">${listing.price}</span>
          </div>

          {listing.status !== 'active' && (
            <span className={`text-xs px-2 py-1 rounded ${
              listing.status === 'sold' ? 'bg-green-500/20 text-green-400' :
              listing.status === 'pending_trade' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {listing.status.replace('_', ' ').toUpperCase()}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
