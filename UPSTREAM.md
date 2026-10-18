# Upstream

-   Repository: https://github.com/motiondivision/motion
-   Tracked version: `v14.0.0` (`65bb8c73cc5f7f6281e80a2e07f8b23b5040fff4`), the version of
    `motion-dom` and `motion-utils` this package depends on.
-   Ported package: `packages/framer-motion` (what `motion/react` re-exports).

A local clone lives next to this repository at `../motion`, checked out at the tracked tag.

To update: bump `motion-dom`/`motion-utils`, then diff `packages/framer-motion/src` between the old
and new tags and apply the changes to the matching files here (see `PORTING.md`).
