export type V2CliIo = {
  stdout(value: string): void;
  stderr(value: string): void;
  cwd: string;
};

export const processIo: V2CliIo = {
  stdout: (value) => process.stdout.write(`${value}\n`),
  stderr: (value) => process.stderr.write(`${value}\n`),
  cwd: process.cwd(),
};

export function emit(
  io: V2CliIo,
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
