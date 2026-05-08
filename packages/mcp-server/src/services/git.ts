import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dedupe, splitLines, toPosix } from '../utils/args.js';

const execFileAsync = promisify(execFile);

export async function collectChangedFiles(targetRoot: string, gitBase: string | undefined): Promise<string[]> {
  const args = gitBase ? ['diff', '--name-only', gitBase] : ['diff', '--name-only'];
  const diff = await runGit(targetRoot, args);
  const staged = await runGit(targetRoot, ['diff', '--cached', '--name-only']);
  const untracked = await runGit(targetRoot, ['ls-files', '--others', '--exclude-standard']);
  return dedupe([...splitLines(diff), ...splitLines(staged), ...splitLines(untracked)].map(toPosix));
}

async function runGit(cwd: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', ['-C', cwd, ...args], { maxBuffer: 1024 * 1024 * 4 });
    return stdout;
  } catch {
    return '';
  }
}
