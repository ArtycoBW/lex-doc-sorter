import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { BasicProcessingService } from './basic-processing.service';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [JobsController],
  providers: [JobsService, BasicProcessingService],
})
export class JobsModule {}
