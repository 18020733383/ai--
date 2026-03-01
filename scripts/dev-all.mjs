import { spawn } from 'child_process';

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const start = (name, args) => {
  const child = spawn(npmCmd, args, {
    stdio: 'inherit',
    env: process.env,
    cwd: process.cwd()
  });
  child.on('exit', (code) => {
    if (code && code !== 0) process.exitCode = code;
  });
  return child;
};

const dev = start('dev', ['run', 'dev']);
const manager = start('hero-manager', ['run', 'hero-manager']);

const shutdown = () => {
  dev.kill('SIGINT');
  manager.kill('SIGINT');
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
