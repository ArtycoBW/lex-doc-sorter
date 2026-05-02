import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { BasicProcessingService } from './basic-processing.service';
import { DocumentDetectionService } from './document-detection.service';
import { ImagePreprocessingService } from './image-preprocessing.service';
import { ImageProcessorProcessor } from './image-processor.processor';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { NamingService } from './naming.service';
import { OcrService } from './ocr.service';
import { PdfBuilderService } from './pdf-builder.service';
import {
  IMAGE_PROCESSOR_QUEUE,
  ProcessingQueueService,
} from './processing-queue.service';
import { RegistryService } from './registry.service';

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
    DocumentDetectionService,
    ImagePreprocessingService,
    NamingService,
    OcrService,
    PdfBuilderService,
    ProcessingQueueService,
    RegistryService,
    ImageProcessorProcessor,
  ],
})
export class JobsModule {}
