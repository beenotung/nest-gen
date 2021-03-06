#!/usr/bin/env node
import mkdirp = require('async-mkdirp');
import * as fs from 'fs';
import * as util from 'util';
import { parseFile } from './convert';
import { FileInfo, scanControllerFiles } from './file';

const writeFile = util.promisify(fs.writeFile);
const appendFile = util.promisify(fs.appendFile);

const inFolder = process.argv[2] || 'src';
const outFolder = process.argv[3] || 'out';

function renameFile(controllerFile: string) {
  return controllerFile.replace('.controller.', '.provider.');
}

scanControllerFiles(inFolder, inFile => {
  const outFile: FileInfo = {
    folder: inFile.folder,
    name: renameFile(inFile.name),
    path: renameFile(inFile.path.replace(inFolder, outFolder)),
  };
  const folderPath = outFile.path.replace(new RegExp(outFile.name + '$'), '');
  let p = mkdirp(folderPath);
  p = p.then(() => writeFile(outFile.path, ''));
  parseFile(
    inFile,
    line => {
      p = p.then(() => appendFile(outFile.path, line));
    },
    () => {
      p.then(() => {
        // console.log('done.', outFile);
        console.log('processed: ' + outFile.path);
      }).catch(e => {
        console.error(e);
      });
    },
  );
});
