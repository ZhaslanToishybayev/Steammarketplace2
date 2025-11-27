'use client';

import { useState } from 'react';
import { useSearchListings, useGetFeaturedListings, usePurchaseListing } from '@/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  DollarSign,
  Filter,
  Star,
  Clock,
  User,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

export function MarketplacePage() {
  const [activeTab, setActiveTab] = useState('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [appId, setAppId] = useState(730);

  // Browse listings
  const { data: browseData, isLoading: isBrowseLoading } = useSearchListings({
    appId,
    query: searchQuery,
    minPrice: minPrice ? parseFloat(minPrice) : undefined,
    maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
    limit: 50,
    offset: 0,
    sortBy: 'price',
    sortOrder: 'DESC'
  });

  // Featured listings
  const { data: featuredData, isLoading: isFeaturedLoading } = useGetFeaturedListings(10);

  const { mutate: purchaseListing, isPending: isPurchasing } = usePurchaseListing();

  const listings = browseData?.data?.listings || [];
  const featuredListings = featuredData?.data?.listings || [];

  const handlePurchase = (listingId: string) => {
    if (confirm('Are you sure you want to purchase this item?')) {
      purchaseListing(listingId);
    }
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  const formatTimeLeft = (expiresAt: string) => {
    const now = new Date();
    const expireDate = new Date(expiresAt);
    const diffMs = expireDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ${diffHours % 24}h left`;
    } else if (diffHours > 0) {
      return `${diffHours}h left`;
    } else {
      return 'Expires soon';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Steam Marketplace</h1>
        <p className="text-gray-500">Buy, sell, and trade Steam items</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="featured">Featured</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="mt-6">
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Search Items</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="search"
                    placeholder="Search for items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="app">Game</Label>
                <select
                  id="app"
                  value={appId}
                  onChange={(e) => setAppId(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={730}>CS2</option>
                  <option value={570}>Dota 2</option>
                  <option value={440}>Team Fortress 2</option>
                  <option value={252490}>Rust</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div>
                <Label htmlFor="minPrice">Min Price</Label>
                <Input
                  id="minPrice"
                  type="number"
                  placeholder="0.00"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <Label htmlFor="maxPrice">Max Price</Label>
                <Input
                  id="maxPrice"
                  type="number"
                  placeholder="1000.00"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {isBrowseLoading ? (
              Array.from({ length: 8 }).map((_, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardHeader className="p-0">
                    <Skeleton className="w-full h-32 bg-gray-200" />
                  </CardHeader>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2 mb-4" />
                    <Skeleton className="h-8 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : listings.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 text-lg">No listings found.</p>
              </div>
            ) : (
              listings.map((listing: any) => (
                <Card key={listing.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader className="p-0 bg-gray-100">
                    <div className="aspect-square flex items-center justify-center p-4">
                      <Avatar className="w-24 h-24">
                        <AvatarImage
                          src={`https://community.akamai.steamstatic.com/economy/image/${listing.inventoryItem.iconUrl}/128fx128f`}
                          alt={listing.inventoryItem.marketName}
                        />
                        <AvatarFallback>{listing.inventoryItem.marketName.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg line-clamp-2 flex-1">
                        {listing.inventoryItem.marketName}
                      </h3>
                      {listing.featured && (
                        <Star className="w-4 h-4 text-yellow-500 ml-2 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-3">{listing.inventoryItem.marketHashName}</p>

                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Price:</span>
                        <span className="font-semibold">{formatPrice(listing.price)}</span>
                      </div>
                      {listing.currentBid && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Current Bid:</span>
                          <span className="font-semibold text-blue-500">{formatPrice(listing.currentBid)}</span>
                        </div>
                      )}
                      {listing.serviceFeeAmount && (
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>Service Fee:</span>
                          <span>-${listing.serviceFeeAmount.toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      {listing.type === 'fixed_price' && (
                        <Badge variant="default">Fixed Price</Badge>
                      )}
                      {listing.type === 'auction' && (
                        <Badge variant="secondary">Auction</Badge>
                      )}
                      {listing.verified && <Badge variant="outline">Verified</Badge>}
                    </div>

                    {listing.expiresAt && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                        <Clock className="w-3 h-3" />
                        <span>{formatTimeLeft(listing.expiresAt)}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <User className="w-3 h-3" />
                        <span>{listing.seller.username}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Eye className="w-3 h-3" />
                        <span>{listing.viewCount}</span>
                      </div>
                      {listing.bidCount > 0 && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <TrendingUp className="w-3 h-3" />
                          <span>{listing.bidCount} bids</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {listing.type === 'fixed_price' ? (
                        <Button
                          onClick={() => handlePurchase(listing.listingId)}
                          disabled={isPurchasing}
                          className="w-full"
                        >
                          <DollarSign className="w-4 h-4 mr-2" />
                          {isPurchasing ? 'Purchasing...' : 'Buy Now'}
                        </Button>
                      ) : (
                        <Button variant="outline" className="w-full">
                          <TrendingUp className="w-4 h-4 mr-2" />
                          Place Bid
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="featured" className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {isFeaturedLoading ? (
              Array.from({ length: 8 }).map((_, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardHeader className="p-0">
                    <Skeleton className="w-full h-32 bg-gray-200" />
                  </CardHeader>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2 mb-4" />
                    <Skeleton className="h-8 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : featuredListings.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 text-lg">No featured listings available.</p>
              </div>
            ) : (
              featuredListings.map((listing: any) => (
                <Card key={listing.id} className="overflow-hidden hover:shadow-lg transition-shadow border-2 border-yellow-200">
                  <div className="absolute top-2 right-2 z-10">
                    <Badge variant="default" className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      Featured
                    </Badge>
                  </div>
                  <CardHeader className="p-0 bg-gray-100">
                    <div className="aspect-square flex items-center justify-center p-4">
                      <Avatar className="w-24 h-24">
                        <AvatarImage
                          src={`https://community.akamai.steamstatic.com/economy/image/${listing.inventoryItem.iconUrl}/128fx128f`}
                          alt={listing.inventoryItem.marketName}
                        />
                        <AvatarFallback>{listing.inventoryItem.marketName.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                      {listing.inventoryItem.marketName}
                    </h3>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-500">Price:</span>
                      <span className="font-semibold">{formatPrice(listing.price)}</span>
                    </div>
                    <Button className="w-full bg-yellow-500 hover:bg-yellow-600">
                      <Star className="w-4 h-4 mr-2" />
                      View Featured Item
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="search" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Search</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Advanced search functionality coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}