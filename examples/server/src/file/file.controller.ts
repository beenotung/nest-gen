import { Controller, Post, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common';
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
    console.log('file:', file);
    return 'mock id';
  }

  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files'))
  async postMultipleFiles(
    @UploadedFiles() files: File[],
  ): Promise<string[]> {
    console.log('files:', files);
    return !files ? [] : files.map((file, i) => 'mock id ' + (i + 1));
  }
}
