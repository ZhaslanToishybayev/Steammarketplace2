import { MongooseModuleOptions } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

export const mongodbConfig = (configService: ConfigService): MongooseModuleOptions => ({
  uri: configService.get<string>('MONGODB_URI', 'mongodb://localhost:27017/steam_marketplace'),
  connectionFactory: (connection) => {
    connection.plugin((schema) => {
      schema.set('toJSON', {
        virtuals: true,
        versionKey: false,
        transform: function (doc, ret) {
          delete ret._id;
          return ret;
        },
      });
    });
    return connection;
  },
  retryAttempts: 3,
  retryDelay: 3000,
  maxPoolSize: configService.get<number>('MONGO_MAX_POOL_SIZE', 50), // Increased for parallel operations
  minPoolSize: configService.get<number>('MONGO_MIN_POOL_SIZE', 10), // Increased for connection availability
  maxConnecting: 5, // Limit simultaneous connections
  compressors: ['zlib'], // Enable compression for large item metadata
  readPreference: 'secondaryPreferred', // Use secondary for read-heavy operations
  writeConcern: { w: 'majority', wtimeout: 5000 }, // Ensure reliable writes
  readConcern: { level: 'majority' }, // Ensure read consistency
  maxIdleTimeMS: configService.get<number>('MONGO_MAX_IDLE_TIME', 30000),
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  autoIndex: configService.get<string>('NODE_ENV') !== 'production',
  autoCreate: configService.get<string>('NODE_ENV') !== 'production',
  monitorCommands: configService.get<string>('NODE_ENV') === 'development', // Enable command monitoring in dev
});