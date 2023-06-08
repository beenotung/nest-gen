# nest-gen

Source code generation for API client from nest.js controller.

[![npm Package Version](https://img.shields.io/npm/v/nest-gen.svg)](https://www.npmjs.com/package/nest-gen)

## Installation

```bash
npm i -D nest-gen
```

## Usage

```bash
npx nest-gen [options]
```

### CLI Options

```bash
  --angular:
    To include angular @Injectable() above the controller class.
    Default not activated.

  --suffix <suffix>:
    To indicate the suffix of the controller class.
    E.g. service, client, provider, sdk
    Default: service
```

### Usage Example

```bash
cd the-nestjs-project

## for Angular Projects
npx nest-gen --angular

## for non-Angular projects
npx nest-gen --suffix client
```

## License

This project is licensed with [BSD-2-Clause](./LICENSE)

This is free, libre, and open-source software. It comes down to four essential freedoms [[ref]](https://seirdy.one/2021/01/27/whatsapp-and-the-domestication-of-users.html#fnref:2):

- The freedom to run the program as you wish, for any purpose
- The freedom to study how the program works, and change it so it does your computing as you wish
- The freedom to redistribute copies so you can help others
- The freedom to distribute copies of your modified versions to others
