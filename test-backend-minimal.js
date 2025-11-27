#!/usr/bin/env node

const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./apps/backend/src/app.module');

async function bootstrap() {
  try {
    console.log('🚀 Starting minimal backend test...');

    const app = await NestFactory.create(AppModule, {
      logger: ['log', 'error', 'warn'],
      cors: {
        origin: true,
        credentials: true,
      }
    });

    app.setGlobalPrefix('api');

    await app.listen(3002);
    console.log('✅ Backend started successfully on port 3002');
    console.log('📊 Available endpoints:');
    console.log('   GET /api/marketplace/listings - Marketplace listings');
    console.log('   GET /api/trades - Trade offers');
    console.log('   GET /api/auth/steam - Steam OAuth');
    console.log('   GET /health - Health check');

  } catch (error) {
    console.error('❌ Backend startup failed:');
    console.error(error.message);
    process.exit(1);
  }
}

bootstrap();