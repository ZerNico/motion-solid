import type { LegacyAnimationControls } from "motion-dom"
import { onCleanup } from "solid-js"
import { flushPendingMounts } from "../../motion"
import { animationControls } from "./animation-controls"

/**
 * Creates `AnimationControls`, which can be used to manually start, stop
 * and sequence animations on one or more components.
 *
 * The returned `AnimationControls` should be passed to the `animate` property
 * of the components you want to animate.
 *
 * ```jsx
 * const controls = useAnimationControls()
 *
 * onSettled(() => {
 *   controls.start({ x: 100 })
 * })
 *
 * return <motion.div animate={controls} />
 * ```
 *
 * Port note: motion components mount once their element is in the document, at the end of the
 * update that inserts it. `start()`/`set()` first mount the ones that are waiting, so they can be
 * called from an effect or `onSettled` like upstream's `useEffect`.
 *
 * @public
 */
export function useAnimationControls(): LegacyAnimationControls {
    const controls = animationControls()
    onCleanup(controls.mount())

    const { start, set } = controls

    controls.start = (definition, transitionOverride) => {
        flushPendingMounts()
        return start(definition, transitionOverride)
    }

    controls.set = (definition) => {
        flushPendingMounts()
        set(definition)
    }

    return controls
}

export const useAnimation = useAnimationControls
