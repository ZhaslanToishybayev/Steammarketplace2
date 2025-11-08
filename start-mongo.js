const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

async function startMongoDB() {
  let mongod;

  try {
    console.log('🚀 Starting MongoDB Memory Server...');
    mongod = await MongoMemoryServer.create({
      instance: {
        port: 27017,
        dbName: 'steam-marketplace',
      },
    });

    const uri = mongod.getUri();
    console.log(`✅ MongoDB started at ${uri}`);

    // Обновляем MONGODB_URI в процессе
    process.env.MONGODB_URI = uri;

    // Подключаемся к БД
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    return uri;
  } catch (error) {
    console.error('❌ Failed to start MongoDB:', error);
    throw error;
  }
}

// Если запускаем напрямую
if (require.main === module) {
  startMongoDB()
    .then(() => {
      console.log('MongoDB is ready!');
      // Не завершаем процесс, ждем Ctrl+C
      process.on('SIGINT', async () => {
        console.log('\n🛑 Stopping MongoDB...');
        await mongoose.disconnect();
        await mongod.stop();
        process.exit(0);
      });
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = startMongoDB;
