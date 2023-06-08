import {
  Controller,
  HttpException,
  HttpStatus,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

export interface File {
  fieldname: string;
  originalname: string;
  encoding: '7bit' | string;
  mimetype: 'image/jpeg' | string;
  buffer: Buffer;
  size: number;
}

@Controller('file')
export class FileController {
  @Post('single')
  @UseInterceptors(FileInterceptor('file'))
  async postSingleFile(@UploadedFile() file: File): Promise<string> {
    if (!file) {
      throw new HttpException('missing file', HttpStatus.BAD_REQUEST);
    }
    console.log('file:', file);
    return 'mock id';
  }

  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files'))
  async postMultipleFiles(@UploadedFiles() files: File[]): Promise<string[]> {
    if (!files) {
      throw new HttpException('missing files', HttpStatus.BAD_REQUEST);
    }
    console.log('files:', files);
    return !files ? [] : files.map((file, i) => 'mock id ' + (i + 1));
  }
}
