import { useContext, type Accessor } from "solid-js"
import { MotionConfigContext } from "../../context/MotionConfigContext"
import {
    getReducedMotionPreference,
    useReducedMotion,
} from "./use-reduced-motion"

/**
 * Port note: returns an accessor, which follows `MotionConfig`'s `reducedMotion` and the device
 * setting.
 */
export function useReducedMotionConfig(): Accessor<boolean | null> {
    return reducedMotionConfig(useReducedMotion())
}

/**
 * Port note: Solid-only. `useReducedMotionConfig` with the device setting read directly (see
 * `getReducedMotionPreference`), for `useAnimate`.
 */
export function useAnimationReducedMotionConfig(): Accessor<boolean | null> {
    return reducedMotionConfig(getReducedMotionPreference())
}

function reducedMotionConfig(
    reducedMotionPreference: Accessor<boolean | null>
): Accessor<boolean | null> {
    const config = useContext(MotionConfigContext)

    return () => {
        const { reducedMotion } = config

        if (reducedMotion === "never") {
            return false
        } else if (reducedMotion === "always") {
            return true
        } else {
            return reducedMotionPreference()
        }
    }
}
