'use client';

import { useState, useEffect } from 'react';
import { useGetUserInventoryItems, useSyncInventory, useUpdateItemPrices } from '@/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  RefreshCw,
  DollarSign,
  Tag,
  Eye,
  ExternalLink,
  Search,
  Filter
} from 'lucide-react';

interface InventoryItem {
  id: number;
  marketName: string;
  marketHashName: string;
  iconUrl: string;
  steamPrice?: number;
  suggestedPrice?: number;
  tradable: boolean;
  marketable: boolean;
  active: boolean;
  appId: number;
}

export function InventoryPage() {
  const [appId, setAppId] = useState(730); // CS2 by default
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');

  const { data, isLoading, error } = useGetUserInventoryItems(appId);
  const { mutate: syncInventory, isPending: isSyncing } = useSyncInventory();
  const { mutate: updatePrices, isPending: isUpdatingPrices } = useUpdateItemPrices();

  const inventoryItems = data?.data?.items || [];
  const totalValue = data?.data?.value?.totalValue || 0;

  // Filter and sort items
  const filteredAndSortedItems = inventoryItems
    .filter(item =>
      item.marketName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.marketHashName.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.marketName.localeCompare(b.marketName);
        case 'price':
          return (b.steamPrice || 0) - (a.steamPrice || 0);
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

  const handleSyncInventory = () => {
    syncInventory({ appId });
  };

  const handleUpdatePrices = () => {
    updatePrices();
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-500 mb-4">Error loading inventory: {error.message}</p>
            <Button onClick={handleSyncInventory} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">My Inventory</h1>
          <div className="flex gap-2">
            <Button
              onClick={handleUpdatePrices}
              disabled={isUpdatingPrices}
              variant="outline"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              {isUpdatingPrices ? 'Updating...' : 'Update Prices'}
            </Button>
            <Button
              onClick={handleSyncInventory}
              disabled={isSyncing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Inventory'}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-500">Total Items</p>
                <p className="text-2xl font-bold">{inventoryItems.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Value</p>
                <p className="text-2xl font-bold text-green-500">
                  ${totalValue.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">App</p>
                <p className="text-2xl font-bold">
                  {appId === 730 ? 'CS2' : appId === 570 ? 'Dota 2' : `App ${appId}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={appId}
            onChange={(e) => setAppId(Number(e.target.value))}
            className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={730}>CS2 (Counter-Strike 2)</option>
            <option value={570}>Dota 2</option>
            <option value={440}>Team Fortress 2</option>
            <option value={252490}>Rust</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">Sort by Name</option>
            <option value="price">Sort by Price</option>
            <option value="date">Sort by Date</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="p-0">
                <Skeleton className="w-full h-32" />
              </CardHeader>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2 mb-4" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))
        ) : filteredAndSortedItems.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500 text-lg">
              {searchQuery ? 'No items found matching your search.' : 'Your inventory is empty.'}
            </p>
            {!searchQuery && (
              <Button onClick={handleSyncInventory} className="mt-4">
                Sync Inventory
              </Button>
            )}
          </div>
        ) : (
          filteredAndSortedItems.map((item: InventoryItem) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader className="p-0 bg-gray-100">
                <div className="aspect-square flex items-center justify-center">
                  <Avatar className="w-24 h-24">
                    <AvatarImage
                      src={`https://community.akamai.steamstatic.com/economy/image/${item.iconUrl}/128fx128f`}
                      alt={item.marketName}
                    />
                    <AvatarFallback>{item.marketName.charAt(0)}</AvatarFallback>
                  </Avatar>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-1 line-clamp-2">
                  {item.marketName}
                </h3>
                <p className="text-sm text-gray-500 mb-2">{item.marketHashName}</p>
                <div className="flex items-center gap-2 mb-3">
                  {item.steamPrice && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      ${item.steamPrice.toFixed(2)}
                    </Badge>
                  )}
                  {item.suggestedPrice && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      ${item.suggestedPrice.toFixed(2)}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-3">
                  {item.tradable && <Badge variant="default"> Tradable </Badge>}
                  {item.marketable && <Badge variant="default"> Marketable </Badge>}
                  {!item.active && <Badge variant="destructive"> Inactive </Badge>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  {item.steamPrice && (
                    <Button size="sm" className="flex-1">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      List
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}