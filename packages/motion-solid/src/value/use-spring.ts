import {
    attachSpring,
    FollowValueOptions,
    MotionValue,
    SpringOptions,
} from "motion-dom"
import type { MaybeAccessor } from "../utils/access"
import { useFollow } from "./use-follow-value"

type UseSpringOptions = SpringOptions &
    Pick<FollowValueOptions, "skipInitialAnimation">

/**
 * Creates a `MotionValue` that, when `set`, will use a spring animation to animate to its new state.
 *
 * It can either work as a stand-alone `MotionValue` by initialising it with a value, or as a subscriber
 * to another `MotionValue`.
 *
 * @remarks
 *
 * ```jsx
 * const x = useSpring(0, { stiffness: 300 })
 * const y = useSpring(x, { damping: 10 })
 * ```
 *
 * @param inputValue - `MotionValue` or number. If provided a `MotionValue`, when the input `MotionValue` changes, the created `MotionValue` will spring towards that value.
 * @param springConfig - Configuration options for the spring.
 * @returns `MotionValue`
 *
 * @public
 */
export function useSpring(
    source: MaybeAccessor<MotionValue<string> | string>,
    options?: MaybeAccessor<UseSpringOptions>
): MotionValue<string>
export function useSpring(
    source: MaybeAccessor<MotionValue<number> | number>,
    options?: MaybeAccessor<UseSpringOptions>
): MotionValue<number>
export function useSpring(
    source: MaybeAccessor<
        MotionValue<string> | MotionValue<number> | string | number
    >,
    options: MaybeAccessor<UseSpringOptions> = {}
): MotionValue<string> | MotionValue<number> {
    return useFollow(source, options, attachSpring) as MotionValue<any>
}
