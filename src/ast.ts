export abstract class AST {
  abstract toSource(): string;
}

export class FileAST extends AST {
  children: AST[] = [];

  toSource() {
    return this.children.map(x => x.toSource()).join('');
  }
}

export class ImportAST extends AST {
  names: string[];
  from: string;

  toSource() {
    return `import { ${this.names.join(', ')} } from ${this.from};\n`;
  }
}

export class AnnotationAST extends AST {
  name: string;
  args: AST[];

  toSource() {
    return `@${this.name}(${this.args.join(', ')})\n`;
  }
}

export class StringAST extends AST {
  /* without quotation */
  value: string;

  toSource() {
    return JSON.stringify(this.value);
  }
}

export class ClassAST extends AST {
  export: boolean;
  name: string;
  extend?: string;

  extendStr() {
    return this.extend ? 'extends ' + this.extend : '';
  }

  toSource() {
    return `${this.export ? 'export ' : ''} class ${
      this.name
    } ${this.extendStr()} {\n
  // class body
}`;
  }
}

export class SpaceAST extends AST {
  constructor(public space: string) {
    super();
  }

  toSource(): string {
    return this.space;
  }
}
