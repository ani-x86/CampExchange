import 'dotenv/config';
import { spawnSync } from 'node:child_process';

const run = (): void => {
  let databaseUrl: URL;
  try {
    databaseUrl = new URL(process.env.DATABASE_URL ?? '');
  } catch {
    console.error('Tests require a valid PostgreSQL DATABASE_URL.');
    process.exitCode = 1;
    return;
  }

  if (
    !['postgresql:', 'postgres:'].includes(databaseUrl.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(databaseUrl.hostname) ||
    !['/camp_exchange', '/camp_exchange_test'].includes(databaseUrl.pathname)
  ) {
    console.error('Tests refused: only local Camp-Exchange database URLs are allowed.');
    process.exitCode = 1;
    return;
  }

  const npmExecPath = process.env.npm_execpath;
  if (!npmExecPath) {
    console.error('Tests must be run through an npm script.');
    process.exitCode = 1;
    return;
  }

  databaseUrl.pathname = '/camp_exchange_test';
  const testEnvironment = { ...process.env, DATABASE_URL: databaseUrl.toString(), NODE_ENV: 'test' };
  const migrate = spawnSync(
    process.execPath,
    [npmExecPath, 'exec', '--', 'prisma', 'migrate', 'deploy'],
    { stdio: 'inherit', env: testEnvironment }
  );
  if (migrate.error || migrate.status !== 0) {
    console.error('Test database migration failed; Vitest was not started.');
    process.exitCode = 1;
    return;
  }

  const tests = spawnSync(
    process.execPath,
    [npmExecPath, 'exec', '--', 'vitest', 'run'],
    { stdio: 'inherit', env: testEnvironment }
  );
  if (tests.error || tests.status !== 0) process.exitCode = 1;
};

run();
