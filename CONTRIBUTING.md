# Contributing

## Setup

```sh
pnpm install
pnpm exec playwright install chromium   # firefox webkit for the full browser matrix
```

Node 24 (`.node-version`) and pnpm (the version in `packageManager`).

## Checks

```sh
pnpm format:check   # oxfmt
pnpm lint           # oxlint
pnpm typecheck      # TypeScript 7
pnpm test           # upstream's tests (jsdom) and ours (Chromium)
pnpm test:browsers  # ours in Chromium, Firefox and WebKit
pnpm check:package  # builds, packs, and checks the tarball (publint, attw)
pnpm size           # bundle sizes against the limits in .size-limit.json (after a build)
```

CI runs all of them on every push and pull request, and lints the workflows (zizmor). Every pull
request also gets a preview build on pkg.pr.new, with the install command in a comment.

## Code

- This is a port of `motion/react` (`packages/framer-motion` in the Motion repository, the
  version in `UPSTREAM.md`). Files mirror upstream's layout, and framework-agnostic files are
  copied verbatim. Changes are marked with `Port note:` comments, and `PORTING.md` explains how
  the port differs and why.
- oxfmt uses upstream's formatting options, and TypeScript's
  `strictFunctionTypes`/`strictPropertyInitialization` stay off, so the copied files stay close
  to upstream's (which makes upstream updates a diff to apply).
- Behaviour that depends on layout, WAAPI or the browser is tested in a real browser
  (`*.browser.test.tsx`); upstream's ported tests run in jsdom (`*.test.tsx`).

## Releasing

1. Bump `version` in `packages/motion-solid/package.json` and add the changes to `CHANGELOG.md`.
2. Create a GitHub release with the tag `v<version>`: the `Release` workflow checks, tests and
   publishes it to npm (trusted publishing, with provenance). A version with a prerelease part
   (`0.2.0-beta.1`) is published under the `next` dist-tag. Running the workflow by hand is a dry
   run.
3. The release also deploys the docs to Cloudflare Pages (`Deploy docs` workflow,
   motion-solid.pages.dev). Run that workflow by hand on `main` to publish a docs fix between
   releases.
