# docs

The motion-solid documentation site: TanStack Solid Start, MDX pages with live demos, prerendered
to static HTML.

```sh
pnpm docs:dev        # from the repository root, http://localhost:3006
pnpm docs:build      # static site in docs/dist/client
```

## Writing a page

- A page is `src/content/<slug>.mdx`, listed in `src/pages.ts` (navigation, title, description).
  After adding or removing one, run `pnpm routes` in `docs/` to generate its route.
- It starts with `# Title` and one or two sentences on what the feature is for. `##` and `###`
  headings make the table of contents.
- Code blocks name their language (` ```tsx `) and import from `"@motion-s/solid"`.
  Indent them with 2 spaces, like the rest of `docs/`: oxfmt formats the demos, but not code
  blocks inside MDX.
- `<Note>` sets a remark apart, `<Note type="warning">` a pitfall. Both take an optional `title`.
- Install commands use `<InstallTabs packages="..." />`: a tab per package manager, and the
  reader's choice is saved.
- Internal links are absolute: `[useScroll](/docs/use-scroll)`.
- Inside JSX like `<Note>`, the formatter can break inline code that contains `{{ }}` across lines.
  Put such code in a code block, or in plain Markdown outside the component.

## Demos

A demo is a component in `src/demos/<slug>/<Name>.tsx` (default export), shown live with its
source:

```mdx
import Example from "../demos/animation/Example"
import exampleSource from "../demos/animation/Example.tsx?source"

<Demo component={Example} source={exampleSource} />
```

- It's rendered centered in a box about 700px wide and at least 224px high, with a Replay
  button that mounts it again. Keep it self-contained and small: its source is shown to readers
  as an example to copy.
- Style it with Tailwind and the site's colors: `bg-accent` (the animated shapes), `bg-bg` on
  the `bg-surface` box (cards, buttons), `border-border`, `text-fg-muted`.
- Write it the way the page recommends: Solid idioms (`class`, signals, accessors), no
  workarounds.

## Checks

```sh
pnpm check:mdx       # every page compiles
pnpm typecheck       # demos and the site
pnpm build           # prerenders every page
```

## Deploying

Publishing a GitHub release deploys the site to Cloudflare Pages
(`.github/workflows/deploy-docs.yml`, motion-solid.pages.dev). Running the workflow by hand
deploys the branch it's run on.
