import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { WalletController } from './controllers/wallet.controller';
import { TransactionController } from './controllers/transaction.controller';
import { ReferralController } from './controllers/referral.controller';
import { BalanceService } from './services/balance.service';
import { TransactionService } from './services/transaction.service';
import { ReferralService } from './services/referral.service';
import { CryptoPaymentService } from './services/crypto-payment.service';
import { FiatPaymentService } from './services/fiat-payment.service';
import { PaymentProcessor } from './processors/payment.processor';
import { WithdrawalProcessor } from './processors/withdrawal.processor';
import { ReferralScheduler } from './schedulers/referral.scheduler';
import { Balance } from './entities/balance.entity';
import { Transaction } from './entities/transaction.entity';
import { Referral } from './entities/referral.entity';
import { ReferralCode } from './entities/referral-code.entity';
import { User } from '../../../auth/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    AuthModule,
    UserModule,
    TypeOrmModule.forFeature([
      Balance,
      Transaction,
      Referral,
      ReferralCode,
      User,
    ]),
    BullModule.registerQueue({
      name: 'payment-processing',
    }),
    BullModule.registerQueue({
      name: 'withdrawal-processing',
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [WalletController, TransactionController, ReferralController],
  providers: [
    BalanceService,
    TransactionService,
    ReferralService,
    CryptoPaymentService,
    FiatPaymentService,
    PaymentProcessor,
    WithdrawalProcessor,
    ReferralScheduler,
  ],
  exports: [
    BalanceService,
    TransactionService,
    ReferralService,
    CryptoPaymentService,
    FiatPaymentService,
  ],
})
export class WalletModule {}