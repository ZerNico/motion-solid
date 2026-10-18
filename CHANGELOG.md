# Changelog

## Unreleased

-   Solid 2.0.0-rc.15 (the peer dependencies now need it). Fixes `motion` components with an
    async prop staying on the `<Loading>` fallback, and components mounted by a held update
    (e.g. `<Show when={isPending(...)}>`) throwing when they're created, on Solid RC.14 and later.

## 0.1.0

First release: a port of Motion (`motion/react` 14.0.0) to Solid 2.0 (release candidate 13).
