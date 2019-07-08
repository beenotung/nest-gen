import { Injectable } from '@angular/core';
import {
  Controller,
  FileInterceptor,
  FilesInterceptor,
  injectNestClient,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from 'nest-client';


@Injectable()
@Controller('file')
export class FileProvider {
  constructor() {
    injectNestClient(this);
  }

  @Post('single')
  @UseInterceptors(FileInterceptor('file'))
  async postSingleFile(@UploadedFile() file: File): Promise<string> {
    return undefined;
  }

  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files'))
  async postMultipleFiles(@UploadedFiles() files: File[]): Promise<string[]> {
    return undefined;
  }
}
