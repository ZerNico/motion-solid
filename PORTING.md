# Porting guide: `motion/react` → Solid 2.0

Upstream's React package is `packages/framer-motion` in the Motion monorepo (`motion/react` re-exports
it). See `UPSTREAM.md` for the tracked version.

The animation engine, `VisualElement`s, the projection (layout) system and the gesture primitives
live in `motion-dom` and `motion-utils`, which this package uses as dependencies, unchanged. Only
the React glue is ported.

## Rules

-   Mirror upstream's file layout (`packages/framer-motion/src/...` → `packages/motion-solid/src/...`).
-   Copy framework-agnostic upstream files verbatim (features, gestures, `valid-prop`, ...), so
    upstream diffs apply. Formatting is upstream's (Prettier 2, `.prettierrc.json`) and so are the
    TypeScript checks (`tsconfig.json`). Upstream doesn't format every file, so a copy can differ
    from its source in formatting only: compare with `diff -w` or after running Prettier on both.
-   Deviate only where React and Solid fundamentally differ, and leave a `Port note:` comment.
-   Solid 2.0 is not Solid 1.x. Read `node_modules/solid-js/CHEATSHEET.md` first.

Structural fidelity to React's internals isn't a goal where Solid has a better fit: what has to
match is the behaviour users see. The coordination layer (lifecycle, layout snapshots, presence) is
designed for Solid 2, see below.

## Lifecycle mapping (`motion/index.tsx`)

A Solid component runs once and never re-renders, so `createMotionComponent` maps upstream's React
phases onto Solid's:

| Upstream (React)                                           | Port (Solid)                                                                  |
| :--------------------------------------------------------- | :---------------------------------------------------------------------------- |
| render: create `VisualElement`, projection node            | component body (not mounted yet)                                              |
| ref callback: `visualElement.mount(instance)`              | once the element is in the document, after the flush that inserts it          |
| layout effect: `updateFeatures()`, `MeasureLayout` mount   | right after mounting                                                          |
| effect: `animationState.animateChanges()`                  | after every mount of the flush (mount), `createEffect` (updates)              |
| insertion/layout effect: `update(props)`, `updateFeatures` | layout trigger, apply phase                                                   |
| `MeasureLayout.getSnapshotBeforeUpdate`                    | layout trigger, when the previous run retires (see below)                     |
| `MeasureLayout.componentDidUpdate`                         | right after the snapshot: motion-dom measures after the flush (`didUpdate()`) |
| unmount                                                    | `onCleanup` (in the document), via the fallback for Solid's own `Show`/`For`  |

Mounting waits for the document because mounting a `layoutId` element makes it the lead of its
shared stack. It follows the render effects that insert the element (with a microtask), not
`onSettled` or an effect: those wait for an action to settle, while its optimistic updates are
already shown. Solid settles parents before children (React runs child effects first), and a
parent's initial animation animates the variant children that have mounted, so initial
animations start once every component of the flush has mounted.

Props are read into a plain object (`getConfigAndProps`) for `motion-dom`, which compares
`props`/`prevProps` like upstream. Only the component's own computations read them: a component
being disposed in the same update can have props that throw.

## Solid 2 scheduler facts (`packages/motion-solid/test/solid-contract.browser.test.tsx`)

The design relies on these, pinned by contract tests (re-run them on every Solid upgrade):

-   In a flush, every compute runs first. Then the cleanups of retired runs and the disposal of
    removed branches run, with the old DOM still in the document. Then render effects write the DOM,
    then effects run, then `onSettled`.
-   When async work holds an update (`<Loading>`), computes run right away, but the cleanups, the
    disposals and the DOM writes all wait for the landing, in the same order.
-   A superseded speculative run's cleanup runs right away, without a newer run (so it can be told
    apart from a retirement).
-   `mapArray` keeps an item's owner while the item is in its list, and reuses it.
-   Async (`src/__tests__/async*.test.tsx`): pending reads in motion props and in `Show`/`For` hold
    updates like any other read, optimistic updates (`createOptimisticStore` + `action`) enter right
    away and exit when they're reverted, `isPending` can drive animations and presence, content held
    back by `<Reveal>` starts animating when it's revealed, `lazy` children join their parent's
    variants once loaded, and a refreshed `createProjection` keeps its elements (reordered with
    layout animations, removed ones exit).
-   Since RC.14, inside a computation (a component created in a `children` memo, for example)
    `untrack(memo)` reads `undefined` for a memo derived from `isPending` that a held update
    created, and a component whose pending prop is only read through `untrack` of a memo it
    created stays suspended. The component reads its props directly when it's created, and memos
    through `peek` (`utils/access.ts`, `untrack(() => latest(memo))`).
-   Known Solid 2 issue since RC.13 (pinned as an `it.fails` contract test): a computation that
    also reads `isPending` of held async work applies the held values only after the DOM writes.
    A `layout` component reading `isPending` in its props jumps instead of animating when that
    update lands; read `isPending` outside its props (e.g. in a child) instead.

## Layout animations (`projection/layout-commit.ts`, `projection/layout-scope.ts`)

Upstream snapshots the layout of every `motion` component that re-renders
(`getSnapshotBeforeUpdate`) and measures it again after the commit (`componentDidUpdate`).

**When.** A layout trigger is a render effect. When it re-runs, the cleanup of its previous run is
called at the commit of the new run: after the update is decided, before Solid writes the DOM,
and (unlike the compute phase or a microtask) also when async work holds the update. That's where
snapshots are taken. motion-dom then measures the new layout after the flush. A component's
creation snapshots go through the same mechanism (`onLayoutCommit`: a trigger over a private
signal written once), so under held async work they're taken at the landing, not when the
component is created.

**What.** Snapshots are scoped by a tree mirroring the motion tree: every `motion` component,
`LayoutGroup` and `AnimatePresence` is a scope, and every element that measures its layout is a
participant of its closest scope. When something can move elements, the closest scope's subtree is
snapshot (the changed element, its siblings, their descendants), at most once per commit:

-   a `motion` component's layout-affecting props change (anything but animation-only props like
    `animate`, `variants`, `transition`, `while*`, handlers), or its presence,
-   its children are added, removed or reordered (e.g. a `<For>` inside it): its siblings and its
    whole subtree, including isolated `LayoutGroup`s, like upstream re-rendering it,
-   it's created or disposed,
-   presence-aware `Show`/`For` or `AnimatePresence` add or remove children, a `LayoutGroup`'s
    children change,
-   motion-solid's `For` reorders its items, also outside an `AnimatePresence`
    (`createListLayoutTrigger`). Solid's `For` moves the nodes without re-running anything, so
    Solid's own `For` under a plain parent can't animate a reorder: use motion-solid's `For`, a
    `motion` parent, or `layoutDependency`.

Elements sharing a `layoutId` snapshot together, wherever they are: when one is created, removed
or changes presence, the other members of its stack are snapshot too (a gallery item and its
lightbox in another subtree crossfade like upstream, where the same state change re-renders both).

Other elements snapshot with their committed props, never by reading their props, and keep
upstream's `layoutDependency` rule (one with a `layoutDependency` only animates when it changes).
An element its own trigger already snapshot in a commit (e.g. with `isPresent: false` as it starts
exiting) is skipped by its scope's and its `layoutId` stack's snapshots in that commit.

Without a `motion` ancestor, the closest scope is the root one, so a change snapshots every
participant outside a scope (upstream would only snapshot the component that re-rendered, and let
the others jump). Solid has no per-component boundary to narrow it to: add `motion` or
`LayoutGroup` boundaries.

`layout`/`layoutId` follow their props (upstream sets them on the projection node once): turned
on later (also after mounting without them, with `drag`, which keeps the measurement, and in the
same update as a layout change) they animate, turned off they don't. motion-dom reads them when
the projection node mounts (it only adds the layout animation handler with one of them, and puts
a `layoutId` in its stack then), so the projection node alone is mounted again when `layout` is
first turned on, or `layoutId` changes: gestures in progress (a drag, a hover) keep going, and
the element leaves its old `layoutId` stack (whose previous member animates from it) and joins
the new one. `MeasureLayout` removes its `animationComplete` listener when it unmounts (upstream
leaks it, but never toggles).

A `motion.create` component whose ref moves to a new root element unmounts its `VisualElement`
and mounts it on the new element, like upstream. Unlike upstream (where that's a remount), its
values carry over instead of being reset to `initial`, its animations start again on the new
element from where they were, and an exit in progress keeps the child until it's done on the new
element.

What can't be detected: layout changes from outside Motion's reach, e.g. a plain `<div>` whose
style changes, or a text change in a plain element inside a `motion` element. Pass
`layoutDependency={…}` (it's tracked) for those, or make the container a `motion` element.

## Presence (`components/AnimatePresence`)

Upstream tracks `AnimatePresence`'s children by React `key` and keeps rendering a removed child
(with `isPresent: false`) until its exit is done. Solid's `<Show>`/`<For>` dispose a removed child
right away, and nothing can delay that.

**Presence-aware `Show` and `For`** (`control-flow.tsx`, exported by this package, same props as
Solid's) let `AnimatePresence` own their children's lifetime. They render their entries by key
over `mapArray`, and a removed entry stays in the list (owner and DOM alive) until its exit is
done, with upstream's diff (`presence-list.tsx`: where exiting children are reinserted,
`mode="wait"`, removing them all at once). Each entry gets a `PresenceChild` (`PresenceChild.ts`):
a reactive `isPresent` and upstream's registry of what has to finish first (exit animations,
layout animations, `usePresence`). So like upstream:

-   a child that comes back while exiting is the same instance, and reverses,
-   everything inside keeps running while it exits (reactive content, Portals), cleanups run after,
-   `usePresence`/`useIsPresent` are reactive, `propagate` and nested `AnimatePresence` work,
-   in `mode="wait"`, the next child isn't created until every exit of the `AnimatePresence` is
    done, across sibling lists,
-   exiting children of all its lists (and of the fallback below) are removed together once every
    exit is done, and `onExitComplete` fires once then (asynchronously, after the flush that
    completes the last exit). A child that comes back, or a disposed `AnimatePresence`, cancels
    its exit without firing it,
-   an exiting `motion` component's prop reads are all frozen (motion props, rendered style,
    forwarded DOM props, variant context; upstream keeps rendering it with its last props), so a
    prop change can't restart its `animate` target mid-exit and props reading removed data don't
    throw. Its `children` aren't frozen: the reactive content inside keeps running. So children
    of a `Show` that read removed data directly (`{record()!.label}`) throw while it exits, unlike
    with Solid's own `Show`: read it through the callback form (`{(record) => record().label}`),
    whose accessor keeps the last value,
-   `For` renders duplicate items (keyed by item and occurrence; a duplicate that comes back while
    exiting keeps its child), and `fallback` is only created when shown.

**Which `Show`/`For` join.** Upstream's `AnimatePresence` only governs its direct children. A
presence-aware `Show`/`For` joins when the `AnimatePresence` reads it directly while resolving its
children: through components, fragments, conditionals and Solid's own control flow, but not
through an element, a context provider (including `LayoutGroup`), `Loading`/`Errored`, a Portal or
another presence child. Those are Solid's own, or join an `AnimatePresence` of their own. On the
server and while hydrating they're created right away (hydration ids follow creation order), so
there they join unless they're inside another presence child.

Deviation: in `mode="wait"`, a list without exits of its own keeps its mounted children while
another list's children exit. Upstream stops rendering them (React remounts them afterwards,
Solid would dispose their state), and both warn about that setup: "multiple children within
AnimatePresence, but its mode is set to "wait"", counted across all lists once they commit.

Outside an `AnimatePresence` they're Solid's own (`For` adds the reorder snapshot above).
`AnimatePresence` stays a wrapper like upstream (no control-flow props).

**Solid's own `<Show>`/`<For>`** directly inside `AnimatePresence` still exit, through a fallback
(`fallback.tsx`): their disposed `motion` components hand their element over instead of
unmounting, and keep animating without an owner while the removed node stays in the document.
Their exiting children are removed together with the other exits of the `AnimatePresence`.
Limits: a child that comes back is a new instance (the old one finishes exiting), reactive
content, cleanups and Portals inside don't behave like upstream, and in `mode="wait"` the fallback
only holds its entering children back for its own exits.

## SSR and hydration

`motion` components render on the server with their initial styles (`initial`, `style`, motion
values) and attributes, without a `VisualElement` (like upstream, which only creates it in the
browser). On the client, every computation of the `VisualElement` lifecycle is created with
Solid's `transparent` option, so the client-only work doesn't shift hydration ids, and client-only
ids don't come from `createUniqueId`. Computations that exist on both sides stay normal.

Tests: `*.fixtures.tsx` modules are rendered with Solid's server build
(`test/ssr/renderOnServer.mts`), and `test/renderToString.ts` puts the markup in the document and
hydrates it with the client build (hydration mismatches fail the test), adapted from base-ui-solid.
In the jsdom project the server render runs in the same process, with jsdom's `window`: server
paths must check `isServer` (from `@solidjs/web`), not `typeof window`. The browser project renders
on the server in plain Node. No empty `style=""` is rendered.

**Optimised appear animations** (`startOptimizedAppearAnimation`, `data-framer-appear-id`): a
component created while an appear animation runs for its id hands off from it when it mounts (its
initial animation runs right away, upstream: a layout effect), then marks the handoff complete.

## Public API differences

| Upstream (React)                                                                      | Port (Solid)                                                                                                                                                                                                                                                                                            |
| :------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `style` with camelCase keys                                                           | Same (`backgroundColor`, `x`), kebab-case keys are accepted too                                                                                                                                                                                                                                         |
| React adds `px` to numeric `style` values                                             | Same: Motion's value types for the keys Motion knows, `px` for other numbers unless unitless (React 19's list), CSS variables raw. A store-backed `style` is tracked                                                                                                                                    |
| `motion.create(Component)` passes `children` through                                  | Same: `children` is passed unresolved (created where the component renders it). A ref that moves to a new element moves the `VisualElement` with it (its values carry over)                                                                                                                             |
| `transformViewBoxPoint(ref)`, `correctParentTransform(ref)`                           | Take an element, an accessor of one, or a `{ current }` object                                                                                                                                                                                                                                          |
| `className`, `tabIndex`                                                               | `class`, `tabindex` (Solid attributes)                                                                                                                                                                                                                                                                  |
| `ref` object or callback                                                              | `ref` callback (or array)                                                                                                                                                                                                                                                                               |
| `AnimatePresence` children identified by `key`                                        | Rendered with motion-solid's `Show`/`For` (`<Show when keyed>` for `key` swaps)                                                                                                                                                                                                                         |
| `usePresence()` returns `[isPresent, safeToRemove]`                                   | `[isPresent: Accessor<boolean>, safeToRemove]`, `useIsPresent`/`usePresenceData` return accessors                                                                                                                                                                                                       |
| Layout animations on every re-render                                                  | On the triggers listed above, `layoutDependency` for everything else                                                                                                                                                                                                                                    |
| `motion(Component)` (deprecated)                                                      | Not ported, use `motion.create(Component)`                                                                                                                                                                                                                                                              |
| `MotionConfig`/`LayoutGroup`/context values                                           | Read through getters (reactive)                                                                                                                                                                                                                                                                         |
| Hooks re-run on every render (deps arrays)                                            | Run once, like a Solid component. Inputs that are motion values update by themselves                                                                                                                                                                                                                    |
| Hook arguments that change between renders                                            | Accessors (`useTransform(x, () => [0, max()], [0, 1])`, `useTransform(() => props.value, …)`), options read lazily (an accessor or an object with getters): `useTransform`, `useMotionTemplate` (`${() => props.unit}`), `useSpring`/`useFollowValue`, `useScroll`, `useInView` (see `utils/access.ts`) |
| `useSpring(value)` reads `value` on every render                                      | Also `useSpring(() => target())`: the spring follows the accessor (same for `useFollowValue`). A plain-value change steers the running animation; switching to another motion value (or new options) stops it, re-attaches and heads for the new source's value                                         |
| `useReducedMotion()`/`useReducedMotionConfig()` return a boolean                      | Return accessors that follow the device setting and `MotionConfig`'s `reducedMotion`; `useAnimate` reads them when animating                                                                                                                                                                            |
| Hooks taking React refs (`useScroll`, `useInView`, `useDomEvent`, `dragConstraints`)  | An element, an accessor of one (e.g. a signal set by `ref`, or `() => el` for a `let el`), or a `{ current }` object, read once the component's elements exist. `useInView` resets to `false` when its ref switches element (unless `once` and already in view)                                         |
| `useScroll` native acceleration with ref objects                                      | Also with accessor `container`/`target` refs: the timeline is re-attached when they change. Accessor options or options with getters (`useScroll`, `useTransform`) disable acceleration                                                                                                                 |
| `useInView`, `useCycle`, `usePageInView` return state                                 | Return accessors (`useCycle` returns `[Accessor<T>, cycle]`)                                                                                                                                                                                                                                            |
| `useAnimate()` scope is a ref object                                                  | A ref callback (`<div ref={scope}>`) that also has `current`/`animations`                                                                                                                                                                                                                               |
| `useTransform(() => …)` recomputes on render                                          | Recomputes when motion values or Solid signals read inside change, and follows the motion values and signals read by its latest run (also a run caused by a motion value)                                                                                                                               |
| Reading a motion value in React: `useMotionValueEvent` + state                        | `useMotionValueAccessor(value)` returns an `Accessor` (see "Motion values and Solid")                                                                                                                                                                                                                   |
| `useAnimationControls().start()` in `useEffect`                                       | Same from an effect/`onSettled`: `start`/`set` first mount the motion elements still waiting for the end of the update, then run synchronously                                                                                                                                                          |
| `LazyMotion` re-renders when lazy features load                                       | `m` components set up their `VisualElement` when they arrive, and animate on mount. The `features` loader isn't called on the server                                                                                                                                                                    |
| Removing an element mid-drag (React 19 may remount it, so upstream keeps its session) | Ends its drag: pan session, listeners and drag lock are released, without `onDragEnd`                                                                                                                                                                                                                   |

## Motion values and Solid (`value/use-motion-value-accessor.ts`)

Motion values stay motion-dom's own values (velocity, animations, springs, acceleration), not
Solid signals, and `get()` isn't tracked. The two meet through explicit, owner-scoped bridges:

-   Solid → motion value: `useTransform(() => …)` (tracks Solid signals and the motion values it
    reads, re-collected every run), `useSpring`/`useFollowValue` with an accessor source, and
    accessor arguments everywhere (`utils/access.ts`).
-   Motion value → DOM: `motion` components render motion values every frame without Solid.
-   Motion value → Solid: `useMotionValueAccessor(value)` (a motion value or an accessor of one)
    returns a read-only `Accessor`, updated through Solid's scheduler (after its flush, held with a
    held transition like any signal). Its signal is `ownedWrite`, since motion values can be set
    while a component is created. It subscribes until its owner is disposed and never destroys the
    value. Server: the current value, no subscription (its client-only effect is `transparent`).
-   Side effects: `useMotionValueEvent` (also with an accessor of a motion value).

Rejected (reviewed independently by three models): tracking `get()` with Solid's global
`enableExternalSource` (global, can't be unregistered, every motion component would recompute
every frame), callable motion values (clash with "a function is an accessor"), and async-iterable
bridges (a motion value is always readable synchronously).

## Upstream bugs fixed here

Each has a `Port note:` and a regression test:

-   `useScroll`'s acceleration retried in motion-dom's `microtask` batcher while it was
    processing, which stalls that batcher for the whole page,
-   `PanSession` lost window-scroll compensation with `transformPagePoint`, and compensated
    element scroll in page space instead of `transformPagePoint`'s (wrong when it scales),
-   `animate={controls}` stayed subscribed to the previous controls,
-   `useMotionTemplate` dropped a static `0`, `useVelocity` didn't cancel its frame update,
-   the scroll timeline cache held elements strongly (now `WeakMap`s),
-   `Reorder.Group` tracks in-place changes of a store array.

## Not ported

`AnimateView` (`motion/react/animate-view`): it wraps React 19.3's `<ViewTransition>`, which Solid
has no equivalent of (its e2e tests are skipped). motion-dom's imperative `animateView()` is
exported and works with Solid. Deprecated APIs (`AnimateSharedLayout`, `useDeprecatedAnimatedState`,
`useDeprecatedInvertedScale`, the `motion(Component)` call form).

Exports: React-only internals (`PopChild`, `PresenceChild`, `useComposedRefs`, `useForceUpdate`,
`useIsomorphicLayoutEffect`, `ForwardRefComponent`) and `DeprecatedLayoutGroupContext`. Subpaths:
`./dom`, `./dom/mini`, `./mini`, `./projection` and `./debug` are ported. `./client`
(`motion/react-client`, an RSC boundary Solid doesn't have), `./m` (use `m` from the main entry)
and `./animate-view` aren't.

## Tests

-   `pnpm test:upstream`: tests ported from upstream, at upstream's paths, in jsdom like upstream
    (`jest` is Vitest's `vi`, `src/jest.setup.tsx` has upstream's helpers).
-   `pnpm test:browser`: browser tests (`*.browser.test.tsx`) in Chromium, `pnpm test:browsers` in
    Chromium, Firefox and WebKit: our own (layout, presence, drag, async, SSR, the Solid scheduler
    contract in `test/solid-contract.browser.test.tsx`), and `test/e2e/`, the ports of upstream's
    Cypress specs and React Playwright specs with their test pages (one file per spec, helpers in
    `test/e2e/utils.tsx`, translation notes as `Port note:` comments). Where an upstream page relies
    on a re-render to take part in a layout update, the port uses `layoutDependency` and says so.
-   `playground/` and `playground-react/` render the same demos with motion-solid and motion/react
    (`pnpm dev`, `pnpm dev:react`), `scripts/compare-*.mjs` compare them in a headless browser.
