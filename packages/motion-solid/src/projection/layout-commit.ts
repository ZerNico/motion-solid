import { createRenderEffect, createSignal, onCleanup } from "solid-js"

/**
 * Port note: Solid-only. Upstream takes layout snapshots in `getSnapshotBeforeUpdate` and
 * measures the new layout in `componentDidUpdate`. Solid has no render phase, but it does have a
 * moment that's exactly "after the update is decided, before the DOM is written": when a
 * computation re-runs, the cleanup of its previous run is called at the commit of the new run,
 * after every compute of the flush and before any DOM write. That also holds when an async
 * transition holds the update: the cleanup waits for the landing, together with the DOM writes.
 * (Pinned by `test/solid-contract.browser.test.tsx`.)
 *
 * A layout trigger is a render effect whose previous run, when retired, takes the layout
 * snapshots. The new layout is measured after the flush, by motion-dom's `didUpdate()`, which
 * the snapshot schedules on its microtask batcher.
 */
export function createLayoutTrigger<T>(
    compute: () => T,
    onRetire: (next: T) => void,
    onApply?: (value: T) => void,
    options?: { transparent?: boolean }
) {
    let run = 0
    let latest: T

    createRenderEffect(
        () => {
            const value = (latest = compute())
            const thisRun = ++run

            onCleanup(() => {
                /**
                 * A run is retired when a newer run commits. A cleanup without a newer run is
                 * a superseded speculative run, or the computation being disposed.
                 */
                if (run > thisRun) guard(() => onRetire(latest))
            })

            return value
        },
        (value) => {
            onApply?.(value)
        },
        options
    )
}

/**
 * Port note: Solid-only. Calls `callback` at the commit of the update that's running: after its
 * computes, before Solid writes the DOM, and when async work holds the update, at its landing.
 * For what happens when a component is created (its creation can move the elements around it),
 * which upstream snapshots in the render phase of the components that re-render with it.
 *
 * A layout trigger over a signal of its own, written once: the first run is retired at the
 * commit of the update the write belongs to (the one creating the caller). The signal is only
 * read by this trigger, so the write can't hold or entangle anything else.
 */
export function onLayoutCommit(
    callback: VoidFunction,
    options?: { transparent?: boolean }
) {
    const [committed, setCommitted] = createSignal(false, {
        ownedWrite: true,
    })
    createLayoutTrigger(committed, callback, undefined, options)
    setCommitted(true)
}

/**
 * motion-dom's frame/microtask batchers don't recover from a throwing step (it would stop every
 * later layout update on the page), so nothing the glue runs from a snapshot may throw.
 */
export function guard(callback: VoidFunction) {
    try {
        callback()
    } catch (error) {
        console.error(error)
    }
}

/**
 * The current layout commit: a number that changes between flushes, so scopes snapshot their
 * subtree at most once per commit.
 */
let commitId = 0
let isCommitActive = false

export function getCommitId() {
    if (!isCommitActive) {
        isCommitActive = true
        commitId++
        queueMicrotask(() => {
            isCommitActive = false
        })
    }
    return commitId
}
