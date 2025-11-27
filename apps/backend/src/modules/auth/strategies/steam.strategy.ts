import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-steam';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SteamStrategy extends PassportStrategy(Strategy, 'steam') {
  constructor(private configService: ConfigService) {
    super({
      returnURL: configService.get<string>('STEAM_RETURN_URL'),
      realm: configService.get<string>('STEAM_REALM'),
      apiKey: configService.get<string>('STEAM_API_KEY'),
      passReqToCallback: true,
    });
  }

  async validate(
    req: any,
    identifier: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      // Extract Steam ID from the identifier URL
      const steamIdMatch = identifier.match(/\/(\d{17})\/?$/);
      const steamId = steamIdMatch ? steamIdMatch[1] : null;

      if (!steamId) {
        return done(new Error('Could not extract Steam ID from identifier'), null);
      }

      // Prepare user data from Steam profile
      const userData = {
        steamId,
        username: profile.displayName || `SteamUser${steamId}`,
        avatar: profile.photos?.find(p => p.value.includes('_full'))?.value || null,
        avatarMedium: profile.photos?.find(p => p.value.includes('_medium'))?.value || null,
        avatarFull: profile.photos?.find(p => p.value.includes('_full'))?.value || null,
        profileUrl: profile.profileUrl || null,
      };

      return done(null, userData);
    } catch (error) {
      return done(error, null);
    }
  }
}