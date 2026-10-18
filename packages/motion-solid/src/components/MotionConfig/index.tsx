import type { JSX } from "@solidjs/web"
import { resolveTransition } from "motion-dom"
import { untrack, useContext } from "solid-js"
import { MotionConfigContext } from "../../context/MotionConfigContext"

export interface MotionConfigProps extends Partial<MotionConfigContext> {
    children?: JSX.Element
}

/**
 * `MotionConfig` is used to set configuration options for all children `motion` components.
 *
 * ```jsx
 * import { motion, MotionConfig } from "@motion-s/solid"
 *
 * export function App() {
 *   return (
 *     <MotionConfig transition={{ type: "spring" }}>
 *       <motion.div animate={{ x: 100 }} />
 *     </MotionConfig>
 *   )
 * }
 * ```
 *
 * @public
 *
 * Port note: the context value reads the props through getters, so `motion` components see
 * changes to them (upstream re-renders them with a new context value).
 */
export function MotionConfig(props: MotionConfigProps) {
    /**
     * Inherit props from any parent MotionConfig components
     */
    const parentConfig = useContext(MotionConfigContext)

    /**
     * Don't allow isStatic to change, as it decides whether motion components animate at all.
     */
    const isStatic = untrack(() => props.isStatic ?? parentConfig.isStatic)

    const context: MotionConfigContext = {
        get transformPagePoint() {
            return props.transformPagePoint ?? parentConfig.transformPagePoint
        },
        get isStatic() {
            return isStatic
        },
        get transition() {
            return resolveTransition(
                props.transition ?? parentConfig.transition,
                parentConfig.transition
            )
        },
        get reducedMotion() {
            return props.reducedMotion ?? parentConfig.reducedMotion
        },
        get nonce() {
            return props.nonce ?? parentConfig.nonce
        },
        get skipAnimations() {
            return props.skipAnimations ?? parentConfig.skipAnimations
        },
        get isValidProp() {
            return props.isValidProp ?? parentConfig.isValidProp
        },
    }

    return (
        <MotionConfigContext value={context}>
            {props.children}
        </MotionConfigContext>
    )
}
