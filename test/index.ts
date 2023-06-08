import { scanProject } from '../src/core'

scanProject({
  srcDir: 'examples/server/src',
  // srcDir: 'examples/.nest-client/examples/server/src',
  angularInjectable: true,
  suffix: 'sdk',
})
