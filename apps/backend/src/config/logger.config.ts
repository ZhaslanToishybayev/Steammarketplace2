import * as winston from 'winston';
import { ConfigService } from '@nestjs/config';

export const loggerConfig = (configService: ConfigService): winston.LoggerOptions => {
  const logLevel = configService.get<string>('LOG_LEVEL', 'info');
  const env = configService.get<string>('NODE_ENV', 'development');

  const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    env === 'development'
      ? winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
        )
      : winston.format.json(),
  );

  const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  );

  return {
    level: logLevel,
    format: logFormat,
    defaultMeta: { service: 'steam-marketplace-backend' },
    transports: [
      // Console transport
      new winston.transports.Console({
        format: env === 'development' ? logFormat : winston.format.simple(),
      }),

      // Error log file
      new winston.transports.File({
        filename: configService.get<string>('LOG_FILE_ERROR', 'logs/error.log'),
        level: 'error',
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),

      // Combined log file
      new winston.transports.File({
        filename: configService.get<string>('LOG_FILE_COMBINED', 'logs/combined.log'),
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),

      // HTTP access log file
      new winston.transports.File({
        filename: configService.get<string>('LOG_FILE_ACCESS', 'logs/access.log'),
        level: 'http',
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    ],

    // Handle exceptions and rejections
    exceptionHandlers: [
      new winston.transports.File({
        filename: configService.get<string>('LOG_FILE_ERROR', 'logs/error.log'),
        format: fileFormat,
      }),
    ],
    rejectionHandlers: [
      new winston.transports.File({
        filename: configService.get<string>('LOG_FILE_ERROR', 'logs/error.log'),
        format: fileFormat,
      }),
    ],

    // Exit on error in production
    exitOnError: env === 'production',
  };
};