export interface SteamUserProfile {
  steamId: string;
  username: string;
  avatar: string;
  avatarMedium: string;
  avatarFull: string;
  profileUrl: string;
  profileState?: number;
  personaState?: number;
  primaryClanId?: string;
  timeCreated?: Date;
  personaname?: string;
  commentPermission?: number;
  locCountryCode?: string;
  locStateCode?: string;
  locCityId?: string;
  lastLogoff?: Date;
  communityBanned?: boolean;
  tradeBanned?: boolean;
  isLimitedAccount?: boolean;
  steamGuardEnabled?: boolean;
  tradeToken?: string;
  lastSteamSync?: Date;
  steamLevel?: number;
}