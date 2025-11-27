import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@Injectable()
export class WsJwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtAuthGuard.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    try {
      const client: Socket = context.switchToWs().getClient();

      // Extract token from socket handshake
      let token: string | undefined;

      // Try to get token from auth object first
      if (client.handshake.auth && client.handshake.auth.token) {
        token = client.handshake.auth.token;
      }
      // Fallback to authorization header
      else if (
        client.handshake.headers &&
        client.handshake.headers.authorization
      ) {
        const authHeader = client.handshake.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        } else {
          token = authHeader;
        }
      }

      if (!token) {
        this.logger.warn(
          `WebSocket connection attempt without token from ${client.handshake.address}`,
        );
        throw new UnauthorizedException('No authentication token provided');
      }

      // Verify the JWT token
      const secret = this.configService.get<string>('JWT_SECRET');
      if (!secret) {
        throw new Error('JWT_SECRET not configured');
      }

      const payload = this.jwtService.verify(token, { secret });

      if (!payload || !payload.sub) {
        throw new UnauthorizedException('Invalid authentication token');
      }

      // Attach user data to socket for later use
      (client.data as any) = {
        ...client.data,
        user: {
          id: payload.sub,
          steamId: payload.steamId,
        },
      };

      this.logger.log(
        `WebSocket client authenticated: ${payload.sub} from ${client.handshake.address}`,
      );

      return true;
    } catch (error) {
      let errorMessage = 'WebSocket authentication failed';

      if (error instanceof UnauthorizedException) {
        errorMessage = error.message;
      } else if (error.name === 'JsonWebTokenError') {
        errorMessage = 'Invalid JWT token';
      } else if (error.name === 'TokenExpiredError') {
        errorMessage = 'JWT token has expired';
      } else if (error.message) {
        errorMessage = error.message;
      }

      this.logger.warn(
        `WebSocket authentication failed from ${context.switchToWs().getClient().handshake.address}: ${errorMessage}`,
      );

      // Emit error to client before disconnecting
      const client = context.switchToWs().getClient();
      client.emit('auth:error', {
        message: errorMessage,
        timestamp: new Date().toISOString(),
      });

      // Disconnect the socket to prevent further unauthorized messages
      client.disconnect(true);

      throw new UnauthorizedException(errorMessage);
    }
  }
}