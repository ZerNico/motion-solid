import { cancelFrame, frame, MotionValue } from "motion-dom"
import { createRenderEffect, untrack } from "solid-js"
import { access, type MaybeAccessor } from "../utils/access"
import { useMotionValue } from "./use-motion-value"

/**
 * Port note: `values` can be an accessor (re-subscribes when it changes), and the value is also
 * recomputed when Solid signals read by `combineValues` change (upstream recomputes on every
 * render).
 */
export function useCombineMotionValues<R>(
    values: MaybeAccessor<MotionValue[]>,
    combineValues: () => R
) {
    /**
     * Initialise the returned motion value. This remains the same between renders.
     */
    const value = useMotionValue(untrack(combineValues))

    /**
     * Create a function that will update the template motion value with the latest values.
     * This is pre-bound so whenever a motion value updates it can schedule its
     * execution in Framesync. If it's already been scheduled it won't be fired twice
     * in a single frame.
     */
    const updateValue = () => value.set(untrack(combineValues))

    createRenderEffect(
        combineValues,
        (latest) => {
            value.set(latest)
        },
        {
            defer: true,
            name:
                process.env.NODE_ENV !== "production"
                    ? "Motion.useCombineMotionValues.latest"
                    : undefined,
        }
    )

    /**
     * Subscribe to all motion values found within the template. Whenever any of them change,
     * schedule an update.
     */
    createRenderEffect(
        () => access(values),
        (list) => {
            const scheduleUpdate = () =>
                frame.preRender(updateValue, false, true)
            const subscriptions = list.map((v) =>
                v.on("change", scheduleUpdate)
            )

            return () => {
                subscriptions.forEach((unsubscribe) => unsubscribe())
                cancelFrame(updateValue)
            }
        },
        {
            name:
                process.env.NODE_ENV !== "production"
                    ? "Motion.useCombineMotionValues.subscribe"
                    : undefined,
        }
    )

    return value
}
