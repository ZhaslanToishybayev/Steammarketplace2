import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtTokenService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  generateAccessToken(userId: string, steamId: string): string {
    const payload = { sub: userId, steamId };
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '7d');

    return this.jwtService.sign(payload, { expiresIn });
  }

  generateRefreshToken(userId: string, steamId: string): string {
    const payload = { sub: userId, steamId };
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');
    const expiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '30d');

    return this.jwtService.sign(payload, { secret, expiresIn });
  }

  generateTokenPair(userId: string, steamId: string): {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  } {
    const accessToken = this.generateAccessToken(userId, steamId);
    const refreshToken = this.generateRefreshToken(userId, steamId);

    // Calculate expires in seconds
    const expiresIn = this.parseExpirationTime(
      this.configService.get<string>('JWT_EXPIRES_IN', '7d'),
    );

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  verifyRefreshToken(token: string): any {
    try {
      const secret = this.configService.get<string>('JWT_REFRESH_SECRET');
      return this.jwtService.verify(token, { secret });
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  parseExpirationTime(expiresIn: string): number {
    // Convert expiration time to seconds
    const timeValue = parseInt(expiresIn.replace(/\D/g, ''), 10);
    const timeUnit = expiresIn.replace(/[0-9]/g, '');

    switch (timeUnit) {
      case 's':
        return timeValue;
      case 'm':
        return timeValue * 60;
      case 'h':
        return timeValue * 60 * 60;
      case 'd':
        return timeValue * 24 * 60 * 60;
      default:
        return 7 * 24 * 60 * 60; // Default 7 days
    }
  }
}