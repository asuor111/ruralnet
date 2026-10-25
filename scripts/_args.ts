// Tiny CLI flag helper shared by import scripts.
// Supports: --key=value, --key value, and bare boolean flags.

export function parseArgs(args: string[]): [record: Record<string, boolean>, flags: Record<string, string>] {
  const record: Record<string, boolean> = {};
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('--')) continue;
    const body = arg.slice(2);
    const eq = body.indexOf('=');
    if (eq >= 0) {
      flags[body.slice(0, eq)] = body.slice(eq + 1);
      record[body.slice(0, eq)] = true;
    } else if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
      flags[body] = args[i + 1];
      record[body] = true;
      i++;
    } else {
      flags[body] = 'true';
      record[body] = true;
    }
  }
  return [record, flags];
}