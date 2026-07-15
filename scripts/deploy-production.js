#!/usr/bin/env node

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
} from 'node:fs';
import {
  basename,
  dirname,
  isAbsolute,
  relative,
  resolve,
} from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const STAGING_DIR_NAME = 'easyjobapps-staging';
const PRODUCTION_DIR_NAME = 'easyjobapps';

export const usage = `Usage: node scripts/deploy-production.js [--production-destination /path] [--dry-run]

Default Trogdor behavior:
  Run from a source directory named ${STAGING_DIR_NAME}; deploys to ../${PRODUCTION_DIR_NAME}.

Safety:
  From any other source directory, --production-destination is required.
  The destination cannot be the source directory, inside the source directory,
  or an ancestor of the source directory.`;

export function parseArgs(argv) {
  const options = {
    dryRun: false,
    help: false,
    productionDestination: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--production-destination' || arg === '--dest') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`Missing value for ${arg}.`);
      }
      options.productionDestination = value;
      index += 1;
      continue;
    }

    if (arg.startsWith('--production-destination=')) {
      options.productionDestination = arg.slice('--production-destination='.length);
      continue;
    }

    if (arg.startsWith('--dest=')) {
      options.productionDestination = arg.slice('--dest='.length);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}.`);
  }

  if (options.productionDestination === '') {
    throw new Error('Production destination cannot be empty.');
  }

  return options;
}

function canonicalPath(inputPath) {
  const resolvedPath = resolve(inputPath);
  let existingPath = resolvedPath;
  const missingParts = [];

  while (!existsSync(existingPath)) {
    const parentPath = dirname(existingPath);
    if (parentPath === existingPath) {
      return resolvedPath;
    }
    missingParts.unshift(basename(existingPath));
    existingPath = parentPath;
  }

  return resolve(realpathSync(existingPath), ...missingParts);
}

function isSubpath(childPath, parentPath) {
  const childRelativePath = relative(parentPath, childPath);
  return childRelativePath !== ''
    && !childRelativePath.startsWith('..')
    && !isAbsolute(childRelativePath);
}

export function createDeploymentPlan({ cwd = process.cwd(), argv = [] } = {}) {
  const options = parseArgs(argv);
  const sourceDir = resolve(cwd);

  if (options.help) {
    return { help: true, options, sourceDir };
  }

  const sourceIsStagingMirror = basename(sourceDir) === STAGING_DIR_NAME;
  const hasExplicitDestination = Boolean(options.productionDestination);

  if (!sourceIsStagingMirror && !hasExplicitDestination) {
    throw new Error(
      `Refusing default production deploy from "${sourceDir}". `
      + `The source directory must be named "${STAGING_DIR_NAME}", `
      + 'or you must pass --production-destination explicitly.',
    );
  }

  const destinationArg = options.productionDestination ?? `../${PRODUCTION_DIR_NAME}`;
  const destinationDir = resolve(sourceDir, destinationArg);
  const sourceCanonical = canonicalPath(sourceDir);
  const destinationCanonical = canonicalPath(destinationDir);

  if (sourceCanonical === destinationCanonical) {
    throw new Error(
      `Refusing production deploy because destination resolves to the source directory: ${destinationDir}`,
    );
  }

  if (isSubpath(destinationCanonical, sourceCanonical)) {
    throw new Error(
      `Refusing production deploy because destination is inside the source directory: ${destinationDir}`,
    );
  }

  if (isSubpath(sourceCanonical, destinationCanonical)) {
    throw new Error(
      `Refusing production deploy because destination is an ancestor of the source directory: ${destinationDir}`,
    );
  }

  if (dirname(destinationCanonical) === destinationCanonical) {
    throw new Error('Refusing production deploy to the filesystem root.');
  }

  return {
    destinationDir,
    dryRun: options.dryRun,
    explicitDestination: hasExplicitDestination,
    sourceDir,
    sourceIsStagingMirror,
  };
}

function assertDirectory(path, label) {
  if (!existsSync(path)) {
    throw new Error(`${label} does not exist: ${path}`);
  }

  if (!statSync(path).isDirectory()) {
    throw new Error(`${label} is not a directory: ${path}`);
  }
}

export function deployProduction({ cwd = process.cwd(), argv = [], logger = console } = {}) {
  const plan = createDeploymentPlan({ cwd, argv });

  if (plan.help) {
    logger.log(usage);
    return plan;
  }

  assertDirectory(plan.sourceDir, 'Source directory');
  assertDirectory(dirname(plan.destinationDir), 'Destination parent directory');

  const entries = readdirSync(plan.sourceDir, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith('.'));

  if (plan.dryRun) {
    logger.log(`Would deploy ${plan.sourceDir} -> ${plan.destinationDir}`);
    logger.log(`Would copy ${entries.length} visible top-level entries.`);
    return plan;
  }

  rmSync(plan.destinationDir, { recursive: true, force: true });
  mkdirSync(plan.destinationDir, { recursive: true });

  for (const entry of entries) {
    cpSync(
      resolve(plan.sourceDir, entry.name),
      resolve(plan.destinationDir, entry.name),
      { dereference: false, recursive: true },
    );
  }

  logger.log(`Deployed ${plan.sourceDir} -> ${plan.destinationDir}`);
  logger.log(`Copied ${entries.length} visible top-level entries.`);

  return plan;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    deployProduction({ argv: process.argv.slice(2) });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
