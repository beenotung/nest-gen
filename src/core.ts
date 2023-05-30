import * as fs from 'fs';
import * as path from 'path';
import { FunctionDeclaration, Project, SourceFile } from 'ts-morph';

const skipNamedImports = ['HttpException', 'HttpStatus', 'Req', 'Res'];
const skipDecorators = ['Req', 'Res'];

export function scanProject(options?: {
  srcDir?: string; // default 'src'
  destDir?: string; // default 'out'
  angularInjectable?: boolean; // default false
}) {
  const srcDir = path.resolve(
    options && options.srcDir ? options.srcDir : 'src',
  );
  const destDir = path.resolve(
    options && options.destDir ? options.destDir : 'out',
  );
  const cwd = process.cwd();

  const project = new Project();

  let paths = srcDir;
  if (!paths.endsWith('/')) {
    paths += '/';
  }
  paths += '**/*.controller.ts';
  project.addSourceFilesAtPaths(paths);

  project.getSourceFiles().forEach((sourceFile) => {
    console.log(
      'process controller:',
      path.relative(cwd, sourceFile.getFilePath()),
    );

    let hasImportInjectNestClient = false;

    sourceFile.getImportDeclarations().forEach((importDeclaration) => {
      const ast = importDeclaration.getStructure();

      if (ast.moduleSpecifier.endsWith('.service')) {
        importDeclaration.remove();
        return;
      }

      if (Array.isArray(ast.namedImports)) {
        const namedImports = ast.namedImports.filter(
          (ast) =>
            !(typeof ast === 'object' && skipNamedImports.includes(ast.name)),
        );
        if (namedImports.length !== ast.namedImports.length) {
          ast.namedImports = namedImports;
          importDeclaration.set(ast);
        }
        if (!hasImportInjectNestClient) {
          ast.namedImports.push({
            name: 'injectNestClient',
          });
          importDeclaration.set(ast);
          hasImportInjectNestClient = true;
        }
      }

      if (
        ast.moduleSpecifier === '@nestjs/common' ||
        ast.moduleSpecifier === '@nestjs/platform-express'
      ) {
        ast.moduleSpecifier = 'nest-client';
        importDeclaration.set(ast);
      } else if (ast.moduleSpecifier.startsWith('.')) {
        const srcFilePath = getImportPath(sourceFile, ast.moduleSpecifier);
        if (!srcFilePath) {
          console.error('Failed to find imported file:', {
            sourceFile: path.relative(cwd, sourceFile.getFilePath()),
            importModuleSpecifier: ast.moduleSpecifier,
          });
        } else {
          const destFilePath = srcFilePath.replace(srcDir, destDir);
          console.log('copy imported file:', path.relative(cwd, srcFilePath));
          fs.copyFileSync(srcFilePath, destFilePath);
        }
      }
    });

    if (!hasImportInjectNestClient) {
      sourceFile.insertImportDeclaration(0, {
        namedImports: [
          {
            name: 'injectNestClient',
          },
        ],
        moduleSpecifier: 'nest-client',
      });
    }

    if (options && options.angularInjectable) {
      sourceFile.insertImportDeclaration(0, {
        namedImports: [{ name: 'Injectable' }],
        moduleSpecifier: '@angular/core',
      });
    }

    sourceFile.getFunctions().forEach((functionDeclaration) => {
      if (!functionDeclaration.isExported()) {
        functionDeclaration.remove();
      }
    });

    sourceFile.getClasses().forEach((classDeclaration) => {
      if (!classDeclaration.isExported()) {
        classDeclaration.remove();
        return;
      }

      classDeclaration.getMethods().forEach((methodDeclaration) => {
        if (methodDeclaration.getScope() !== 'public') {
          methodDeclaration.remove();
          return;
        }
        methodDeclaration.setBodyText('throw new Error("stub")');
      });
      const ast = classDeclaration.getStructure();
      const className = ast.name;
      if (className && className.endsWith('Controller')) {
        ast.name = className.replace(/Controller$/, 'Client');
        classDeclaration.set(ast);

        if (options && options.angularInjectable) {
          classDeclaration.insertDecorator(0, {
            name: 'Injectable',
            arguments: [],
          });
        }

        classDeclaration.getConstructors().forEach((constructorDeclaration) => {
          constructorDeclaration.remove();
        });
        classDeclaration.insertConstructor(0, {
          statements: ['injectNestClient(this)'],
        });

        classDeclaration.getMethods().forEach((methodDeclaration) => {
          methodDeclaration.getParameters().forEach((parameterDeclaration) => {
            if (!parameterDeclaration.getTypeNode()) {
              parameterDeclaration.setType('string');
            }
            parameterDeclaration
              .getDecorators()
              .forEach((decoratorDeclaration) => {
                const name = decoratorDeclaration.getName();
                if (skipDecorators.includes(name)) {
                  decoratorDeclaration.remove();
                  parameterDeclaration.remove();
                }
              });
          });
        });
      }
    });

    // console.log(sourceFile.getText())
    const srcFilePath = sourceFile.getFilePath();
    const destFilePath = srcFilePath
      .replace(srcDir, destDir)
      .replace('.controller.', '.client.');

    fs.mkdirSync(path.dirname(destFilePath), { recursive: true });
    fs.writeFileSync(destFilePath, sourceFile.getText());
  });
}

function getImportPath(sourceFile: SourceFile, moduleSpecifier: string) {
  const filePath = path.resolve(
    path.dirname(sourceFile.getFilePath()),
    moduleSpecifier,
  );
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  if (fs.existsSync(filePath + '.ts')) {
    return filePath + '.ts';
  }
  if (fs.existsSync(filePath + '.js')) {
    return filePath + '.js';
  }
  return null;
}
