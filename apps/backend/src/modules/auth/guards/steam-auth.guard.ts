import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class SteamAuthGuard extends AuthGuard('steam') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      if (err) {
        throw new UnauthorizedException(`Steam authentication failed: ${err.message}`);
      }
      throw new UnauthorizedException('Steam authentication failed. Please try again.');
    }

    return user;
  }
}