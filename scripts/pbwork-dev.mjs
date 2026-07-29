import { spawn } from 'node:child_process';

function run(command, args, options = {}) {
  return spawn(command, args, {
    stdio: 'inherit',
    env: process.env,
    ...options,
  });
}

const build = run('pnpm', ['--filter', '@proto-bridge/core', 'build']);
const buildExit = await new Promise((resolve) => build.once('exit', resolve));
if (buildExit !== 0) process.exit(Number(buildExit ?? 1));

const service = run('pnpm', [
  '--filter',
  '@proto-bridge/local-service',
  'exec',
  'tsx',
  '--conditions=source',
  'src/index.ts',
]);
const workbench = run('pnpm', [
  '--filter',
  '@proto-bridge/pbwork',
  'exec',
  'vite',
]);

let closing = false;
function stop(signal = 'SIGTERM') {
  if (closing) return;
  closing = true;
  service.kill(signal);
  workbench.kill(signal);
}

process.once('SIGINT', () => stop('SIGINT'));
process.once('SIGTERM', () => stop('SIGTERM'));

const exitCode = await new Promise((resolve) => {
  service.once('exit', (code) => {
    stop();
    resolve(code);
  });
  workbench.once('exit', (code) => {
    stop();
    resolve(code);
  });
});
process.exit(Number(exitCode ?? 0));
