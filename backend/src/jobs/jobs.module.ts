import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { BasicProcessingService } from './basic-processing.service';
import { ImageProcessorProcessor } from './image-processor.processor';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import {
  IMAGE_PROCESSOR_QUEUE,
  ProcessingQueueService,
} from './processing-queue.service';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT || 6379),
      },
    }),
    BullModule.registerQueue({
      name: IMAGE_PROCESSOR_QUEUE,
    }),
  ],
  controllers: [JobsController],
  providers: [
    JobsService,
    BasicProcessingService,
    ProcessingQueueService,
    ImageProcessorProcessor,
  ],
})
export class JobsModule {}
