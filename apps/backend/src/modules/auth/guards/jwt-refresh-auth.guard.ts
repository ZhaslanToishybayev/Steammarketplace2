import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtRefreshAuthGuard extends AuthGuard('jwt-refresh') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      if (err) {
        throw new UnauthorizedException(`Invalid refresh token: ${err.message}`);
      }
      throw new UnauthorizedException('Invalid refresh token.');
    }

    return user;
  }
}