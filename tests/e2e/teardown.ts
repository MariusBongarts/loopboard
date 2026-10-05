import { rm } from 'node:fs/promises';

export default async function teardown(): Promise<void> {
  const root = process.env.LOOPBOARD_E2E_ROOT;
  if (root) await rm(root, { recursive: true, force: true });
}
