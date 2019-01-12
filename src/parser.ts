import * as util from 'util';
import { AnnotationAST, ClassAST, ImportAST, StringAST } from './ast';

export function range(start, end, step) {
  const acc = [];
  for (; start <= end; ) {
    acc.push(start);
    start += step;
  }
  return acc;
}

export function isBetween(l, m, r) {
  return l <= m && m <= r;
}

export namespace parser {
  export type parseResult<T> = Array<[string, T]>;
  export type parser<T> = (s: string) => parseResult<T>;

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

  export function isWord(c: string) {
    return (
      isBetween('0', c, '9') ||
      isBetween('a', c, 'z') ||
      isBetween('A', c, 'Z') ||
      c === '_'
    );
  }

  export function genPrefixParser<T>(startsWith: string, f: parser<T>) {
    return (s: string) => {
      if (s.startsWith(startsWith)) {
        return f(s);
      } else {
        return [];
      }
    };
  }

  export function genKeywordParser(keyword: string) {
    return genPrefixParser(keyword, s => [
      [s, { type: 'keyword', value: keyword }],
    ]);
  }

  export function str(pattern: string): parser<string> {
    return (s: string) => {
      if (s.startsWith(pattern)) {
        return [[s.substring(pattern.length), pattern]];
      } else {
        return [];
      }
    };
  }

  export function or<A, B>(p1: parser<A>, p2: parser<B>): parser<A | B> {
    return (s: string) => {
      const res = p1(s);
      if (res.length === 0) {
        return p2(s);
      } else {
        return res;
      }
    };
  }

  export function orAll<A = any>(ps: Array<parser<A>>): parser<A> {
    let p = ps[0];
    if (!p) {
      console.error({ p, len: ps.length, ps });
      throw new Error('empty ps');
    }
    for (let i = 1; i < ps.length; i++) {
      p = or(p, ps[i]);
    }
    return p;
  }

  export function con<A, B>(p1: parser<A>, p2: parser<B>): parser<[A, B]> {
    return (s: string) => {
      const resX = p1(s);
      if (resX.length === 0) {
        return [];
      }
      const res: parseResult<[A, B]> = [];
      resX.forEach(([s, x]) => {
        const y = p2(s);
        y.forEach(([s, y]) => {
          res.push([s, [x, y]]);
        });
      });
      return res;
    };
  }

  /**
   * FIXME handle ambiguous cases
   * */
  export function conAll<A = any>(ps: Array<parser<A>>): parser<A[]> {
    const p = ps[0];
    if (!p) {
      console.error({ p, len: ps.length, ps });
      throw new Error('empty ps');
    }
    return (s: string) => {
      const xs: A[] = [];
      for (const p of ps) {
        const res = p(s);
        if (res.length === 0) {
          return [];
        }
        s = res[0][0];
        xs.push(res[0][1]);
      }
      return [[s, xs]];
    };
  }

  export let head = <A, B>(p: parser<[A, B]>): parser<A> =>
    map(p, ([a, b]) => a);
  export let tail = <A, B>(p1: parser<[A, B]>): parser<B> =>
    map(p1, ([a, b]) => b);

  export function map<A, B>(p: parser<A>, f: (a: A) => B): parser<B> {
    return (s: string) => {
      return p(s).map(([s, a]) => [s, f(a)] as [string, B]);
    };
  }

  /**
   * FIXME to support ambiguous result
   * */
  export function repeat<A>(p: parser<A>): parser<A[]> {
    return (s: string) => {
      const res: parseResult<A[]> = [];
      const xs: A[] = [];
      for (;;) {
        const x = p(s);
        if (x.length === 0) {
          break;
        }
        s = x[0][0];
        xs.push(x[0][1]);
      }
      res.push([s, xs]);
      return res;
    };
  }

  export function repeatAtLeastOnce<A>(p: parser<A>): parser<A[]> {
    return (s: string) =>
      con(p, repeat(p))(s).map(([s, [x, xs]]) => {
        const ys: A[] = [x, ...xs];
        return [s, ys] as [string, A[]];
      });
  }

  const failure: parser<never> = (s: string) => [];
  const success: <T>(x: T) => parser<T> = <T>(x: T) => (s: string) => [[s, x]];
  const strSuccess = <T>(s: string, x: T) => map(str(s), () => x);

  const maybe = p => or(p, success(false));

  const filterChar = (f: (c: string) => boolean): parser<string> => (
    s: string,
  ) => {
    if (f(s[0])) {
      return [[s.substring(1), s[0]]];
    } else {
      return [];
    }
  };

  const parseDigit = orAll(
    range(0, 9, 1).map(x => strSuccess(x.toString(), x)),
  );
  const parseIntStr = map(
    repeatAtLeastOnce(orAll(range(0, 9, 1).map(x => str(x.toString())))),
    xs => xs.join(''),
  );
  const parseInt = map(repeatAtLeastOnce(parseDigit), xs =>
    xs.reduce((acc, c) => acc * 10 + c),
  );

  const parseFloat = map(
    con(parseIntStr, or(tail(con(str('.'), parseIntStr)), success(''))),
    ([int, float]) => {
      if (float) {
        int = int + '.' + float;
      }
      return +int;
    },
  );

  const skipSpace = repeat(filterChar(c => isSpace(c)));

  const skipPrefixSpace = p => tail(con(skipSpace, p));
  const skipSuffixSpace = p => head(con(p, skipSpace));
  const skipAroundSpace = <A>(p: parser<A>): parser<A> =>
    map(conAll<any>([skipSpace, p, skipSpace]), ([l, m, r]) => m);

  const parseName = map(repeatAtLeastOnce(filterChar(c => isWord(c))), xs =>
    xs.join(''),
  );

  const parseString: parser<string> = (s: string) => {
    let quote = '';
    if (s[0] === '"') {
      quote = '"';
    } else if (s[0] === "'") {
      quote = "'";
    }
    if (!quote) {
      return [];
    }
    let acc = '';
    let i = 1;
    for (; i < s.length; ) {
      const c = s[i];
      if (c === quote) {
        return [[s.substring(i + 1), acc]];
      }
      if (s === '\\') {
        acc += s[i + 1];
        i += 2;
      } else {
        acc += c;
        i++;
      }
    }
  };
  const parseStringAST = map(parseString, s => {
    const c = new StringAST();
    c.value = s;
    return c;
  });

  const parseImportAST = map(
    conAll<any>([
      skipSuffixSpace(str('import')),
      str('{'),
      repeat(skipAroundSpace(or(parseName, str(',')))),
      str('}'),
      skipAroundSpace(str('from')),
      parseString,
    ]),
    xs => {
      const ctx = new ImportAST();
      ctx.names = xs[2].filter(x => x !== ',');
      ctx.from = xs[5];
      return ctx;
    },
  );
  const parseValue = orAll([parseStringAST]);

  // TODO not finished
  const parseClassAST = map(
    conAll<any>([
      maybe(str('export')),
      skipAroundSpace(str('class')),
      skipAroundSpace(parseName),
      skipAroundSpace(str('{')),
      repeat(
        orAll([
          skipAroundSpace(
            conAll<any>([
              str('constructor'),
              str('('),
              repeat(str('public')),
              str(')'),
            ]),
          ),
        ]),
      ),
      skipAroundSpace(str('}')),
    ]),
    xs => {
      const c = new ClassAST();
      c.export = !!xs[0];
      c.name = xs[2];
      return c;
    },
  );

  const parseAnnotationAST = map(
    conAll<any>([
      str('@'),
      parseName,
      conAll<string | StringAST>([str('('), parseValue, str(')')]),
    ]),
    xs => {
      const c = new AnnotationAST();
      c.name = xs[1];

      const args = xs[2];
      args.pop();
      args.shift();
      c.args = args.filter(x => x !== '');

      return c;
    },
  );

  const parseFileAST = repeat(
    skipAroundSpace(
      orAll<any>([str(';'), parseImportAST, parseAnnotationAST, parseClassAST]),
    ),
  );

  export function parseFile(
    s: string,
    onLine: (line: string) => void,
    onComplete: () => void,
  ) {
    console.debug('parse file');
    const p = parseFileAST;
    const res = p(s);
    console.debug(util.inspect(res[0][1], { depth: 99 }));
  }

  // FIXME these are not used
  [failure, parseInt, parseFloat, skipPrefixSpace].forEach(x => []);
}
