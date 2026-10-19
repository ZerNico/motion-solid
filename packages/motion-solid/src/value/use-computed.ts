import {
    cancelFrame,
    collectMotionValues,
    frame,
    type MotionValue,
} from "motion-dom"
import {
    createRenderEffect,
    createRoot,
    getOwner,
    onCleanup,
    runWithOwner,
} from "solid-js"
import { useMotionValue } from "./use-motion-value"

/**
 * Port note: upstream collects the motion values `compute` reads on every render. Here they're
 * collected every time it runs (when one of them changes, or a Solid signal it reads), and the
 * subscriptions follow: like a Solid memo, a motion value read behind a condition is followed
 * once it's read.
 */
export function useComputed<O>(compute: () => O): MotionValue<O> {
    let dependencies: MotionValue[] = []
    let value!: MotionValue<O>
    const subscriptions = new Map<MotionValue, VoidFunction>()

    /**
     * Run `compute` with a session of collectMotionValues open: any MotionValue that calls get()
     * is saved into it.
     */
    const run = (): O => {
        const previous = collectMotionValues.current
        collectMotionValues.current = []
        try {
            return compute()
        } finally {
            dependencies = collectMotionValues.current
            collectMotionValues.current = previous
        }
    }

    /**
     * Port note: every run is tracked, so the Solid signals it reads (also those first read in a
     * run caused by a motion value) are followed. A run caused by a motion value happens in the
     * frame, outside Solid: it replaces the computation tracking the previous run with a new one,
     * whose first run (synchronous) is this one. If that run is pending (it reads async data that
     * isn't ready), the published value is kept until it's ready (not the last computed one,
     * which can belong to an update that async work holds).
     */
    const owner = getOwner()
    let disposeTracking: VoidFunction | undefined

    const track = (): O => {
        disposeTracking?.()
        let latest = value?.get() as O
        runWithOwner(owner, () =>
            createRoot((dispose) => {
                disposeTracking = dispose

                /**
                 * Recompute when Solid signals read by `compute` change.
                 */
                createRenderEffect(
                    () => (latest = run()),
                    (current) => {
                        value.set(current)
                        subscribe()
                    },
                    {
                        defer: true,
                        name:
                            process.env.NODE_ENV !== "production"
                                ? "Motion.useComputed.compute"
                                : undefined,
                    }
                )
            })
        )
        return latest
    }

    value = useMotionValue(track())

    const update = () => {
        value.set(track())
        subscribe()
    }

    const scheduleUpdate = () => frame.preRender(update, false, true)

    /**
     * Subscribe to the motion values read by the last run, and unsubscribe from the others.
     */
    const subscribe = () => {
        const current = new Set(dependencies)
        subscriptions.forEach((unsubscribe, dependency) => {
            if (current.has(dependency)) return
            unsubscribe()
            subscriptions.delete(dependency)
        })
        current.forEach((dependency) => {
            if (!subscriptions.has(dependency)) {
                subscriptions.set(
                    dependency,
                    dependency.on("change", scheduleUpdate)
                )
            }
        })
    }

    subscribe()

    onCleanup(() => {
        subscriptions.forEach((unsubscribe) => unsubscribe())
        subscriptions.clear()
        cancelFrame(update)
        disposeTracking?.()
    })

    return value
}
