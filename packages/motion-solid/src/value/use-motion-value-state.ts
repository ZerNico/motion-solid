import { isServer } from "@solidjs/web"
import type { MotionValue } from "motion-dom"
import {
    createRenderEffect,
    createSignal,
    onCleanup,
    untrack,
    type Accessor,
} from "solid-js"
import { access, type MaybeAccessor } from "../utils/access"

/**
 * Reads a `MotionValue` as a Solid accessor, to use it in memos, effects, `<Show when>` or the
 * text of plain elements.
 *
 * ```jsx
 * const { scrollYProgress } = useScroll()
 * const progress = useMotionValueState(scrollYProgress)
 *
 * return (
 *   <>
 *     <Show when={progress() > 0.99}><Toast /></Show>
 *     <span>{Math.round(progress() * 100)}%</span>
 *   </>
 * )
 * ```
 *
 * Pass motion values straight to `motion` components for styles and attributes: they're rendered
 * every frame without Solid. The accessor updates with Solid (after its flush), so use it for
 * logic and text. It's read-only: write with the motion value's `set`/`jump` or animations.
 *
 * Port note: Solid-only (upstream reads motion values with `useMotionValueEvent` and state).
 * `value` can be an accessor of a motion value, to switch which one is read. The subscription
 * ends with the owner, the motion value itself is never destroyed. On the server, the accessor
 * returns the motion value's current value.
 *
 * @public
 */
export function useMotionValueState<T>(
    value: MaybeAccessor<MotionValue<T>>
): Accessor<T> {
    const getValue = () => access(value)

    /**
     * `ownedWrite`: motion values can be set (and notify) while a component is created, or from
     * other computations.
     */
    const [latest, setLatest] = createSignal<T>(
        untrack(getValue).get() as Exclude<T, Function>,
        {
            ownedWrite: true,
            name:
                process.env.NODE_ENV !== "production"
                    ? "Motion.useMotionValueState.latest"
                    : undefined,
        }
    )

    if (isServer || typeof window === "undefined") return latest

    const subscribe = (motionValue: MotionValue<T>) => {
        const unsubscribe = motionValue.on("change", (next) =>
            setLatest(() => next)
        )
        // It may have changed since it was read.
        setLatest(() => motionValue.get())
        return unsubscribe
    }

    let unsubscribe = subscribe(untrack(getValue))

    if (typeof value === "function") {
        createRenderEffect(
            getValue,
            (motionValue) => {
                unsubscribe()
                unsubscribe = subscribe(motionValue)
            },
            // Client-only: doesn't take part in hydration ids.
            {
                defer: true,
                transparent: true,
                name:
                    process.env.NODE_ENV !== "production"
                        ? "Motion.useMotionValueState.subscribe"
                        : undefined,
            }
        )
    }

    onCleanup(() => unsubscribe())

    return latest
}
