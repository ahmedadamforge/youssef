import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js'
export default function config(phase) {
  return {
    distDir: process.env.NEXT_BUILD_DIR || (phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next-app'),
    // Keep the Windows build in the parent process to avoid worker filesystem failures.
    experimental: { webpackBuildWorker: process.platform === 'win32' ? false : undefined },
  }
}
