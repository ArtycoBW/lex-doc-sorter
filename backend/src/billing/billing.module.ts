import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingController, PaymentsController } from './billing.controller';
import { BillingService } from './billing.service';

@Module({
  imports: [PrismaModule],
  controllers: [BillingController, PaymentsController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
