import * as fs from 'fs';
import { join } from 'path';
import * as util from 'util';

export interface FileInfo {
  path: string;
  name: string;
  folder: string;
}

export interface FileData extends FileInfo {
  content: string;
}

const stat = util.promisify(fs.stat);
const readDir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

export function scanFiles(folder: string, onFile: (file: FileInfo) => void) {
  readDir(folder).then(files => {
    files.forEach(file => {
      const path = join(folder, file);
      stat(path).then(stats => {
        if (stats.isDirectory()) {
          scanFiles(path, onFile);
        } else {
          onFile({
            path,
            name: file,
            folder,
          });
        }
      });
    });
  });
}

export function scanControllerFiles(
  folder: string,
  onFile: (file: FileData) => void,
) {
  scanFiles(folder, file => {
    if (file.name.indexOf('.spec.') !== -1) {
      return;
    }
    if (file.name.indexOf('.controller') === -1) {
      return;
    }
    readFile(file.path).then(data => {
      onFile(
        Object.assign(
          {
            content: data.toString(),
          },
          file,
        ),
      );
    });
  });
}

export function saveProviderFile(file: FileData) {
  writeFile(file.path, file.content);
}
