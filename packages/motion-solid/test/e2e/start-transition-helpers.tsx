/**
 * Port of upstream's `dev/react/src/tests/start-transition-helpers.ts`, the shared harness of the
 * start-transition-* test pages (used by the `start-transition-*.browser.test.tsx` ports).
 *
 * Pages drive a scripted timeline of real `.click()`s, log every commit, and sample tracked
 * elements' rendered boxes once per frame after Motion's render step. Specs call `analyze` to
 * turn a sample series into jump / late-start / missed-animation metrics.
 *
 * Port note: React's concurrent modes are translated to their Solid 2 equivalents, a state change
 * held by pending async work so the DOM update commits later:
 *
 * - `sync`: a plain signal write. The slow render (`SlowList`) blocks the flush, like React's
 *   synchronous render.
 * - `transition` (`startTransition`) and `useTransition`: the write runs in an `action` that then
 *   does the slow render as async work (`slowRender`: busy chunks that yield to the event loop,
 *   like React's time-sliced render). The write is held until the action settles, and actions
 *   that touch the same state are batched, like React's transition lanes. Pages using
 *   `useTransition` also read `isPending`.
 * - `deferred` (`useDeferredValue`): the write is urgent, and what's rendered is an async memo of
 *   it that resolves after the slow render, so the previous value stays on screen meanwhile.
 *
 * The `window.__events`/`__samples`/`__done` globals are module state (`harness`).
 */
import { type JSX } from "@solidjs/web"
import {
    action,
    createEffect,
    createMemo,
    untrack,
    type Accessor,
} from "solid-js"
import { onTestFinished } from "vitest"
import { cancelFrame, frame } from "../../src"

export type Mode = "sync" | "transition" | "useTransition" | "deferred"

export interface HarnessParams {
    mode?: Mode
    slowCount?: number
    slowMs?: number
}

/**
 * Layout animation duration, in seconds. Long enough to sample ~35 frames, short enough to keep
 * the suite quick.
 */
export const duration = 0.6

export const linear = { type: "tween" as const, ease: "linear" as const }

interface Box {
    x: number
    y: number
    w: number
    h: number
    opacity: number
}

interface Sample {
    t: number
    /**
     * Timestamp of the Motion frame the sample was taken in.
     */
    tl: number
    boxes: Record<string, Box | null>
}

export interface LogEvent {
    t: number
    type: string
    data?: any
}

export const harness = {
    mode: "sync" as Mode,
    slowCount: 12,
    slowMs: 5,
    events: [] as LogEvent[],
    samples: [] as Sample[],
    pointer: [] as { t: number; y: number }[],
    done: false,
}

/**
 * Sets the page's URL parameters (upstream reads them at module load).
 */
export function configure({
    mode = "sync",
    slowCount = 12,
    slowMs = 5,
}: HarnessParams) {
    harness.mode = mode
    harness.slowCount = slowCount
    harness.slowMs = slowMs
    harness.events = []
    harness.samples = []
    harness.pointer = []
    harness.done = false
}

export const log = (type: string, data?: unknown) =>
    harness.events.push({ t: performance.now(), type, data })

export function busy(ms: number) {
    const end = performance.now() + ms
    let now = 0
    while (now < end) now = performance.now()
}

const channel = new MessageChannel()
const queue: Array<() => void> = []
channel.port1.onmessage = () => queue.shift()?.()

/**
 * Yields to the event loop like React's scheduler (a macrotask, without setTimeout's clamping).
 */
const yieldToEventLoop = () =>
    new Promise<void>((resolve) => {
        queue.push(resolve)
        channel.port2.postMessage(null)
    })

/**
 * The slow render of a concurrent update, as async work: `slowCount` slow components, yielding
 * between them so the render spans several tasks (and frames).
 */
export async function slowRender(count = harness.slowCount) {
    for (let i = 0; i < count; i++) {
        busy(harness.slowMs)
        await yieldToEventLoop()
    }
}

/**
 * Deliberately slow children. In `sync` mode, a change of `tick` blocks the flush for the time
 * React's synchronous render of the slow components takes. In the concurrent modes, the slow
 * render is the async work holding the update (see `update`/`deferred`), so landing is fast.
 */
export function SlowList(props: { tick: unknown }) {
    let first = true
    const tick = createMemo(() => {
        const value = String(props.tick)
        if (!first && harness.mode === "sync") {
            busy(harness.slowCount * harness.slowMs)
        }
        first = false
        return value
    })
    return <div style={{ display: "none" }} data-tick={tick()} />
}

const transition = action(function* (fn: () => void, slow: boolean) {
    fn()
    yield slow ? slowRender() : Promise.resolve()
})

/**
 * Wrap a state update according to the page's mode (upstream's `update(fn, start)`).
 * `slow: false` for pages without a slow render.
 */
export function update(fn: () => void, slow = true) {
    if (harness.mode === "transition" || harness.mode === "useTransition") {
        transition(fn, slow)
    } else {
        fn()
    }
}

/**
 * `mode === "deferred" ? useDeferredValue(value) : value`. Read it under a `<Loading>`.
 */
export function deferred<T>(source: Accessor<T>, slow = true): Accessor<T> {
    if (untrack(() => harness.mode) !== "deferred") return source
    let first = true
    return createMemo(() => {
        const value = source()
        if (first) {
            first = false
            return value
        }
        return (slow ? slowRender() : Promise.resolve()).then(() => value)
    }) as Accessor<T>
}

/**
 * Logs a commit whenever the committed value changes (upstream logs every commit, from a layout
 * effect). Effects run once the update has landed in the DOM.
 */
export function useCommitLog(label: string, value: Accessor<unknown>) {
    createEffect(value, (latest) => {
        log("commit", { label, value: latest })
    })
}

const tracked = () =>
    Array.from(document.querySelectorAll<HTMLElement>("[data-track]"))

function measureBoxes() {
    const boxes: Record<string, Box | null> = {}
    for (const el of tracked()) {
        const name = el.dataset.track!
        if (!el.isConnected) {
            boxes[name] = null
            continue
        }
        const { left, top, width, height } = el.getBoundingClientRect()
        boxes[name] = {
            x: left,
            y: top,
            w: width,
            h: height,
            opacity: parseFloat(getComputedStyle(el).opacity),
        }
    }
    return boxes
}

function sample({ timestamp }: { timestamp: number }) {
    harness.samples.push({
        t: performance.now(),
        tl: timestamp,
        boxes: measureBoxes(),
    })
}

function startSampling() {
    harness.events = []
    harness.samples = []
    harness.done = false
    log("start")
    frame.postRender(sample, true)
    onTestFinished(() => cancelFrame(sample))
}

/**
 * Run a scripted timeline: each step is [delayFromStartMs, action]. `done` is set `tail` ms
 * after the last step. Sampling carries on until the test ends.
 */
export function runScript(steps: Array<[number, () => void]>, tail = 1200) {
    const start = performance.now()
    startSampling()
    const timers = steps.map(([delay, step]) => setTimeout(step, delay))
    const last = Math.max(...steps.map(([d]) => d))
    timers.push(
        setTimeout(() => {
            log("done", { elapsed: performance.now() - start })
            harness.done = true
        }, last + tail)
    )
    onTestFinished(() => timers.forEach(clearTimeout))
}

/**
 * Run one action per animation frame (after Motion's render step), then set `done` after `tail`
 * ms. Used for gestures.
 */
export function runFrameScript(actions: Array<() => void>, tail = 1200) {
    startSampling()
    let i = 0
    let stopped = false
    const step = () => {
        if (stopped) return
        if (i < actions.length) {
            actions[i++]()
            frame.postRender(step)
        } else {
            setTimeout(() => {
                log("done")
                harness.done = true
            }, tail)
        }
    }
    frame.postRender(step)
    onTestFinished(() => {
        stopped = true
        cancelFrame(step)
    })
}

/**
 * Clicks record every tracked element's box first.
 */
export const click = (id: string) => () => {
    log("snapshot", measureBoxes())
    log("click", id)
    document.getElementById(id)!.click()
}

/**
 * The `#run` button of the pages.
 */
export function RunButton(props: { onClick: () => void }): JSX.Element {
    return (
        <button id="run" onClick={() => props.onClick()}>
            run
        </button>
    )
}

interface AnalyzeOptions {
    name: string
    axis?: "x" | "y" | "w" | "h" | "opacity"
    from: number
    to: number
    after?: number
    jumpFraction?: number
    durationMs?: number
    startValue?: number
}

/**
 * Summarise the sampled path of one tracked element between `from` and `to` (verbatim).
 */
export function analyze({
    name,
    axis = "x",
    from,
    to,
    after = 0,
    jumpFraction = 0.25,
    durationMs = duration * 1000,
    startValue,
}: AnalyzeOptions) {
    const distance = Math.abs(to - from)
    const raw = harness.samples
        .filter((s) => s.t >= after)
        .map((s) => ({ t: s.t, tl: s.tl, v: s.boxes[name]?.[axis] ?? null }))
        .filter((s): s is { t: number; tl: number; v: number } => s.v !== null)
    const snapshot = harness.events
        .filter((e) => e.type === "snapshot" && e.t <= after)
        .pop()?.data as Record<string, Box | null> | undefined
    const start = startValue ?? snapshot?.[name]?.[axis]
    const base =
        axis === "opacity"
            ? 0
            : start !== undefined
            ? start - from
            : raw.length
            ? raw[0].v - from
            : 0
    const series = raw.map((s) => ({ t: s.t, tl: s.tl, v: s.v - base }))

    const progressOf = (v: number) => (v - from) / (to - from)
    const tolerance = Math.min(0.5, distance * 0.01)
    const moved = series.findIndex((s) => Math.abs(s.v - from) > tolerance)
    const firstMove = moved === -1 ? null : series[moved]
    const endTolerance = Math.max(tolerance * 2, distance * 0.01)
    const reachedEnd = series.findIndex(
        (s) => Math.abs(s.v - to) < endTolerance
    )

    const speed = distance / durationMs
    let maxDelta = 0
    let jumps = 0
    for (let i = 1; i < series.length; i++) {
        const delta = Math.abs(series[i].v - series[i - 1].v)
        const elapsed = series[i].tl - series[i - 1].tl
        maxDelta = Math.max(maxDelta, delta)
        if (delta > Math.max(distance * jumpFraction, 2 * speed * elapsed)) {
            jumps++
        }
    }

    const leftStartAt =
        moved > 0 ? series[moved - 1].t : moved === 0 ? after : null

    const intermediate = series.filter((s) => {
        const p = progressOf(s.v)
        return p > 0.02 && p < 0.98
    }).length

    return {
        samples: series.length,
        lastSampleAt: series.length ? series[series.length - 1].t : null,
        firstMoveAt: firstMove?.t ?? null,
        firstMoveProgress: firstMove ? progressOf(firstMove.v) : null,
        reachedEndAt: reachedEnd === -1 ? null : series[reachedEnd].t,
        finalValue: series.length ? series[series.length - 1].v : null,
        finalProgress: series.length
            ? progressOf(series[series.length - 1].v)
            : null,
        intermediateFrames: intermediate,
        animatedMs:
            leftStartAt !== null && reachedEnd !== -1
                ? series[reachedEnd].t - leftStartAt
                : 0,
        maxDeltaFraction: distance ? maxDelta / distance : 0,
        stillMs: series.length
            ? series[series.length - 1].tl -
              (series
                  .slice()
                  .reverse()
                  .find(
                      (s) =>
                          Math.abs(s.v - series[series.length - 1].v) >
                          tolerance
                  )?.tl ?? series[0].tl)
            : 0,
        jumps,
    }
}

export const commits = (label?: string) =>
    harness.events.filter(
        (e) => e.type === "commit" && (!label || e.data.label === label)
    )

/**
 * The spec's `run(...)`: visit, two frames, click `#run`, wait for `done`.
 */
export async function waitForDone(timeout = 60000) {
    await vi.waitFor(() => expect(harness.done).toBe(true), {
        timeout,
        interval: 16,
    })
}

/**
 * chai's `expect(actual).to.be.closeTo(expected, delta)`.
 */
export function expectCloseTo(
    actual: number | null | undefined,
    expected: number,
    delta: number
) {
    expect(actual).not.toBeNull()
    expect(actual).not.toBeUndefined()
    expect(Math.abs(actual! - expected)).toBeLessThanOrEqual(delta)
}
