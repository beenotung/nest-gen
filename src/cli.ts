import { scanProject } from './core';

let srcDir: string | undefined;
let angularInjectable = false;

process.argv.slice(2).forEach((arg) => {
  if (arg === '--angular') {
    angularInjectable = true;
  } else {
    srcDir = arg;
  }
});

scanProject({
  srcDir,
  angularInjectable,
});
