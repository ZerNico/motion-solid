# motion-solid

An unofficial Solid 2.0 port of [Motion](https://motion.dev) (`motion/react`). The package and its
documentation are in [`packages/motion-solid`](packages/motion-solid/README.md); how it differs
from the React version is in [`PORTING.md`](PORTING.md).

## Development

```sh
pnpm install
pnpm docs:dev         # the docs site, with live demos
pnpm test             # all tests (upstream's in jsdom, ours in Chromium)
pnpm typecheck
```
