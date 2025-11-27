import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../../decorators/public.decorator';
import { AuthService } from '../../services/auth.service';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;
  let jwtService: JwtService;
  let authService: AuthService;
  let mockExecutionContext: ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: {
            validateUser: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get<Reflector>(Reflector);
    jwtService = module.get<JwtService>(JwtService);
    authService = module.get<AuthService>(AuthService);

    // Mock execution context
    mockExecutionContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: jest.fn(),
        getResponse: jest.fn(),
        getNext: jest.fn(),
      }),
    } as any;
  });

  describe('canActivate', () => {
    it('should return true for public routes', () => {
      // Arrange
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      // Act
      const result = guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
    });

    it('should call parent canActivate for non-public routes', () => {
      // Arrange
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const parentCanActivateSpy = jest.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(guard)),
        'canActivate',
      ).mockReturnValue(true);

      // Act
      const result = guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
      expect(parentCanActivateSpy).toHaveBeenCalledWith(mockExecutionContext);
    });

    it('should call parent canActivate when no public metadata is set', () => {
      // Arrange
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const parentCanActivateSpy = jest.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(guard)),
        'canActivate',
      ).mockReturnValue(true);

      // Act
      const result = guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
      expect(parentCanActivateSpy).toHaveBeenCalledWith(mockExecutionContext);
    });
  });

  describe('handleRequest', () => {
    it('should throw UnauthorizedException when user is not found', () => {
      // Arrange
      const mockContext = {} as ExecutionContext;

      // Act & Assert
      expect(() => guard.handleRequest(null, null, null, mockContext)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.handleRequest(null, null, null, mockContext)).toThrow(
        'Authentication failed. Please log in again.',
      );
    });

    it('should throw UnauthorizedException when error is provided', () => {
      // Arrange
      const mockError = new Error('Token expired');
      const mockContext = {} as ExecutionContext;

      // Act & Assert
      expect(() => guard.handleRequest(mockError, null, null, mockContext)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.handleRequest(mockError, null, null, mockContext)).toThrow(
        'Token expired',
      );
    });

    it('should throw UnauthorizedException when user is banned', () => {
      // Arrange
      const mockUser = { isBanned: true, isActive: true };
      const mockContext = {} as ExecutionContext;

      // Act & Assert
      expect(() => guard.handleRequest(null, mockUser, null, mockContext)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.handleRequest(null, mockUser, null, mockContext)).toThrow(
        'Your account has been banned.',
      );
    });

    it('should throw UnauthorizedException when user is not active', () => {
      // Arrange
      const mockUser = { isBanned: false, isActive: false };
      const mockContext = {} as ExecutionContext;

      // Act & Assert
      expect(() => guard.handleRequest(null, mockUser, null, mockContext)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.handleRequest(null, mockUser, null, mockContext)).toThrow(
        'Your account is not active.',
      );
    });

    it('should return user when all validations pass', () => {
      // Arrange
      const mockUser = {
        id: '123',
        isBanned: false,
        isActive: true,
        username: 'testuser',
      };
      const mockContext = {} as ExecutionContext;

      // Act
      const result = guard.handleRequest(null, mockUser, null, mockContext);

      // Assert
      expect(result).toEqual(mockUser);
    });
  });

  describe('integration with @Public() decorator', () => {
    it('should bypass authentication for Steam OAuth endpoints', () => {
      // Arrange
      const mockSteamAuthHandler = () => {};
      const mockControllerClass = class SteamAuthController {};

      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key, targets) => {
        if (key === IS_PUBLIC_KEY) {
          // Simulate @Public() decorator being applied
          return targets.includes(mockSteamAuthHandler) || targets.includes(mockControllerClass);
        }
        return null;
      });

      mockExecutionContext.getHandler = jest.fn().mockReturnValue(mockSteamAuthHandler);
      mockExecutionContext.getClass = jest.fn().mockReturnValue(mockControllerClass);

      // Act
      const result = guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockSteamAuthHandler,
        mockControllerClass,
      ]);
    });

    it('should require authentication for protected endpoints', () => {
      // Arrange
      const mockProtectedHandler = () => {};
      const mockControllerClass = class ProtectedController {};

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      mockExecutionContext.getHandler = jest.fn().mockReturnValue(mockProtectedHandler);
      mockExecutionContext.getClass = jest.fn().mockReturnValue(mockControllerClass);

      const parentCanActivateSpy = jest.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(guard)),
        'canActivate',
      ).mockReturnValue(false);

      // Act
      const result = guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(false);
      expect(parentCanActivateSpy).toHaveBeenCalledWith(mockExecutionContext);
    });
  });

  describe('metadata key consistency', () => {
    it('should use the same metadata key as Public decorator', () => {
      // Arrange
      const mockHandler = () => {};

      // Act
      const decoratorKey = IS_PUBLIC_KEY;

      // Assert
      expect(decoratorKey).toBe('isPublic');
      expect(decoratorKey).toBeDefined();
    });
  });
});