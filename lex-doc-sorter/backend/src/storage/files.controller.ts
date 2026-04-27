import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StorageService } from './storage.service';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  @Get()
  async downloadFile(
    @Req() req: any,
    @Query('key') key: string | undefined,
    @Res() response: Response,
  ) {
    if (!key) {
      throw new BadRequestException('Не указан ключ файла');
    }

    this.storage.assertUserCanAccessKey(req.user.sub, key);

    const buffer = await this.storage.download(key);
    const fileName = encodeURIComponent(this.storage.getFileName(key));

    response.setHeader('Content-Type', this.storage.getContentType(key));
    response.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${fileName}`,
    );
    response.send(buffer);
  }
}
