import type { MotionValue, MotionValueEventCallbacks } from "motion-dom"
import { createRenderEffect, onCleanup, untrack } from "solid-js"
import type { MaybeAccessor } from "./access"

/**
 * Subscribe to a `MotionValue` event (`"change"`, `"animationStart"`, ...) for the lifetime of
 * the component.
 *
 * Port note: `value` can be an accessor of a motion value: the subscription moves to the new one
 * when it changes.
 *
 * @public
 */
export function useMotionValueEvent<
    V,
    EventName extends keyof MotionValueEventCallbacks<V>
>(
    value: MaybeAccessor<MotionValue<V>>,
    event: EventName,
    callback: MotionValueEventCallbacks<V>[EventName]
) {
    if (typeof value !== "function") {
        onCleanup(value.on(event, callback))
        return
    }

    let unsubscribe = untrack(value).on(event, callback)
    createRenderEffect(
        value,
        (motionValue) => {
            unsubscribe()
            unsubscribe = motionValue.on(event, callback)
        },
        {
            defer: true,
            name:
                process.env.NODE_ENV !== "production"
                    ? "Motion.useMotionValueEvent.subscribe"
                    : undefined,
        }
    )
    onCleanup(() => unsubscribe())
}
