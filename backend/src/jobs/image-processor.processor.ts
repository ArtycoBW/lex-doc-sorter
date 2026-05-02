import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  IMAGE_PROCESSOR_QUEUE,
  type ImageProcessorJob,
} from './processing-queue.service';
import { BasicProcessingService } from './basic-processing.service';

@Processor(IMAGE_PROCESSOR_QUEUE, { concurrency: 4 })
export class ImageProcessorProcessor extends WorkerHost {
  constructor(private readonly basicProcessing: BasicProcessingService) {
    super();
  }

  async process(job: Job<ImageProcessorJob>) {
    await this.basicProcessing.processQueuedFile(job.data);
  }
}
