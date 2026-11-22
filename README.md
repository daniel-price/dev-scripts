# Dev Scripts

Reusable Bun/TypeScript utilities and scripts.

## Getting started

Install the pinned Node.js, pnpm and Bun toolchain with [mise](https://mise.jdx.dev/),
then install dependencies from the committed `pnpm-lock.yaml`:

```sh
mise install
pnpm install --frozen-lockfile
```

The versions in `mise.toml` are used locally and in CI. With mise shell
activation enabled, `pnpm` and `bun` automatically use those versions;
otherwise run commands through `mise exec -- <command>`.

Run the general scripts:

```sh
bun run packages/scripts/index.ts
```

Run tests and type checking:

```sh
pnpm test
pnpm check-types
```

## Packages

| Package | Purpose |
| --- | --- |
| `@daniel-price/util` | Shared utilities |
| `@daniel-price/aws` | AWS helpers (depends on `@daniel-price/util`) |
| `@daniel-price/scripts` | General-purpose scripts (depends on `@daniel-price/util` and `@daniel-price/aws`) |

Internal dependencies use `workspace:*`. Locally, pnpm links package source
directories. When packages are packed or published, pnpm converts these
references into versioned dependencies.

**Private or work-specific packages belong in a separate repository.** This
repository deliberately does not include private workspace packages or their
dependency graph in its lockfile.

See [Versioned dependencies with optional local links](docs/versioned-private-consumers.md)
for a complete example of a private repository using local symlinks during
development and published versioned packages in CI.

> Publishing is not automatic. The current packages expose TypeScript for Bun
> consumers; before publishing, audit their contents and use the GitHub Packages
> registry under your GitHub account. Installing published packages requires
> GitHub Packages authentication even when packages are public.
