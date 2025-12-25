/**
 * Test Data Seeder Utility
 * Populates databases with realistic test data for E2E scenarios using TypeORM entities
 */

import { DataSource, Repository } from 'typeorm';
import { connect, Connection, Types } from 'mongoose';
import { testConfig, testDataConfig } from './test-config';

// Import actual TypeORM entities from backend
import { User } from '../../../apps/backend/src/modules/auth/entities/user.entity';
import { Trade } from '../../../apps/backend/src/modules/trading/entities/trade.entity';
import { Bot } from '../../../apps/backend/src/modules/trading/entities/bot.entity';
import { Balance } from '../../../apps/backend/src/modules/wallet/entities/balance.entity';
import { Transaction } from '../../../apps/backend/src/modules/wallet/entities/transaction.entity';
// Import MongoDB entities
import { Inventory } from '../../../apps/backend/src/modules/inventory/entities/inventory.entity';
import { ItemPrice } from '../../../apps/backend/src/modules/pricing/entities/item-price.entity';

export class TestDataSeeder {
  private dataSource: DataSource;
  private mongoConnection: Connection;

  constructor() {
    // PRODUCTION SAFEGUARD: Prevent running test data seeder in production
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'TestDataSeeder cannot be used in production environment. ' +
        'This is for E2E testing only and will populate databases with mock test data. ' +
        'Set NODE_ENV to development or test to use this tool.'
      );
    }

    this.dataSource = new DataSource({
      type: 'postgres',
      host: testConfig.databases.postgres.host,
      port: testConfig.databases.postgres.port,
      username: testConfig.databases.postgres.username,
      password: testConfig.databases.postgres.password,
      database: testConfig.databases.postgres.database,
      entities: [
        '../../../apps/backend/src/modules/auth/entities/user.entity',
        '../../../apps/backend/src/modules/trading/entities/trade.entity',
        '../../../apps/backend/src/modules/trading/entities/bot.entity',
        '../../../apps/backend/src/modules/wallet/entities/balance.entity',
        '../../../apps/backend/src/modules/wallet/entities/transaction.entity'
      ],
      synchronize: false, // Don't auto-create schema, use existing
      logging: false,
    });

    this.mongoConnection = connect(testConfig.databases.mongodb.uri)
      .then(mongo => mongo.connection)
      .then(connection => {
        this.mongoConnection = connection;
        return connection;
      });
  }

  /**
   * Seed all test data
   */
  async seedAll(): Promise<void> {
    console.log('🚀 Starting test data seeding...');

    try {
      await this.connectToDatabases();

      await this.seedUsers();
      await this.seedBots();
      await this.seedInventoryItems();
      await this.seedItemPrices();
      await this.seedTrades();
      await this.seedWalletData();

      console.log('✅ Test data seeding completed successfully');
    } catch (error) {
      console.error('❌ Test data seeding failed:', error);
      throw error;
    }
  }

  /**
   * Clean up test data - only remove test data, don't truncate whole tables
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Starting test data cleanup...');

    try {
      const userRepository = this.dataSource.getRepository(User);
      const tradeRepository = this.dataSource.getRepository(Trade);
      const botRepository = this.dataSource.getRepository(Bot);
      const balanceRepository = this.dataSource.getRepository(Balance);
      const transactionRepository = this.dataSource.getRepository(Transaction);

      // Clean up test data only, not entire tables
      await tradeRepository.delete({
        user: { steamId: [testConfig.users.admin.steamId, testConfig.users.regular.steamId] }
      });

      await transactionRepository.delete({
        user: { steamId: [testConfig.users.admin.steamId, testConfig.users.regular.steamId] }
      });

      await balanceRepository.delete({
        user: { steamId: [testConfig.users.admin.steamId, testConfig.users.regular.steamId] }
      });

      await userRepository.delete({
        steamId: [testConfig.users.admin.steamId, testConfig.users.regular.steamId]
      });

      await botRepository.delete({
        accountName: ['testbot1', 'testbot2']
      });

      await this.mongoConnection.db.collection('items').deleteMany({
        'name': { $in: [
          'AK-47 | Redline (Field-Tested)',
          'M4A4 | Desert-Strike (Factory New)',
          'AWP | Dragon Lore (Minimal Wear)',
          'P90 | Death Grip (Factory New)',
          'MAC-10 | Neon Rider (Minimal Wear)',
          'Glock-18 | Fade (Factory New)',
          'AK-47 | Safari Mesh (Minimal Wear)',
          'M4A4 | Howl (Factory New)',
          'UMP-45 | Corvid (Field-Tested)',
          'FAMAS | Diver (Minimal Wear)'
        ]}
      });

      await this.mongoConnection.db.collection('itemprices').deleteMany({
        'steamPrice': { $exists: true }
      });

      console.log('✅ Test data cleanup completed successfully');
    } catch (error) {
      console.error('❌ Test data cleanup failed:', error);
      throw error;
    }
  }

  private async connectToDatabases(): Promise<void> {
    await this.dataSource.initialize();
    await this.mongoConnection;
  }

  private async seedUsers(): Promise<void> {
    console.log('📝 Seeding users...');

    const userRepository = this.dataSource.getRepository(User);

    const users = [
      {
        steamId: testConfig.users.admin.steamId,
        username: testConfig.users.admin.username,
        displayName: testConfig.users.admin.displayName,
        tradeUrl: testConfig.users.admin.tradeUrl,
        role: 'ADMIN',
        isTradeUrlValid: true,
      },
      {
        steamId: testConfig.users.regular.steamId,
        username: testConfig.users.regular.username,
        displayName: testConfig.users.regular.displayName,
        tradeUrl: testConfig.users.regular.tradeUrl,
        role: 'USER',
        isTradeUrlValid: true,
      },
    ];

    for (const userData of users) {
      const user = userRepository.create(userData);
      await userRepository.save(user);

      // Create balance for each user
      const balanceRepository = this.dataSource.getRepository(Balance);
      const balance = balanceRepository.create({
        user,
        amount: testDataConfig.wallet.defaultBalance,
        currency: 'USD',
      });
      await balanceRepository.save(balance);
    }
  }

  private async seedBots(): Promise<void> {
    console.log('🤖 Seeding bots...');

    const botRepository = this.dataSource.getRepository(Bot);

    const bots = [
      {
        accountName: 'testbot1',
        sharedSecret: 'dGVzdGJvdDFAc2VjcmV0',
        identitySecret: 'dGVzdGJvdDFAaWRlbnRpdHk=',
        maxConcurrentTrades: testDataConfig.bots.maxConcurrentTrades,
        currentTrades: 0,
        status: 'ONLINE',
      },
      {
        accountName: 'testbot2',
        sharedSecret: 'dGVzdGJvdDJAc2VjcmV0',
        identitySecret: 'dGVzdGJvdDJAaWRlbnRpdHk=',
        maxConcurrentTrades: testDataConfig.bots.maxConcurrentTrades,
        currentTrades: 0,
        status: 'OFFLINE',
      },
    ];

    for (const botData of bots) {
      const bot = botRepository.create(botData);
      await botRepository.save(bot);
    }
  }

  private async seedInventoryItems(): Promise<void> {
    console.log('📦 Seeding inventory items...');

    const items = [];
    const itemNames = [
      'AK-47 | Redline (Field-Tested)',
      'M4A4 | Desert-Strike (Factory New)',
      'AWP | Dragon Lore (Minimal Wear)',
      'P90 | Death Grip (Factory New)',
      'MAC-10 | Neon Rider (Minimal Wear)',
      'Glock-18 | Fade (Factory New)',
      'AK-47 | Safari Mesh (Minimal Wear)',
      'M4A4 | Howl (Factory New)',
      'UMP-45 | Corvid (Field-Tested)',
      'FAMAS | Diver (Minimal Wear)',
    ];

    for (const appId of testDataConfig.inventory.games) {
      for (let i = 0; i < testDataConfig.inventory.itemsPerGame; i++) {
        const itemName = itemNames[i % itemNames.length];
        const classId = `${appId}_${i}`;
        const instanceId = `${i}_0`;

        items.push({
          steamId: `${appId}_${classId}_${instanceId}`,
          name: itemName,
          appId,
          classId,
          instanceId,
          description: `${itemName} - High quality skin with excellent condition`,
          type: 'Rifle',
          rarity: 'Covert',
          quality: 'Factory New',
          iconUrl: `https://steamcdn-a.akamaihd.net/apps/${appId}/icons/${classId}.png`,
          tradable: true,
          marketable: true,
          commodified: true,
          float: Math.random() * 1,
          wear: 'Factory New',
          stickers: i % 3 === 0 ? [{ name: 'Tournament Sticker', wear: 0.8 }] : [],
          pattern: i % 5 === 0 ? Math.floor(Math.random() * 100) : undefined,
        });
      }
    }

    const collection = this.mongoConnection.db.collection('items');
    await collection.insertMany(items);
  }

  private async seedItemPrices(): Promise<void> {
    console.log('💰 Seeding item prices...');

    const items = await this.mongoConnection.db.collection('items').find({}).toArray();
    const prices = [];

    for (const item of items) {
      prices.push({
        itemId: item._id.toString(),
        appId: item.appId,
        steamPrice: Math.random() * 100 + 10,
        csgoFloatPrice: Math.random() * 100 + 10,
        buff163Price: Math.random() * 100 + 10,
      });
    }

    const collection = this.mongoConnection.db.collection('itemprices');
    await collection.insertMany(prices);
  }

  private async seedTrades(): Promise<void> {
    console.log('🔄 Seeding trades...');

    const userRepository = this.dataSource.getRepository(User);
    const botRepository = this.dataSource.getRepository(Bot);
    const tradeRepository = this.dataSource.getRepository(Trade);

    const adminUser = await userRepository.findOne({ where: { steamId: testConfig.users.admin.steamId } });
    const bot = await botRepository.findOne({ where: { accountName: 'testbot1' } });

    if (!adminUser || !bot) {
      throw new Error('Required test user or bot not found');
    }

    // Create pending trades
    for (let i = 0; i < testDataConfig.trades.pendingTrades; i++) {
      const trade = tradeRepository.create({
        user: adminUser,
        bot,
        status: 'PENDING',
        type: 'TRADE',
        offerItems: [{ name: 'Test Item', appId: 730, classId: 'test123' }],
        requestItems: [],
        profit: Math.random() * 50,
        fee: Math.random() * 5,
      });
      await tradeRepository.save(trade);
    }

    // Create completed trades
    for (let i = 0; i < testDataConfig.trades.completedTrades; i++) {
      const trade = tradeRepository.create({
        user: adminUser,
        bot,
        status: 'COMPLETED',
        type: 'TRADE',
        offerItems: [{ name: 'Test Item', appId: 730, classId: 'test123' }],
        requestItems: [],
        profit: Math.random() * 50,
        fee: Math.random() * 5,
        completedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      });
      await tradeRepository.save(trade);
    }

    // Create failed trades
    for (let i = 0; i < testDataConfig.trades.failedTrades; i++) {
      const trade = tradeRepository.create({
        user: adminUser,
        bot,
        status: 'FAILED',
        type: 'TRADE',
        offerItems: [{ name: 'Test Item', appId: 730, classId: 'test123' }],
        requestItems: [],
        profit: Math.random() * 50,
        fee: Math.random() * 5,
      });
      await tradeRepository.save(trade);
    }
  }

  private async seedWalletData(): Promise<void> {
    console.log('💳 Seeding wallet data...');

    const userRepository = this.dataSource.getRepository(User);
    const transactionRepository = this.dataSource.getRepository(Transaction);

    const adminUser = await userRepository.findOne({ where: { steamId: testConfig.users.admin.steamId } });

    if (!adminUser) {
      throw new Error('Required test user not found');
    }

    // Create deposit transactions
    for (let i = 0; i < 3; i++) {
      const transaction = transactionRepository.create({
        user: adminUser,
        type: 'DEPOSIT',
        amount: Math.random() * 200 + 10,
        currency: 'USD',
        status: 'COMPLETED',
        metadata: { method: 'stripe', transactionId: `txn_${i}` },
      });
      await transactionRepository.save(transaction);
    }

    // Create withdrawal transactions
    for (let i = 0; i < 2; i++) {
      const transaction = transactionRepository.create({
        user: adminUser,
        type: 'WITHDRAWAL',
        amount: Math.random() * 100 + 10,
        currency: 'USD',
        status: 'COMPLETED',
        metadata: { method: 'paypal', transactionId: `wd_${i}` },
      });
      await transactionRepository.save(transaction);
    }

    // Create trade transactions from completed trades
    const tradeRepository = this.dataSource.getRepository(Trade);
    const completedTrades = await tradeRepository.find({
      where: { status: 'COMPLETED', user: adminUser }
    });

    for (const trade of completedTrades) {
      // Profit transaction
      if (trade.profit > 0) {
        const profitTransaction = transactionRepository.create({
          user: adminUser,
          type: 'TRADE',
          amount: trade.profit,
          currency: 'USD',
          status: 'COMPLETED',
          metadata: { tradeId: trade.id, type: 'profit' },
        });
        await transactionRepository.save(profitTransaction);
      }

      // Fee transaction
      if (trade.fee > 0) {
        const feeTransaction = transactionRepository.create({
          user: adminUser,
          type: 'FEE',
          amount: -trade.fee,
          currency: 'USD',
          status: 'COMPLETED',
          metadata: { tradeId: trade.id, type: 'fee' },
        });
        await transactionRepository.save(feeTransaction);
      }
    }
  }

  async disconnect(): Promise<void> {
    await this.dataSource.destroy();
    await this.mongoConnection.close();
  }
}

// CLI usage
if (require.main === module) {
  // PRODUCTION SAFEGUARD: Prevent CLI usage in production
  if (process.env.NODE_ENV === 'production') {
    console.error(
      '❌ ERROR: TestDataSeeder cannot be used in production environment.\n' +
      'This tool is for E2E testing only and will populate databases with mock test data.\n' +
      'Set NODE_ENV to development or test to use this tool.'
    );
    process.exit(1);
  }

  const seeder = new TestDataSeeder();

  const command = process.argv[2];

  if (command === '--cleanup') {
    seeder.cleanup()
      .then(() => {
        console.log('Cleanup completed');
        process.exit(0);
      })
      .catch(error => {
        console.error('Cleanup failed:', error);
        process.exit(1);
      });
  } else {
    seeder.seedAll()
      .then(() => {
        console.log('Seeding completed');
        process.exit(0);
      })
      .catch(error => {
        console.error('Seeding failed:', error);
        process.exit(1);
      });
  }
}

export default TestDataSeeder;