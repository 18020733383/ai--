import { spawn } from 'child_process';

const start = (name, command) => {
  const child = spawn(command, {
    stdio: 'inherit',
    env: process.env,
    cwd: process.cwd(),
    shell: true,
    windowsHide: false
  });
  child.on('exit', (code) => {
    if (code && code !== 0) process.exitCode = code;
  });
  return child;
};

const dev = start('dev', 'npm run dev');
const manager = start('hero-manager', 'npm run hero-manager');

const shutdown = () => {
  dev.kill();
  manager.kill();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
