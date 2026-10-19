import {
    AnyResolvedKeyframe,
    attachFollow,
    FollowValueOptions,
    isMotionValue,
    motionValue,
    MotionValue,
} from "motion-dom"
import {
    createMemo,
    createRenderEffect,
    onCleanup,
    untrack,
    useContext,
} from "solid-js"
import { MotionConfigContext } from "../context/MotionConfigContext"
import { access, readOptions, type MaybeAccessor } from "../utils/access"
import { useMotionValue } from "./use-motion-value"
import { useTransform } from "./use-transform"

/**
 * Creates a `MotionValue` that, when `set`, will use the specified animation transition to animate to its new state.
 *
 * Unlike `useSpring` which is limited to spring animations, `useFollowValue` accepts any motion transition
 * including spring, tween, inertia, and keyframes.
 *
 * It can either work as a stand-alone `MotionValue` by initialising it with a value, or as a subscriber
 * to another `MotionValue`.
 *
 * @public
 */
export function useFollowValue(
    source: MaybeAccessor<MotionValue<string> | string>,
    options?: MaybeAccessor<FollowValueOptions>
): MotionValue<string>
export function useFollowValue(
    source: MaybeAccessor<MotionValue<number> | number>,
    options?: MaybeAccessor<FollowValueOptions>
): MotionValue<number>
export function useFollowValue(
    source: MaybeAccessor<
        MotionValue<string> | MotionValue<number> | AnyResolvedKeyframe
    >,
    options: MaybeAccessor<FollowValueOptions> = {}
) {
    return useFollow(source, options, attachFollow)
}

/**
 * Port note: upstream re-attaches when the options change between renders. Here the options are
 * read lazily (an accessor, or an object with getters), and re-attached when they change.
 * `source` can also be an accessor: of a motion value (re-attached when it changes) or of a
 * value, which is followed when it changes (upstream reads a plain value on every render).
 * Unlike upstream, re-attaching (new source motion value or options) stops the running animation
 * and heads for the followed value again. Disposing it stops its animation.
 */
export function useFollow<O extends object>(
    source: MaybeAccessor<
        MotionValue<string> | MotionValue<number> | AnyResolvedKeyframe
    >,
    options: MaybeAccessor<O>,
    attach: (
        value: MotionValue<any>,
        target: MotionValue<any> | AnyResolvedKeyframe,
        transition: O
    ) => VoidFunction
) {
    const { isStatic } = useContext(MotionConfigContext)
    const getSource = () => access(source)
    const getFromSource = () => {
        const current = getSource()
        return isMotionValue(current) ? current.get() : current
    }

    // isStatic will never change, allowing early hooks return
    if (isStatic) {
        return useTransform(getFromSource)
    }

    const value = useMotionValue(untrack(getFromSource))

    /**
     * A value returned by an accessor is followed through a motion value, set when it changes.
     * Only a change of the followed motion value (or of the options) attaches again.
     */
    let target: MotionValue<any> | undefined
    if (typeof source === "function") {
        target = motionValue(untrack(getFromSource))
        createRenderEffect(
            getSource,
            (current) => {
                if (!isMotionValue(current)) target!.set(current)
            },
            {
                defer: true,
                name:
                    process.env.NODE_ENV !== "production"
                        ? "Motion.useFollowValue.source"
                        : undefined,
            }
        )
    }

    const getFollowed = createMemo(
        () => {
            const current = getSource()
            return isMotionValue(current) || !target ? current : target
        },
        {
            name:
                process.env.NODE_ENV !== "production"
                    ? "Motion.useFollowValue.followed"
                    : undefined,
        }
    )
    const getOptions = () => readOptions(options) ?? ({} as O)

    let detach = attach(value, untrack(getFollowed), untrack(getOptions))
    createRenderEffect(
        () => [getFollowed(), getOptions()] as const,
        ([followed, transition]) => {
            detach()
            value.stop()
            detach = attach(value, followed, transition)

            /**
             * Head for the followed value, which may have changed while detached.
             */
            if (isMotionValue(followed)) value.set(followed.get())
        },
        {
            defer: true,
            name:
                process.env.NODE_ENV !== "production"
                    ? "Motion.useFollowValue.attach"
                    : undefined,
        }
    )
    onCleanup(() => {
        detach()
        value.stop()
    })

    return value
}
