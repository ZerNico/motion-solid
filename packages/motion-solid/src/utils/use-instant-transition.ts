import { frame } from "motion-dom"
import { MotionGlobalConfig } from "motion-utils"
import { useInstantLayoutTransition } from "../projection/use-instant-layout-transition"

/**
 * Returns a function that runs a state change without animations (layout animations included).
 *
 * Port note: upstream forces a re-render and unlocks animations two frames after it. Here they're
 * unlocked two frames after the callback.
 *
 * @public
 */
export function useInstantTransition() {
    const startInstantLayoutTransition = useInstantLayoutTransition()
    let transitionId = 0

    return (callback: () => void) => {
        startInstantLayoutTransition(() => {
            MotionGlobalConfig.instantAnimations = true
            const id = ++transitionId
            callback()

            frame.postRender(() =>
                frame.postRender(() => {
                    if (id !== transitionId) return
                    MotionGlobalConfig.instantAnimations = false
                })
            )
        })
    }
}

export function disableInstantTransitions() {
    MotionGlobalConfig.instantAnimations = false
}
