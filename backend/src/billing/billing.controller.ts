import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BillingService } from './billing.service';

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('summary')
  getSummary(@Req() req: any) {
    return this.billingService.getSummary(req.user.sub);
  }

  @Get('tariffs')
  getTariffs() {
    return this.billingService.getTariffPlans();
  }

  @Get('token-packages')
  getTokenPackages() {
    return this.billingService.getTokenPackages();
  }

  @Get('history')
  getHistory(@Req() req: any, @Query('limit') limit?: string) {
    const parsed = limit ? Number(limit) : 10;
    return this.billingService.getHistory(req.user.sub, Number.isFinite(parsed) ? parsed : 10);
  }
}

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly billingService: BillingService) {}

  @Post()
  create(@Req() req: any, @Body() body: {
    targetType: 'TARIFF_PLAN' | 'TOKEN_PACKAGE';
    targetCode: string;
    quantity?: number;
  }) {
    return this.billingService.createMockPayment(req.user.sub, body);
  }

  @Get(':id')
  findOne(@Param('id') paymentId: string) {
    return {
      id: paymentId,
      externalOrderId: null,
      formUrl: null,
      status: 'SUCCEEDED',
      amount: 0,
      currency: 'RUB',
      paidAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
      target: null,
    };
  }

  @Post(':id/reconcile')
  reconcile(@Param('id') paymentId: string) {
    return this.findOne(paymentId);
  }
}
