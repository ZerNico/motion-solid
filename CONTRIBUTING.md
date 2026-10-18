# Contributing

## Setup

```sh
pnpm install
pnpm exec playwright install chromium   # firefox webkit for the full browser matrix
```

Node 24 (`.node-version`) and pnpm (the version in `packageManager`).

## Checks

```sh
pnpm format:check   # Prettier
pnpm lint           # oxlint
pnpm typecheck      # TypeScript 7
pnpm test           # upstream's tests (jsdom) and ours (Chromium)
pnpm test:browsers  # ours in Chromium, Firefox and WebKit
pnpm check:package  # builds, packs, and checks the tarball (publint, attw)
```

CI runs all of them on every push and pull request.

## Code

-   This is a port of `motion/react` (`packages/framer-motion` in the Motion repository, the
    version in `UPSTREAM.md`). Files mirror upstream's layout, and framework-agnostic files are
    copied verbatim. Changes are marked with `Port note:` comments, and `PORTING.md` explains how
    the port differs and why.
-   Prettier stays on 2.x and TypeScript's `strictFunctionTypes`/`strictPropertyInitialization`
    stay off, so the copied files stay identical to upstream's (which makes upstream updates a
    diff to apply).
-   Behaviour that depends on layout, WAAPI or the browser is tested in a real browser
    (`*.browser.test.tsx`); upstream's ported tests run in jsdom (`*.test.tsx`).

## Releasing

1. Bump `version` in `packages/motion-solid/package.json` and add the changes to `CHANGELOG.md`.
2. Create a GitHub release with the tag `v<version>`: the `Release` workflow publishes it to npm
   (trusted publishing, with provenance).
