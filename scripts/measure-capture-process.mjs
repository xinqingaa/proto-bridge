#!/usr/bin/env node
/**
 * Sample a command and its descendants without touching the Evidence Store.
 * Usage:
 *   node scripts/measure-capture-process.mjs --output /tmp/capture-metrics.json \
 *     --interval-ms 1000 -- pnpm test:e2e:runtime
 *
 * macOS/Linux use ps process CPU time and RSS. These are sampled observations,
 * not an exact accounting: short-lived processes can finish between samples;
 * summed RSS counts shared pages more than once. Other platforms still report
 * wall time/exit status and explicitly mark process metrics unavailable.
 * Child stdio is inherited; environment and command arguments are never saved.
 */
import { spawn, execFile } from 'node:child_process';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const args = process.argv.slice(2);
const divider = args.indexOf('--');
let output;
let intervalMs = 1000;
try {
  if (divider < 0 || divider === args.length - 1) throw new Error('A command after -- is required.');
  for (let i = 0; i < divider; i += 2) {
    if (args[i] === '--output' && args[i + 1]) output = path.resolve(args[i + 1]);
    else if (args[i] === '--interval-ms') intervalMs = Number(args[i + 1]);
    else throw new Error('Expected --output PATH or --interval-ms NUMBER before --.');
  }
  if (!output) throw new Error('--output PATH is required.');
  if (!Number.isInteger(intervalMs) || intervalMs < 100 || intervalMs > 60_000) {
    throw new Error('--interval-ms must be an integer between 100 and 60000.');
  }
} catch (error) {
  console.error(error.message);
  console.error('Usage: node scripts/measure-capture-process.mjs --output PATH [--interval-ms 1000] -- COMMAND [ARGS...]');
  process.exit(2);
}

const command = args.slice(divider + 1);
const startedAt = new Date().toISOString();
const start = performance.now();
const supported = process.platform === 'darwin' || process.platform === 'linux';
const observed = new Map();
const errors = new Set();
const samples = [];
let treePeakRssKiB = 0;
let peakProcessCount = 0;
let samplingInFlight;
let interruptedSignal;
let spawnFailed = false;
const child = spawn(command[0], command.slice(1), { stdio: 'inherit', detached: supported });

function parseCpuSeconds(value) {
  const [days, clock] = value.includes('-') ? value.split('-') : ['0', value];
  return Number(days) * 86400 + clock.split(':').reduce((total, part) => total * 60 + Number(part), 0);
}

async function sample() {
  if (!supported || !child.pid) return;
  try {
    // No command/args/env columns: process listings cannot leak command secrets.
    const { stdout } = await execFileAsync('ps', ['-axo', 'pid=,ppid=,pgid=,rss=,time=,lstart='], {
      maxBuffer: 16 * 1024 * 1024, timeout: 5000,
    });
    const processes = stdout.split('\n').flatMap((line) => {
      const match = line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(.+)$/);
      if (!match) return [];
      const [, pid, ppid, pgid, rss, cpu, born] = match;
      return [{ pid: Number(pid), ppid: Number(ppid), pgid: Number(pgid), rss: Number(rss), cpu: parseCpuSeconds(cpu), key: `${pid}:${born}` }];
    });
    const tree = new Set([child.pid]);
    // The dedicated process group retains ordinary descendants after root exit.
    for (const item of processes) if (item.pgid === child.pid || observed.has(item.key)) tree.add(item.pid);
    let changed = true;
    while (changed) {
      changed = false;
      for (const item of processes) {
        if (tree.has(item.ppid) && !tree.has(item.pid)) { tree.add(item.pid); changed = true; }
      }
    }
    let rssKiB = 0;
    let processCount = 0;
    for (const item of processes) {
      if (!tree.has(item.pid)) continue;
      rssKiB += item.rss;
      processCount++;
      observed.set(item.key, Math.max(observed.get(item.key) ?? 0, item.cpu));
    }
    treePeakRssKiB = Math.max(treePeakRssKiB, rssKiB);
    peakProcessCount = Math.max(peakProcessCount, processCount);
    samples.push({ elapsedMs: Math.round(performance.now() - start), processCount, treeRssKiB: rssKiB,
      observedCpuSeconds: Number([...observed.values()].reduce((sum, cpu) => sum + cpu, 0).toFixed(3)) });
  } catch (error) {
    // Keep the benchmark running even when ps is absent or forbidden.
    errors.add(`ps unavailable (${error.code ?? 'unknown error'})`);
  }
}

function queueSample() {
  // A slow/blocked ps must not accumulate a backlog of pending samples.
  if (!samplingInFlight) samplingInFlight = sample().finally(() => { samplingInFlight = undefined; });
  return samplingInFlight;
}

function signalTree(signal) {
  try {
    if (supported && child.pid) process.kill(-child.pid, signal);
    else child.kill(signal);
  } catch (error) {
    if (error.code !== 'ESRCH') errors.add(`process cleanup failed (${error.code ?? 'unknown error'})`);
  }
}

const handlers = new Map(['SIGINT', 'SIGTERM', 'SIGHUP'].map((signal) => {
  const handler = () => { interruptedSignal = signal; signalTree(signal); };
  process.on(signal, handler);
  return [signal, handler];
}));

queueSample();
const timer = setInterval(queueSample, intervalMs);
const result = await new Promise((resolve) => {
  child.once('error', (error) => {
    spawnFailed = true;
    errors.add(`command could not start (${error.code ?? 'unknown error'})`);
    resolve({ exitCode: 127, signal: null });
  });
  child.once('exit', (exitCode, signal) => resolve({ exitCode, signal }));
});
const wallTimeMs = Math.round(performance.now() - start);
const endedAt = new Date().toISOString();
clearInterval(timer);
await queueSample();
// The command owns its detached group. Do not leave browser descendants running.
signalTree('SIGTERM');
if (supported && child.pid) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  signalTree('SIGKILL');
}
for (const [signal, handler] of handlers) process.off(signal, handler);

const measurementsAvailable = supported && observed.size > 0;
if (supported && samples.length > 0 && observed.size === 0) errors.add('Command exited before a process-tree member could be sampled.');
const report = {
  schemaVersion: 1, startedAt, endedAt, recordedAt: new Date().toISOString(), platform: process.platform,
  command: { executable: command[0], argumentCount: command.length - 1 },
  wallTimeMs, exitCode: result.exitCode, signal: result.signal ?? interruptedSignal ?? null,
  measurement: {
    method: measurementsAvailable ? 'sampled-ps-process-tree' : 'unavailable', intervalMs,
    sampleCount: samples.length, observedProcessCount: observed.size,
    sampledCpuSeconds: measurementsAvailable ? Number([...observed.values()].reduce((sum, value) => sum + value, 0).toFixed(3)) : null,
    sampledPeakTreeRssKiB: measurementsAvailable ? treePeakRssKiB : null,
    sampledPeakProcessCount: measurementsAvailable ? peakProcessCount : null,
    limitations: [
      'CPU is the sum of maximum observed per-process cumulative CPU time; processes ending between samples can be missed or undercounted.',
      'Peak RSS is the largest sampled sum across the tree; shared pages may be counted repeatedly and peaks between samples are missed.',
      'Descendants that detach and exit before observation cannot be attributed; these are sampled estimates, not exact resource accounting.',
      ...(!supported ? ['Process metrics require macOS or Linux ps; only wall time and exit status are available on this platform.'] : []),
    ],
  }, errors: [...errors], samples,
};
await mkdir(path.dirname(output), { recursive: true });
const temp = `${output}.tmp-${process.pid}`;
await writeFile(temp, `${JSON.stringify(report, null, 2)}\n`);
await rename(temp, output);
console.log(`Capture process measurements saved to ${output}`);
process.exitCode = spawnFailed ? 127 : result.exitCode ?? ({ SIGINT: 130, SIGTERM: 143, SIGHUP: 129 }[result.signal ?? interruptedSignal] ?? 1);
