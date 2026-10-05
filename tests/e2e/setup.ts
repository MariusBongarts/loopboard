import { execSync } from 'node:child_process';

// The CLI scenarios (cli.spec.ts) run the real `loopboard` binary, so build it first.
export default function setup(): void {
  try {
    execSync('pnpm build:app', { stdio: 'pipe' });
  } catch (e) {
    const { stdout = '', stderr = '' } = e as { stdout?: Buffer; stderr?: Buffer };
    throw new Error(`pnpm build:app failed:\n${stdout}${stderr}`);
  }
}
