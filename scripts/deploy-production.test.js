#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createDeploymentPlan,
  deployProduction,
} from './deploy-production.js';

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function withTempDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'easyjobapps-deploy-'));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('refuses the default deploy from a canonical easyjobapps checkout', () => {
  withTempDir((dir) => {
    const sourceDir = join(dir, 'easyjobapps');
    mkdirSync(sourceDir);

    assert.throws(
      () => createDeploymentPlan({ cwd: sourceDir, argv: [] }),
      /source directory must be named "easyjobapps-staging"/,
    );
  });
});

test('uses ../easyjobapps by default from the staging mirror', () => {
  withTempDir((dir) => {
    const sourceDir = join(dir, 'easyjobapps-staging');
    mkdirSync(sourceDir);

    const plan = createDeploymentPlan({ cwd: sourceDir, argv: [] });

    assert.equal(plan.sourceIsStagingMirror, true);
    assert.equal(plan.explicitDestination, false);
    assert.equal(plan.destinationDir, join(dir, 'easyjobapps'));
  });
});

test('allows a non-staging source only with an explicit destination', () => {
  withTempDir((dir) => {
    const sourceDir = join(dir, 'easyjobapps');
    const destinationDir = join(dir, 'manual-production');
    mkdirSync(sourceDir);

    const plan = createDeploymentPlan({
      cwd: sourceDir,
      argv: ['--production-destination', destinationDir],
    });

    assert.equal(plan.sourceIsStagingMirror, false);
    assert.equal(plan.explicitDestination, true);
    assert.equal(plan.destinationDir, destinationDir);
  });
});

test('refuses to deploy to its own directory', () => {
  withTempDir((dir) => {
    const sourceDir = join(dir, 'easyjobapps-staging');
    mkdirSync(sourceDir);

    assert.throws(
      () => createDeploymentPlan({ cwd: sourceDir, argv: ['--dest', sourceDir] }),
      /destination resolves to the source directory/,
    );
  });
});

test('refuses to deploy into the source directory', () => {
  withTempDir((dir) => {
    const sourceDir = join(dir, 'easyjobapps-staging');
    mkdirSync(sourceDir);

    assert.throws(
      () => createDeploymentPlan({ cwd: sourceDir, argv: ['--dest', './production'] }),
      /destination is inside the source directory/,
    );
  });
});

test('refuses to deploy to an ancestor of the source directory', () => {
  withTempDir((dir) => {
    const sourceDir = join(dir, 'easyjobapps-staging');
    mkdirSync(sourceDir);

    assert.throws(
      () => createDeploymentPlan({ cwd: sourceDir, argv: ['--dest', dir] }),
      /destination is an ancestor of the source directory/,
    );
  });
});

test('copies visible top-level entries from staging to production', () => {
  withTempDir((dir) => {
    const sourceDir = join(dir, 'easyjobapps-staging');
    const destinationDir = join(dir, 'easyjobapps');
    mkdirSync(sourceDir);
    mkdirSync(join(sourceDir, 'nested'));
    mkdirSync(destinationDir);

    writeFileSync(join(sourceDir, 'visible.txt'), 'fresh');
    writeFileSync(join(sourceDir, '.secret'), 'do not copy');
    writeFileSync(join(sourceDir, 'nested', 'file.txt'), 'nested fresh');
    writeFileSync(join(destinationDir, 'stale.txt'), 'stale');

    deployProduction({
      cwd: sourceDir,
      argv: [],
      logger: { log() {} },
    });

    assert.equal(readFileSync(join(destinationDir, 'visible.txt'), 'utf8'), 'fresh');
    assert.equal(readFileSync(join(destinationDir, 'nested', 'file.txt'), 'utf8'), 'nested fresh');
    assert.equal(existsSync(join(destinationDir, '.secret')), false);
    assert.equal(existsSync(join(destinationDir, 'stale.txt')), false);
  });
});

let failures = 0;

for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`not ok - ${name}`);
    console.error(error.stack ?? error.message);
  }
}

if (failures > 0) {
  process.exitCode = 1;
} else {
  console.log(`${tests.length} deploy safety checks passed.`);
}
