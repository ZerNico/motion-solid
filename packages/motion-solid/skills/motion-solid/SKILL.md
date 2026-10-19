---
name: motion-solid
description: >-
    Animations for Solid 2 with motion-solid (@motion-s/solid), a port of Motion for React:
    motion components (motion.div, m), animate/initial/exit, variants, transitions, gestures
    (whileHover, whileTap, drag), AnimatePresence with motion-solid's Show and For, layout and
    layoutId animations, LayoutGroup, LazyMotion, MotionConfig, Reorder, motion values
    (useMotionValue, useTransform, useSpring, useScroll, useMotionValueState,
    useMotionValueEvent), useAnimate, useInView, animate(), scroll(), toMotionProps for headless
    component libraries.
metadata:
    type: framework
    library: motion-solid
    library_version: "0.1.0"
    framework: solid
sources:
    - zernico/motion-solid:packages/motion-solid/src
    - zernico/motion-solid:docs/src/content
---

# motion-solid (`@motion-s/solid`)

motion-solid is Motion for React (`motion/react` v14) ported to Solid 2, on the same engine
(`motion-dom`). Animation targets, transitions, variants, springs, gestures, drag, layout
projection and `animate()` work like in Motion for React. What differs is how Solid works: a
component runs once, nothing re-renders, and state is read through accessors.

> **CRITICAL**: Import from `@motion-s/solid`, never `motion/react` or `framer-motion`.
> **CRITICAL**: This is Solid 2, not React and not Solid 1.x. Use `class`, not `className`; there
> are no hooks rules, no dependency arrays, no `key`, no `useRef`. Read
> `node_modules/solid-js/CHEATSHEET.md` for Solid 2 itself.
> **CRITICAL**: Inside `AnimatePresence`, use motion-solid's own `Show` and `For`
> (`import { Show, For } from "@motion-s/solid"`) instead of `{cond && …}` or `array.map` with
> keys. A keyed `Show` replaces React's changing `key`.
> **CRITICAL**: Hooks that return state in React return accessors here: call them
> (`isInView()`, `variant()`). Arguments that can change are passed as accessors
> (`useTransform(x, () => [0, max()], [1, 0])`).
> **CRITICAL**: Motion values are not signals. Pass them to `style` (or as a child to render
> text) and they update the DOM without running Solid code. To read one in Solid code, use
> `useMotionValueState(value)`, which returns an accessor. Never pass that accessor to `style`.

## Motion components

```tsx
import { motion } from "@motion-s/solid"

<motion.div
  class="box"
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ type: "spring", bounce: 0.3 }}
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
/>
```

- `animate` is reactive: `animate={{ x: isOpen() ? 100 : 0 }}` animates when `isOpen` changes.
- `style` takes motion values and individual transforms (`x`, `scale`, `rotate`), camelCase or
  kebab-case keys, or a string like Solid's `style`. Numbers get `px` where needed.
- `ref` takes a callback, an array of callbacks, or a `let` variable:
  `let el!: HTMLDivElement` and `ref={el}`.
- `motion.create(Component)` animates a component that passes `ref` to its root element (there's
  no `forwardRef`). `motion(Component)` isn't ported.
- `m` with `LazyMotion` and `domAnimation`/`domMax` loads features on demand.

## Exit animations

```tsx
import { AnimatePresence, For, motion, Show } from "@motion-s/solid"

<AnimatePresence>
  <Show when={isOpen()}>
    <motion.div exit={{ opacity: 0 }} />
  </Show>
</AnimatePresence>

// Swap one child for another (React: a changing `key`)
<AnimatePresence mode="wait">
  <Show when={tab()} keyed>
    {(tab) => <motion.div exit={{ opacity: 0 }}>{tab}</motion.div>}
  </Show>
</AnimatePresence>

// Lists
<AnimatePresence>
  <For each={items()}>
    {(item) => <motion.li exit={{ opacity: 0 }}>{item.label}</motion.li>}
  </For>
</AnimatePresence>
```

`Show` and `For` only join the `AnimatePresence` they're directly under, not through an element in
between. In a keyed `For` the item is a plain value and the index an accessor.

## Layout animations

```tsx
<motion.div layout style={{ width: isOpen() ? "300px" : "100px" }} />
<motion.span layoutId="underline" />
```

Layout is measured when a motion component's layout-affecting props change, when children are
added, removed or reordered (use motion-solid's `For`), or when presence changes. For changes
Motion can't see (a plain child's style), pass `layoutDependency={value()}`.

## Motion values

```tsx
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useMotionValueState,
  useScroll,
  useSpring,
  useTransform,
} from "@motion-s/solid"

const x = useMotionValue(0)
const opacity = useTransform(x, [-100, 0, 100], [0, 1, 0])
const spring = useSpring(() => (isOpen() ? 200 : 0)) // follows a signal
const { scrollYProgress } = useScroll()
const progress = useMotionValueState(scrollYProgress) // Accessor<number>
useMotionValueEvent(x, "change", (latest) => console.log(latest))

<motion.div drag="x" style={{ x, opacity }} />
<motion.span>{scrollYProgress}</motion.span> // text, updated every frame
<p>{Math.round(progress() * 100)}%</p>
```

## Refs passed to hooks

`useScroll`, `useInView`, `useDomEvent` and `dragConstraints` take an accessor of an element, an
element, or a `{ current }` object. The element is read once it exists:

```tsx
let el!: HTMLDivElement
const isInView = useInView(() => el)
return <div ref={el}>{isInView() ? "Visible" : "Hidden"}</div>
```

`useAnimate()` returns `[scope, animate]`, where `scope` is a ref callback: `<ul ref={scope}>`.
Call `animate` from `onSettled`, an effect or an event handler.

## Headless component libraries

Libraries like Base UI Solid or Ark UI pass props to a render function. Spread them through
`toMotionProps`, which drops the DOM handlers whose names Motion uses for its own callbacks
(`onAnimationStart`, `onDrag*`) and keeps the rest reactive. Don't cast the props instead.

```tsx
import { motion, toMotionProps } from "@motion-s/solid"

<Menu.Trigger
  render={(props) => (
    <motion.button {...toMotionProps(props)} whileTap={{ scale: 0.9 }} />
  )}
/>
```

## Documentation

The docs are Markdown at `https://motion-solid.pages.dev/docs/<page>.md`, indexed in
`https://motion-solid.pages.dev/llms.txt`. Start with
[Coming from React](https://motion-solid.pages.dev/docs/coming-from-react.md), which lists every
difference from Motion for React.
