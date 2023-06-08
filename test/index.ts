import { scanProject } from '../src/core'

// scanProject({ srcDir: 'examples/server/src' })
scanProject({
  srcDir: 'examples/.nest-client/examples/server/src',
  angularInjectable: true,
  suffix: 'sdk',
})
