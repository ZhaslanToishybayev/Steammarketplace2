// Steam Marketplace TypeScript types

export interface SteamItem {
  id: string;
  name: string;
  market_hash_name: string;
  price?: number;
  image?: string;
  steam_id?: string;
}

export interface TradeOffer {
  id: string;
  partner: string;
  state: string;
  items_to_give: SteamItem[];
  items_to_receive: SteamItem[];
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  steam_id: string;
  username: string;
  email?: string;
  balance: number;
  created_at: Date;
  updated_at: Date;
}