import { isMotionValue, MotionValue } from "motion-dom"
import { access, type MaybeAccessor } from "../utils/access"
import { useCombineMotionValues } from "./use-combine-values"

/**
 * Combine multiple motion values into a new one using a string template literal.
 *
 * ```jsx
 * import {
 *   motion,
 *   useSpring,
 *   useMotionValue,
 *   useMotionTemplate
 * } from "framer-motion"
 *
 * function Component() {
 *   const shadowX = useSpring(0)
 *   const shadowY = useMotionValue(0)
 *   const shadow = useMotionTemplate`drop-shadow(${shadowX}px ${shadowY}px 20px rgba(0,0,0,0.3))`
 *
 *   return <motion.div style={{ filter: shadow }} />
 * }
 * ```
 *
 * Values that can change are passed as accessors: `${() => props.offset}`.
 *
 * @public
 */
export function useMotionTemplate(
    fragments: TemplateStringsArray,
    ...values: Array<MaybeAccessor<MotionValue | number | string>>
) {
    /**
     * Create a function that will build a string from the latest motion values.
     * Port note: a value can be an accessor (of a motion value or a static value), read when
     * building, so the template follows it.
     */
    const numFragments = fragments.length
    const resolveValues = () => values.map((value) => access(value))

    function buildValue() {
        const resolved = resolveValues()
        let output = ``

        for (let i = 0; i < numFragments; i++) {
            output += fragments[i]
            const value = resolved[i]
            /**
             * Port note: upstream checks `if (value)`, which drops a static `0`.
             */
            if (value !== undefined && value !== null) {
                output += isMotionValue(value) ? value.get() : value
            }
        }

        return output
    }

    return useCombineMotionValues(
        () => resolveValues().filter(isMotionValue),
        buildValue
    )
}
