const { spawn } = require('child_process');
const { MongoMemoryServer } = require('mongodb-memory-server');

async function startDevelopment() {
  let mongod;

  try {
    console.log('🚀 Starting Steam Marketplace in Development Mode');
    console.log('=================================================\n');

    // 1. Запускаем MongoDB Memory Server
    console.log('📦 Starting MongoDB Memory Server...');
    mongod = await MongoMemoryServer.create({
      instance: {
        port: 27017,
        dbName: 'steam-marketplace',
      },
    });

    const uri = mongod.getUri();
    console.log(`✅ MongoDB started at ${uri}\n`);

    // Устанавливаем URI для приложения
    process.env.MONGODB_URI = uri;

    // 2. Запускаем backend в режиме разработки
    console.log('🔧 Starting Backend (nodemon)...\n');
    const backend = spawn('npx', ['nodemon', 'app.js'], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env }
    });

    // 3. Обработка завершения
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down...');
      backend.kill('SIGINT');
      if (mongod) {
        await mongod.stop();
      }
      process.exit(0);
    });

    backend.on('exit', async (code) => {
      console.log(`\nBackend exited with code ${code}`);
      if (mongod) {
        await mongod.stop();
      }
      process.exit(code);
    });

  } catch (error) {
    console.error('❌ Failed to start development server:', error);
    if (mongod) {
      await mongod.stop();
    }
    process.exit(1);
  }
}

startDevelopment();
