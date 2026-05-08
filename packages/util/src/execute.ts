import * as Logger from "./logger";

type Options = {
  cwd?: string;
  sync?: boolean;
};

export async function exec(
  command: string | string[],
  options: Options = {},
): Promise<string> {
  const { cwd, sync } = options;
  const splitCommand = Array.isArray(command) ? command : command.split(" ");
  if (splitCommand.includes("cd")) {
    throw new Error("Use the cwd argument instead of cd in the command");
  }
  Logger.debug("exec command", command);
  Logger.debug("exec splitCommand", splitCommand);

  const res = await spawn(splitCommand, !!sync, cwd || process.cwd());
  const { stdout, stderr } = res;
  const stderrStr = await new Response(stderr).text();
  if (stderrStr) {
    throw new Error(stderrStr);
  }
  const stdoutStr = await new Response(stdout).text();
  Logger.debug("Output:", stdoutStr);
  return stdoutStr.trim();
}

async function spawn(
  splitCommand: string[],
  sync: boolean,
  cwd: string,
): Promise<
  | Bun.SyncSubprocess<"inherit", "inherit">
  | Bun.Subprocess<"inherit", "pipe", "inherit">
> {
  const spawnOptions = {
    stdin: "inherit",
    cwd,
  } as const;

  if (sync) {
    return Bun.spawnSync(splitCommand, {
      ...spawnOptions,

      stdout: "inherit",
      stderr: "inherit",
    });
  }
  const res = Bun.spawn(splitCommand, spawnOptions);
  await res.exited;
  return res;
}

export async function openInEditor(path: string): Promise<void> {
  const editor = process.env.VISUAL || process.env.EDITOR || "vi";

  await exec([editor, path], { sync: true });
}
