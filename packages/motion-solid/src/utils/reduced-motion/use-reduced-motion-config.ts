import { useContext, type Accessor } from "solid-js"
import { MotionConfigContext } from "../../context/MotionConfigContext"
import { useReducedMotion } from "./use-reduced-motion"

/**
 * Port note: returns an accessor, which follows `MotionConfig`'s `reducedMotion` and the device
 * setting.
 */
export function useReducedMotionConfig(): Accessor<boolean | null> {
    const reducedMotionPreference = useReducedMotion()
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
