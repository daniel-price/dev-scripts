# Versioned dependencies with optional local links

This public repository contains only the reusable `@daniel-price/util`, `@daniel-price/aws`, and
`@daniel-price/scripts` packages. Store any private consumers in a **separate repository**
with its own workspace and lockfile. Dependencies point **from private to public**,
never the other way around.

## Reproducible installs and releases

Public packages declare their internal dependencies with `workspace:*`.
pnpm resolves those as symlinks while developing this repository and converts
them to real version numbers when packaging or publishing.

Install and test the public checkout:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm check-types
pnpm --filter @daniel-price/util pack --dry-run
```

Before publishing any package:

1. Audit its source and the pack preview for internal data, credentials and
   files that shouldn't leave your machine.
2. Confirm you have publishing rights to the **`@dev`** scope in the target
   package registry. The GitHub repository's ownership does not imply this.
   Rename package scopes and imports first if you do not control `@dev`.
3. Update package versions and dependency ranges together, and regenerate
   the public lockfile with pnpm 10.
4. Publish packages in dependency order (util, aws, scripts) using a
   GitHub personal access token (classic) with `write:packages` permission.
   For example, `pnpm --filter @daniel-price/util publish --no-git-checks`
   after performing the release review and version commit. Do **not** put the
   token in Git. Package visibility is administered in GitHub's package settings.
   Consider publishing as private until source auditing is complete.

GitHub Packages requires authentication for **installing public as well as
private packages**. Give consumers a classic PAT with `read:packages` and
configure it in their user-level `~/.npmrc` or CI secrets, never in Git:

```ini
@daniel-price:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}
```

Alternatively, configure the auth token in `~/.npmrc` directly and keep
only the scope registry line in the repository. Private CI needs access to
this GitHub package owner and a securely injected token.

The current packages expose TypeScript files directly via `module: "index.ts"`.
Published packages therefore target **Bun/TypeScript-aware consumers**, not
plain Node.js without a TypeScript loader/build. Compiled JS and declaration
files would be a separate release-format change.

Nothing in this PR automatically publishes a package.

## Example: separate private consumer

Arrange two independent Git checkouts as siblings:

```text
code/
├── dev-scripts/          # this public repository
└── private-scripts/      # independently hosted private repository
    ├── packages/
    │   ├── private-util/
    │   └── private-scripts/
    ├── package.json
    ├── pnpm-workspace.yaml
    └── pnpm-lock.yaml
```

In the **private** repository's `pnpm-workspace.yaml`:

```yaml
packages:
  - "packages/*"
  # When present, these public packages are available for local linking.
  - "../dev-scripts/packages/*"
linkWorkspacePackages: true
```

In `packages/private-util/package.json` declare **published versions**,
not `link:` paths:

```json
{
  "name": "@example/private-util",
  "private": true,
  "dependencies": {
    "@daniel-price/util": "0.0.1",
    "@daniel-price/aws": "0.0.1"
  }
}
```

Those example versions must be **published** first for registry-only installs.
Use ranges matching your actual releases; the local package version must
satisfy its declared range for pnpm to link it.

### Local source-link mode

With both repositories checked out, run in the private repository:

```sh
pnpm install --no-lockfile
```

pnpm links matching `@daniel-price/*` workspace packages from the sibling checkout.
Changes to their TypeScript source are picked up by Bun immediately; there
is no publish/reinstall step for ordinary source edits.

`--no-lockfile` is intentional: it neither reads nor rewrites the **private
repository's registry-based lockfile**. The dependencies resolved locally
may therefore differ from those pinned in CI. Run tests in both modes when
a change is important.

### Registry mode (CI and other users)

**Generate and commit the private repository's lockfile in an environment
without the sibling public checkout**, so all versioned `@daniel-price/*` dependencies
resolve from the configured registry. Keep that lockfile under private Git.

Then, in CI or another checkout without the public repository:

```sh
pnpm install --frozen-lockfile
```

No local source tree is needed. CI installs the published versions and fails
if the lockfile is out of sync. GitHub Packages authentication is required even for public packages:
configure the registry and a `read:packages` token using private CI secrets.
Never commit credentials.

### Switching back and forth

For local testing against **published versions**, use a separate checkout
without the sibling `dev-scripts` directory and run
`pnpm install --frozen-lockfile`. This avoids accidentally resolving workspace
links and validates the same package graph as CI.

The public repository's workspace, lockfile and CI remain completely
independent of the private checkout. Never add private packages, their
dependencies, or private absolute paths to the public workspace or lockfile.
