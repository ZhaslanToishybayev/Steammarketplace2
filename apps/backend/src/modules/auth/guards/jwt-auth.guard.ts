import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check if the route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Handle authentication errors
    if (err || !user) {
      if (err) {
        throw err;
      }
      throw new UnauthorizedException('Authentication failed. Please log in again.');
    }

    // Check if user is banned
    if (user.isBanned) {
      throw new UnauthorizedException('Your account has been banned.');
    }

    // Check if account is active
    if (!user.isActive) {
      throw new UnauthorizedException('Your account is not active.');
    }

    return user;
  }
}