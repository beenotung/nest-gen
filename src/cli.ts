#!/usr/bin/env node
import { scanProject } from './core';

let srcDir: string | undefined;
let angularInjectable = false;
let suffix: string | undefined;

for (let i = 2; i < process.argv.length; i++) {
  let arg = process.argv[i];
  switch (arg) {
    case '--angular':
      angularInjectable = true;
      break;
    case '--suffix':
      i++;
      suffix = process.argv[i];
      if (!suffix) {
        console.error('missing suffix in argument');
        process.exit(1);
      }
      break;
    default:
      srcDir = arg;
  }
}

scanProject({
  srcDir,
  angularInjectable,
  suffix,
});
