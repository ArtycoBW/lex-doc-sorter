import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BasicProcessingService } from './basic-processing.service';

export const IMAGE_PROCESSOR_QUEUE = 'image-processor';

export type ImageProcessorJob = {
  userId: string;
  jobId: string;
  fileId: string;
};

@Injectable()
export class ProcessingQueueService {
  constructor(
    @InjectQueue(IMAGE_PROCESSOR_QUEUE)
    private readonly imageQueue: Queue<ImageProcessorJob>,
    private readonly basicProcessing: BasicProcessingService,
  ) {}

  async enqueueJob(userId: string, jobId: string) {
    const job = await this.basicProcessing.prepareJobForProcessing(
      userId,
      jobId,
    );

    await this.imageQueue.addBulk(
      job.files.map((file) => ({
        name: 'process-file',
        data: {
          userId,
          jobId: job.id,
          fileId: file.id,
        },
        opts: {
          attempts: 1,
          removeOnComplete: { age: 3600, count: 1000 },
          removeOnFail: { age: 86400, count: 1000 },
        },
      })),
    );

    return this.basicProcessing.getJob(userId, job.id);
  }
}
