import { isServer } from "@solidjs/web"
import {
    AnimationPlaybackControls,
    cancelFrame,
    cancelMicrotask,
    frame,
    microtask,
    motionValue,
    supportsScrollTimeline,
    supportsViewTimeline,
} from "motion-dom"
import { createEffect, untrack } from "solid-js"
import { scroll } from "../render/dom/scroll"
import { ScrollInfoOptions } from "../render/dom/scroll/types"
import { offsetToViewTimelineRange } from "../render/dom/scroll/utils/offset-to-range"
import {
    isConstantObject,
    readOptions,
    type MaybeAccessor,
} from "../utils/access"
import { resolveRef, type ElementRef } from "../utils/refs"
import { useConstant } from "../utils/use-constant"

/**
 * Port note: `container` and `target` take an element, an accessor of one (e.g. a signal set by
 * `ref`) or a `{ current }` object, instead of a React ref.
 */
export interface UseScrollOptions
    extends Omit<ScrollInfoOptions, "container" | "target"> {
    container?: ElementRef<HTMLElement>
    target?: ElementRef<HTMLElement>
}

const createScrollMotionValues = () => ({
    scrollX: motionValue(0),
    scrollY: motionValue(0),
    scrollXProgress: motionValue(0),
    scrollYProgress: motionValue(0),
})

const isRefPending = (ref?: ElementRef<HTMLElement>) => {
    if (!ref) return false
    return !untrack(() => resolveRef(ref))
}

function makeAccelerateConfig(
    axis: "x" | "y",
    options: Omit<UseScrollOptions, "container" | "target">,
    container?: ElementRef<HTMLElement>,
    target?: ElementRef<HTMLElement>,
    onRefsChange?: Set<VoidFunction>
) {
    return {
        factory: (animation: AnimationPlaybackControls) => {
            let cleanup: VoidFunction | undefined
            let isStopped = false

            const start = () => {
                if (isStopped || cleanup) return

                /**
                 * Don't attach to the window scroll while a provided ref is pending: that
                 * result gets cached and would permanently mistrack.
                 *
                 * Port note: upstream retries with `microtask.read(start)`, from inside
                 * motion-dom's microtask batcher. That batcher can't keep itself alive: a job
                 * scheduled while it's processing is never run, and stops every later job
                 * (Motion's own) from waking it. Here the first attempt is a plain microtask,
                 * and retries wait for the next frame. An accessor ref is retried too: it may
                 * not be reactive (`() => element`), so it may never restart it.
                 */
                if (isRefPending(container) || isRefPending(target)) {
                    frame.read(start)
                    return
                }

                cleanup = scroll(animation, {
                    ...options,
                    axis,
                    container: untrack(() => resolveRef(container)),
                    target: untrack(() => resolveRef(target)),
                })
            }

            /**
             * Port note: an accessor ref can change, so the timeline is attached again.
             */
            const restart = () => {
                cancelFrame(start)
                cleanup?.()
                cleanup = undefined
                start()
            }
            onRefsChange?.add(restart)

            queueMicrotask(start)

            return () => {
                isStopped = true
                onRefsChange?.delete(restart)
                cancelFrame(start)
                cleanup?.()
            }
        },
        times: [0, 1],
        keyframes: [0, 1],
        ease: (v: number) => v,
        duration: 1,
    }
}

function canAccelerateScroll(
    target?: ElementRef<HTMLElement>,
    offset?: ScrollInfoOptions["offset"]
) {
    if (isServer || typeof window === "undefined") return false
    return target
        ? supportsViewTimeline() && !!offsetToViewTimelineRange(offset)
        : supportsScrollTimeline() && !offset
}

/**
 * Create `MotionValue`s that update when the window or an element scrolls.
 *
 * ```jsx
 * const { scrollYProgress } = useScroll()
 *
 * return <motion.div style={{ scaleX: scrollYProgress }} />
 * ```
 *
 * Port note: tracking starts once the component is in the document (when the refs are set), and
 * restarts when an accessor ref changes. The options are read lazily (an accessor, or an object
 * with getters, or a store): changing them restarts tracking. Scroll-driven acceleration is only
 * set up for options that can't change (a plain object without getters, not a store); its native
 * timeline is attached again when an accessor `container`/`target` changes.
 *
 * @public
 */
export function useScroll(options: MaybeAccessor<UseScrollOptions> = {}) {
    const values = useConstant(createScrollMotionValues)

    if (isConstantOptions(options)) {
        const { container, target, ...scrollOptions } = options
        if (canAccelerateScroll(target, scrollOptions.offset)) {
            /**
             * Accelerated timelines attached with accessor refs, restarted when they change.
             *
             * Port note: client-only (it can't accelerate on the server), so `transparent`: it
             * doesn't shift the hydration keys of what the component renders next.
             */
            const onRefsChange = new Set<VoidFunction>()
            if (
                typeof container === "function" ||
                typeof target === "function"
            ) {
                createEffect(
                    () => [resolveRef(container), resolveRef(target)],
                    () => onRefsChange.forEach((restart) => restart()),
                    {
                        defer: true,
                        transparent: true,
                        name:
                            process.env.NODE_ENV !== "production"
                                ? "Motion.useScroll.refs"
                                : undefined,
                    }
                )
            }

            values.scrollXProgress.accelerate = makeAccelerateConfig(
                "x",
                scrollOptions,
                container,
                target,
                onRefsChange
            )
            values.scrollYProgress.accelerate = makeAccelerateConfig(
                "y",
                scrollOptions,
                container,
                target,
                onRefsChange
            )
        }
    }

    const start = ({ container, target, ...scrollOptions }: UseScrollOptions) =>
        scroll(
            (
                _progress: number,
                {
                    x,
                    y,
                }: {
                    x: { current: number; progress: number }
                    y: { current: number; progress: number }
                }
            ) => {
                values.scrollX.set(x.current)
                values.scrollXProgress.set(x.progress)
                values.scrollY.set(y.current)
                values.scrollYProgress.set(y.progress)
            },
            {
                ...scrollOptions,
                container: untrack(() => resolveRef(container)),
                target: untrack(() => resolveRef(target)),
            }
        )

    createEffect(
        () => {
            const current = readOptions(options) ?? {}
            resolveRef(current.container)
            resolveRef(current.target)
            return current
        },
        (current) => {
            const { container, target } = current
            if (!isRefPending(container) && !isRefPending(target)) {
                return start(current)
            }

            /**
             * A pending `{ current }` ref (or an accessor that isn't reactive) isn't tracked:
             * like upstream, try again once the effects of this flush (which may set it) have
             * run, then every frame until it's set.
             */
            let cleanup: VoidFunction | undefined
            const tryStart = () => {
                if (!isRefPending(container) && !isRefPending(target)) {
                    cleanup = start(current)
                } else {
                    frame.read(tryStart)
                }
            }
            microtask.read(tryStart)

            return () => {
                cancelMicrotask(tryStart)
                cancelFrame(tryStart)
                cleanup?.()
            }
        },
        {
            name:
                process.env.NODE_ENV !== "production"
                    ? "Motion.useScroll.track"
                    : undefined,
        }
    )

    return values
}

/**
 * Options that are a plain object without getters (not a store).
 */
function isConstantOptions(
    options: MaybeAccessor<UseScrollOptions>
): options is UseScrollOptions {
    return typeof options !== "function" && isConstantObject(options)
}
