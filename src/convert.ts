import { EventEmitter } from 'events';
import * as util from 'util';
import { FileData } from './file';
import { parser } from './parser';

export namespace parserv2 {
  export function isSpace(c: string) {
    switch (c) {
      case ' ':
      case '\n':
      case '\t':
      case '\0':
        return true;
      default:
        return false;
    }
  }

  export function isBetween(l, m, r) {
    return l <= m && m <= r;
  }

  export function isNum(c: string) {
    return isBetween('0', c, '9');
  }

  export function isWord(c: string) {
    return (
      isBetween('0', c, '9') ||
      isBetween('a', c, 'z') ||
      isBetween('A', c, 'Z') ||
      c === '_'
    );
  }

  export function isKeyword(s: string) {
    switch (s) {
      case 'import':
      case 'if':
        return true;
      default:
        return false;
    }
  }

  export type token =
    | { type: 'keyword'; value: string }
    | { type: 'space'; value: string }
    | { type: 'number'; value: number }
    | { type: 'name'; value: string }
    | { type: 'one_line_comment'; value: string }
    | { type: 'multi_line_comment'; value: string };

  export function mkTokenStream(s: string) {
    const stream = new EventEmitter();
    let acc = '';
    let offset = 0;

    function emit(token: token) {
      return stream.emit('data', token);
    }

    function emitWord(s: string) {
      if (s.length === 0) {
        return;
      }
      /* tslint:disable */
      if ((s as any) == +s) {
        /* tslint:enable */
        emit({ type: 'number', value: +s });
      } else if (isKeyword(s)) {
        emit({ type: 'keyword', value: s });
      } else {
        emit({ type: 'name', value: s });
      }
    }

    function emitSpace(s: string) {
      emit({ type: 'space', value: s });
    }

    function parseNum(s: string, offset: number): [string, number, number] {
      let acc = 0;
      for (; offset < s.length; ) {
        const c = s[offset];
        if (isNum(c)) {
          acc = acc * 10 + +c;
        } else {
          break;
        }
      }
      return [s, offset, acc];
    }

    function parse(s: string, offset: number) {
      let c = '';
      for (; offset < s.length; ) {
        c = s[offset];
        if (isSpace(c)) {
          emitSpace(c);
        } else if (isNum(c)) {
          let num: number;
          [s, offset, num] = parseNum(s, offset);
          emit({ type: 'number', value: num });
        }
        offset++;
      }
    }

    let start = () => {
      let c = '';
      const loopMode = {
        normal: () => {
          if (isSpace(c)) {
            emitWord(acc);
            acc = '';
            emitSpace(c);
          } else if (isWord(c)) {
            acc += c;
          } else {
            emitWord(acc);
            acc = '';
            acc = c;
          }
        },
        oneLineComment: () => {
          const start = offset + 1;
          let end = s.indexOf('\n', start);
          if (end === -1) {
            // in case the file is not terminated by newline
            end = s.length;
          }
          const comment = s.substring(start, end);
          offset = end + 1;
          emit({ type: 'one_line_comment', value: comment });
        },
        multilineComment: () => {
          const start = offset + 1;
          const end = s.indexOf('*/', start);
          if (end === -1) {
            throw new Error('multi-line command is not closed');
          }
          const comment = s.substring(start, end);
          offset = end + 2;
          emit({ type: 'multi_line_comment', value: comment });
        },
      };
      for (; offset < s.length; ) {
        if (s.startsWith('//', offset)) {
          loopMode.oneLineComment();
        } else if (s.startsWith('/*', offset)) {
          loopMode.multilineComment();
        }
        c = s[offset];
        offset++;
        loopMode.normal();
      }
      stream.emit('complete');
    };
    start = () => {
      parse(s, 0);
      stream.emit('complete');
    };
    return Object.assign(stream, { start });
  }

  abstract class Context {
    closed = false;

    abstract toSource(): string;

    addContext(context: Context) {
      throw new Error(
        '[' +
          this.constructor.name +
          ']: not supported context: ' +
          util.inspect(context),
      );
    }

    addToken(token: token) {
      throw new Error(
        '[' +
          this.constructor.name +
          ']: not supported token: ' +
          util.inspect(token),
      );
    }
  }

  class SpaceContext extends Context {
    constructor(public space: string) {
      super();
    }

    addContext(context: Context) {
      throw new Error('not supported');
    }

    toSource(): string {
      return this.space;
    }
  }

  class FileContext extends Context {
    children: Context[] = [];

    addContext(context: Context) {
      this.children.push(context);
    }

    addToken(token: token) {
      if (token.type === 'space') {
        this.addContext(new SpaceContext(token.value));
        return;
      }
      super.addToken(token);
    }

    toSource() {
      return this.children.map(x => x.toSource()).join('');
    }
  }

  class ImportContext extends Context {
    acc = '';
    names: string[] = [];
    mode = 'init';
    from = '';

    addContext(context: Context) {
      // e.g. comment
      this.acc += context.toSource();
    }

    addToken(token: token) {
      if (token.type === 'space') {
        return;
      }
      if (this.mode === 'init') {
        if (token.type === 'name' && token.value === '{') {
          this.mode = 'names';
          return;
        }
        if (token.type === 'name' && token.value === 'from') {
          this.mode = 'from';
          return;
        }
      }
      if (this.mode === 'names') {
        if (token.type === 'name' && token.value === '}') {
          this.mode = 'init';
        }
        if (token.type === 'name') {
          this.names.push(token.value);
          return;
        }
      }
      if (this.mode === 'from') {
        super.addToken(token);
        if (token.type === 'name') {
          this.from = token.value;
          return;
        }
      }
      if (token.type === 'name' && token.value === ';') {
        this.closed = true;
        return;
      }
      super.addToken(token);
    }

    toSource() {
      return `// import : ${this.acc}\n`;
    }
  }

  export function parseFile(
    s: string,
    onLine: (line: string) => void,
    onComplete: () => void,
  ) {
    const inStream = mkTokenStream(s);
    const rootContext = new FileContext();
    const stack: Context[] = [rootContext];
    const top = () => stack[stack.length - 1];
    inStream.on('data', (token: token) => {
      console.debug('token:', token);
      if (token.type === 'keyword') {
        if (token.value === 'import') {
          const context = new ImportContext();
          top().addContext(context);
          stack.push(context);
          return;
        }
      }
      // if (token.type === 'space') {
      //   let context = new SpaceContext(token.value);
      //   top().addContext(context);
      //   return;
      // }
      try {
        top().addToken(token);
        if (top().closed) {
          stack.pop();
        }
      } catch (e) {
        console.error();
        console.error(e);
        console.error('top:', util.inspect(top(), { depth: 999 }));
        console.error('root:', util.inspect(rootContext, { depth: 999 }));
        process.exit(1);
      }
      // onLine(JSON.stringify(token) + '\n');
    });
    inStream.on('complete', () => {
      console.debug('complete');
      console.debug('== s begin ==');
      console.debug(s);
      console.debug('== s end  ===');
      rootContext
        .toSource()
        .split('\n')
        .forEach(line => onLine(line + '\n'));
      console.debug('root:', util.inspect(rootContext, { depth: 999 }));
      onComplete();
    });
    inStream.start();
  }
}

export function parseFile(
  controllerFile: FileData,
  onLine: (line: string) => void,
  onComplete: () => void,
) {
  parser.parseFile(controllerFile.content, onLine, onComplete);
}

/**
 * FIXME to parser to decode each level of block, with awareness to comment blocks
 *   this is can bug when the code has comments with curry bracket,
 *   and when the code has constructor
 * */
export function parseFilev1(
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
          if (s.indexOf('@nestjs/common') !== -1) {
            // import {Body, Controller, Get, HttpStatus, Param, Post, Res} from '@nestjs/common';
            let ss = s.split('{');
            const line: string[] = [];
            line.push(ss[0], '{ ');
            ss = ss[1].split('}');
            const names = ss[0]
              .split(',')
              .map(s => s.trim())
              .filter(s => s !== 'Res' && s !== 'HttpStatus');
            names.push('injectNestClient');
            names.sort((a, b) => {
              a = a[0].toLowerCase();
              b = b[0].toLowerCase();
              return a === b ? 0 : a < b ? -1 : 1;
            });
            line.push(names.join(', '), ' }');
            line.push(ss[1].replace('@nestjs/common', 'nest-client'));
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
            onLine('  '.repeat(level) + 'return undefined;\n');
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
