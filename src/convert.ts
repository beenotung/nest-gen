import { FileData } from './file';

/**
 * FIXME to parser to decode each level of block, with awareness to comment blocks
 *   this is can bug when the code has comments with curry bracket,
 *   and when the code has constructor
 * */
export function parseFile(
  controllerFile: FileData,
  onLine: (line: string) => void,
  onComplete: () => void,
) {
  // console.debug({ name: controllerFile.name });
  onLine("import { Injectable } from '@angular/core';\n");
  let s = '';
  // let insideClass = false;
  let insideMethod = false;
  let lastLevel = 0;
  let level = 0;
  for (let i = 0, n = controllerFile.content.length; i < n; i++) {
    const c = controllerFile.content[i];
    s += c;
    switch (c) {
      case '{':
        lastLevel = level;
        level++;
        break;
      case '}':
        lastLevel = level;
        level--;
        break;
      case '\n':
        if (/^import /.test(s)) {
          if (
            s.indexOf('@nestjs/common') !== -1 ||
            s.indexOf('@nestjs/platform-express') !== -1
          ) {
            // import {Body, Controller, Get, HttpStatus, Param, Post, Res} from '@nestjs/common';
            let ss = s.split('{');
            const line: string[] = [];
            line.push(ss[0], '{ ');
            ss = ss[1].split('}');
            const names = ss[0]
              .split(',')
              .map(s => s.trim())
              .filter(
                s => s !== 'Res' && s !== 'HttpStatus' && s !== 'HttpException',
              );
            names.push('injectNestClient');
            names.sort((a, b) => {
              a = a[0].toLowerCase();
              b = b[0].toLowerCase();
              return a === b ? 0 : a < b ? -1 : 1;
            });
            line.push(names.join(', '), ' }');
            line.push(
              ss[1]
                .replace('@nestjs/common', 'nest-client')
                .replace('@nestjs/platform-express', 'nest-client'),
            );
            s = line.join('');
          } else if (s.indexOf('..') !== -1) {
            console.warn('skip dependency: ' + s.replace('\n', ''));
            s = '';
          }
        } else if (s.indexOf('@Controller') !== -1) {
          onLine('@Injectable()\n');
        } else if (
          s.indexOf('export class ') !== -1 &&
          s.indexOf('Controller {') !== -1
        ) {
          s = s.replace('Controller {', 'Provider {');
          onLine(s);
          onLine('  constructor() {\n');
          onLine('    injectNestClient(this);\n');
          onLine('  }\n');
          onLine('\n');
          s = '';
          // insideClass = true;
        } else {
          // console.debug(`line[${lastLevel}-${level}]:${s}`.replace('\n', ''));
          if (
            (!insideMethod && (lastLevel === 1 && level === 2)) ||
            s.indexOf('@Res()') !== -1
          ) {
            /* method signature line */
            insideMethod = true;
            s = s
              .replace('@Res()res', '')
              .replace('@Res() res', '')
              .replace('(, ', '(');
            onLine(s);
            onLine('  '.repeat(level) + 'return undefined as any;\n');
            s = '';
          } else {
            /* not method signature line */
            if (level === 1) {
              insideMethod = false;
            } else {
              if (level > 1) {
                s = '';
              }
            }
          }
        }
        s = s.replace('    ', '  ');
        onLine(s);
        s = '';
    }
  }
  onComplete();
}
