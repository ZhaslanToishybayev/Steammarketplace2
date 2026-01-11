export interface Item {
    id: number;
    itemName: string;
    itemIconUrl: string;
    price: number | string;
    itemExterior?: string;
    appId?: number;
    assetId?: string;
    classId?: string;
    instanceId?: string;
    [key: string]: any;
}

export interface User {
    id: number;
    steamId: string;
    username: string;
    avatarUrl: string;
    balance: number;
    tradeUrl?: string;
}

export interface Listing extends Item {
    listingId: number;
    sellerId: number;
    status: 'active' | 'sold' | 'cancelled';
    createdAt: string;
}
