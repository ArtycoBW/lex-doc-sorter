import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { mkdirSync } from 'fs';
import * as path from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BasicProcessingService } from './basic-processing.service';
import { StartProcessingDto } from './dto/start-processing.dto';
import { UpdateFileNameDto } from './dto/update-file-name.dto';
import { JobsService } from './jobs.service';
import { NamingService } from './naming.service';
import { ProcessingQueueService } from './processing-queue.service';
import { RegistryService } from './registry.service';

const MAX_FILES = 500;
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
]);
const TEMP_UPLOAD_DIR = path.resolve(
  process.cwd(),
  process.env.STORAGE_PATH || './uploads',
  '.tmp',
);

mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });

@Controller('jobs')
@UseGuards(JwtAuthGuard)
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly basicProcessingService: BasicProcessingService,
    private readonly processingQueueService: ProcessingQueueService,
    private readonly namingService: NamingService,
    private readonly registryService: RegistryService,
  ) {}

  @Post()
  createJob(@Req() req: any) {
    return this.jobsService.createJob(req.user.sub);
  }

  @Post(':id/upload')
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES, {
      dest: TEMP_UPLOAD_DIR,
      limits: {
        fileSize: MAX_FILE_SIZE,
        files: MAX_FILES,
      },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
          callback(
            new BadRequestException(
              'Поддерживаются только JPG, JPEG, PNG и PDF',
            ) as unknown as Error,
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  uploadFiles(
    @Req() req: any,
    @Param('id') jobId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.jobsService.uploadFiles(req.user.sub, jobId, files);
  }

  @Post(':id/start')
  startBasicProcessing(
    @Req() req: any,
    @Param('id') jobId: string,
    @Body() dto: StartProcessingDto,
  ) {
    return this.processingQueueService.enqueueJob(req.user.sub, jobId, dto.mode);
  }

  @Post(':id/cancel')
  cancelProcessing(@Req() req: any, @Param('id') jobId: string) {
    return this.processingQueueService.cancelJob(req.user.sub, jobId);
  }

  @Post(':id/apply-names')
  applySmartNames(@Req() req: any, @Param('id') jobId: string) {
    return this.namingService.applySmartNamesForUser(req.user.sub, jobId);
  }

  @Get()
  listJobs(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.jobsService.listJobs(req.user.sub, page, limit);
  }

  @Get(':id/download')
  downloadJobArchive(
    @Req() req: any,
    @Param('id') jobId: string,
    @Res() response: Response,
  ) {
    return this.basicProcessingService.streamJobArchive(
      req.user.sub,
      jobId,
      response,
    );
  }

  @Get(':id/registry')
  async downloadRegistry(
    @Req() req: any,
    @Param('id') jobId: string,
    @Query('format') format = 'xlsx',
    @Res() response: Response,
  ) {
    const registry = await this.registryService.buildRegistry(
      req.user.sub,
      jobId,
      format,
    );

    response.setHeader('Content-Type', registry.mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${registry.fileName}"`,
    );
    response.send(registry.buffer);
  }

  @Get(':id/progress')
  getJobProgress(@Req() req: any, @Param('id') jobId: string) {
    return this.basicProcessingService.getProgress(req.user.sub, jobId);
  }

  @Get(':id')
  getJob(@Req() req: any, @Param('id') jobId: string) {
    return this.jobsService.getJob(req.user.sub, jobId);
  }

  @Patch(':id/files/:fileId')
  updateFileName(
    @Req() req: any,
    @Param('id') jobId: string,
    @Param('fileId') fileId: string,
    @Body() dto: UpdateFileNameDto,
  ) {
    return this.jobsService.updateFileName(
      req.user.sub,
      jobId,
      fileId,
      dto.processedName,
    );
  }

  @Delete(':id')
  deleteJob(@Req() req: any, @Param('id') jobId: string) {
    return this.jobsService.deleteJob(req.user.sub, jobId);
  }
}
