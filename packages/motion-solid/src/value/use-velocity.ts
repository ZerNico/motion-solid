import { cancelFrame, frame, MotionValue } from "motion-dom"
import { onCleanup, untrack } from "solid-js"
import { access, type MaybeAccessor } from "../utils/access"
import { useMotionValueEvent } from "../utils/use-motion-value-event"
import { useMotionValue } from "./use-motion-value"
/**
 * Creates a `MotionValue` that updates when the velocity of the provided `MotionValue` changes.
 *
 * ```javascript
 * const x = useMotionValue(0)
 * const xVelocity = useVelocity(x)
 * const xAcceleration = useVelocity(xVelocity)
 * ```
 *
 * Port note: `value` can be an accessor of a motion value, to switch which one is followed.
 *
 * @public
 */
export function useVelocity(
    value: MaybeAccessor<MotionValue<number>>
): MotionValue<number> {
    const getValue = () => untrack(() => access(value))
    const velocity = useMotionValue(getValue().getVelocity())

    const updateVelocity = () => {
        const latest = getValue().getVelocity()
        velocity.set(latest)

        /**
         * If we still have velocity, schedule an update for the next frame
         * to keep checking until it is zero.
         */
        if (latest) frame.update(updateVelocity)
    }

    useMotionValueEvent(value, "change", () => {
        // Schedule an update to this value at the end of the current frame.
        frame.update(updateVelocity, false, true)
    })

    /**
     * Port note: upstream leaves a scheduled update running after unmount.
     */
    onCleanup(() => cancelFrame(updateVelocity))

    return velocity
}
