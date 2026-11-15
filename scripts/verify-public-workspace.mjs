import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../", import.meta.url);
const file = (path) => readFileSync(new URL(path, root), "utf8");
const pkg = JSON.parse(file("package.json"));
const declared = new Set(pkg.workspaces ?? []);

const actual = new Set(
  readdirSync(new URL("packages/", root))
    .filter((name) => existsSync(new URL(`packages/${name}/package.json`, root)))
    .map((name) => `packages/${name}`),
);

const importerSection = file("pnpm-lock.yaml").split("\nimporters:\n")[1]?.split("\npackages:\n")[0];
if (!importerSection) throw new Error("Could not find lockfile importers");

const importers = new Set(
  [...importerSection.matchAll(/^  ([^:\n]+):\s*$/gm)].map((match) => match[1]),
);
const expectedImporters = new Set([".", ...declared]);

const difference = (a, b) => [...a].filter((item) => !b.has(item));
const errors = [
  ...difference(declared, actual).map((item) => `Missing public package: ${item}`),
  ...difference(actual, declared).map((item) => `Unlisted package directory: ${item}`),
  ...difference(expectedImporters, importers).map((item) => `Missing lockfile importer: ${item}`),
  ...difference(importers, expectedImporters).map((item) => `Unexpected lockfile importer: ${item}`),
];
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Public workspace and lockfile importers are consistent.");
}
