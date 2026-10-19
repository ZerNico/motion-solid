# motion-solid

An unofficial Solid 2.0 port of [Motion](https://motion.dev) (`motion/react`), built on the same
`motion-dom` engine.

```tsx
import { AnimatePresence, motion, Show } from "@motion-s/solid"

function Toast(props: { open: boolean }) {
    return (
        <AnimatePresence>
            <Show when={props.open}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                />
            </Show>
        </AnimatePresence>
    )
}
```

`Show` and `For` are motion-solid's presence-aware versions of Solid's (same props): inside
`AnimatePresence`, they keep a removed child alive until its exit animation is done.

## Install

motion-solid targets Solid 2.0, currently a release candidate (published under Solid's `next`
tag):

```sh
pnpm add @motion-s/solid solid-js@next @solidjs/web@next
```

Apps compiling with Solid's compiler (`@solidjs/vite-plugin`, SolidStart) use the package's
uncompiled JSX (the `solid` export condition). Other tools get builds compiled for the browser or
the server.

Ported: `motion.*` / `motion.create()` (animations, variants, gestures: hover, tap, focus, in
view, drag, pan), `AnimatePresence`, layout animations (`layout`, `layoutId`, `LayoutGroup`),
`Reorder`, `LazyMotion` / `m`, `MotionConfig`, `animate()` with sequences, `scroll()`, `inView()`,
and the hooks (`useMotionValue`, `useTransform`, `useSpring`, `useScroll`, `useAnimate`,
`useInView`, `useDragControls`, `usePresence`, ...), SSR with hydration and optimised appear
animations. Everything from `motion-dom` and `motion-utils` is re-exported.

## Motion values and Solid

Motion values (`useMotionValue`, `useScroll`, `useSpring`, ...) are Motion's own observable
values, rendered every frame without going through Solid. Hook arguments that can change are
accessors, like everywhere in Solid:

```tsx
const [target, setTarget] = createSignal(0)

// Solid → motion value
const x = useSpring(target) // follows the signal, animated
const scale = useTransform(() => (selected() ? 1.2 : 1)) // derived from signals and/or motion values
const opacity = useTransform(x, () => [0, max()], [0, 1]) // reactive ranges

// Motion value → DOM: pass it to a motion component (no Solid updates)
<motion.div style={{ x, scale, opacity }} />

// Motion value → Solid: an accessor, for logic and text
const progress = useMotionValueState(scrollYProgress)
<Show when={progress() > 0.99}><Toast /></Show>

// Motion value → side effects
useMotionValueEvent(x, "animationComplete", () => …)
```

See `PORTING.md` in the repository for how it differs from the React version, in particular how
layout animations are triggered in Solid.
