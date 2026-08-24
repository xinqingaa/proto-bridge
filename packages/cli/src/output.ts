export type CliIo = {
  stdout(value: string): void;
  stderr(value: string): void;
  cwd: string;
  isInteractive: boolean;
  confirm(prompt: string): Promise<boolean>;
};

export const processIo: CliIo = {
  stdout: (value) => process.stdout.write(`${value}\n`),
  stderr: (value) => process.stderr.write(`${value}\n`),
  cwd: process.cwd(),
  isInteractive: Boolean(process.stdin.isTTY && process.stdout.isTTY),
  async confirm(prompt) {
    const { createInterface } = await import('node:readline/promises');
    const rl = createInterface({
      input: process.stdin,
      output: process.stderr,
    });
    try {
      const answer = (await rl.question(prompt)).trim().toLowerCase();
      return answer === 'y' || answer === 'yes';
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === 'AbortError' ||
          ('code' in error && error.code === 'ABORT_ERR'))
      ) {
        process.stderr.write('\nCancelled.\n');
        process.exit(130);
      }
      throw error;
    } finally {
      rl.close();
    }
  },
};

export function emit(
  io: CliIo,
  json: boolean,
  value: unknown,
  human?: string,
): void {
  io.stdout(
    json
      ? JSON.stringify(value, null, 2)
      : human ?? JSON.stringify(value, null, 2),
  );
}
