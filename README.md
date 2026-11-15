# Dev Scripts

Reusable Bun/TypeScript utilities and scripts.

## Getting started

Install dependencies with **pnpm 10** (the committed `pnpm-lock.yaml` is
the source of truth):

```sh
pnpm install --frozen-lockfile
```

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
| `@dev/util` | Shared utilities |
| `@dev/aws` | AWS helpers (depends on `@dev/util`) |
| `@dev/scripts` | General-purpose scripts (depends on `@dev/util` and `@dev/aws`) |

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
> consumers; before publishing, audit their contents and verify that you control
> the `@dev` scope in the chosen registry.
