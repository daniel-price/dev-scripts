import * as Logger from "./logger";

export async function exec(command: string, cwd?: string): Promise<string> {
  if (command.includes("cd ")) {
    throw new Error("Use the cwd argument instead of cd in the command");
  }
  Logger.debug("exec command", command);
  const splitCommand = command.split(" ");
  Logger.debug("exec splitCommand", splitCommand);
  const res = Bun.spawn(splitCommand, {
    stdin: "inherit",
    cwd,
  });
  await res.exited;
  const { stdout, stderr } = res;
  const stderrStr = await new Response(stderr).text();
  if (stderrStr) {
    throw new Error(stderrStr);
  }
  const stdoutStr = await new Response(stdout).text();
  Logger.debug("Output:", stdoutStr);
  return stdoutStr.trim();
}
