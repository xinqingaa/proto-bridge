#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targetRoot = path.join(repoRoot, 'examples/vue3-to-flutter/target-flutter');
const protoMain = path.join(targetRoot, 'lib/main_proto.dart');
const androidRoot = path.join(targetRoot, 'android');
const passthroughArgs = process.argv.slice(2).filter((arg) => arg !== '--');

step('Preparing Flutter Android target...');
if (!existsSync(androidRoot)) {
  await run('flutter', ['create', '--platforms=android', '.'], { cwd: targetRoot });
}

await run('flutter', ['pub', 'get'], { cwd: targetRoot });

const runArgs = ['run'];
if (existsSync(protoMain)) {
  runArgs.push('-t', 'lib/main_proto.dart');
  console.log('● Using generated Flutter entry lib/main_proto.dart');
} else {
  console.log('● Generated _proto entry not found. Run pnpm run example to generate pages; showing fallback app.');
}

if (passthroughArgs.length > 0) {
  runArgs.push(...passthroughArgs);
} else {
  const androidDevice = await findAndroidDevice();
  runArgs.push('-d', androidDevice.id);
  console.log(`● Using Android device ${androidDevice.name} (${androidDevice.id})`);
}

await run('flutter', runArgs, { cwd: targetRoot });

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: process.env,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code ?? 1}`));
    });
  });
}

function capture(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code ?? 1}\n${stderr}`));
    });
  });
}

async function findAndroidDevice() {
  const stdout = await capture('flutter', ['devices', '--machine'], { cwd: targetRoot });
  const devices = JSON.parse(stdout);
  const androidDevice = devices.find((device) => {
    return device.isSupported && String(device.targetPlatform).startsWith('android');
  });
  if (!androidDevice) {
    throw new Error('No supported Android device found. Start an emulator or connect a device, then rerun pnpm run example:android.');
  }
  return androidDevice;
}

function step(message) {
  console.log(`● ${message}`);
}
