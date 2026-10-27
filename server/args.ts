// Command-line arguments (#0076). A command declares every flag it takes and
// whether that flag has a value; anything else is refused instead of being
// read as a path.

export type Flags = Record<string, "switch" | "value">;

export interface Args {
  positionals: string[];
  switches: Set<string>;
  values: Record<string, string>;
}

export class UsageError extends Error {}

// `command` is how the error names the caller, e.g. "loopboard init".
export function parseArgs(argv: string[], flags: Flags, command: string): Args {
  const args: Args = { positionals: [], switches: new Set(), values: {} };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("-") || arg === "-") {
      args.positionals.push(arg);
      continue;
    }
    const eq = arg.indexOf("=");
    const name = eq === -1 ? arg : arg.slice(0, eq);
    const kind: Flags[string] | undefined = flags[name];
    if (!kind || (kind === "switch" && eq !== -1)) {
      const known = Object.keys(flags).join(", ") || "no flags";
      throw new UsageError(`Unknown flag ${arg}: \`${command}\` takes ${known}.`);
    }
    if (kind === "switch") {
      args.switches.add(name);
      continue;
    }
    // `--port 5181` or `--port=5181`; the next flag is not a value, a lone
    // `-` (stdin) is (#0116).
    const value = eq === -1 ? argv[++i] : arg.slice(eq + 1);
    if (!value || (eq === -1 && value.startsWith("-") && value !== "-")) throw new UsageError(`Flag ${name} needs a value.`);
    args.values[name] = value;
  }
  return args;
}
