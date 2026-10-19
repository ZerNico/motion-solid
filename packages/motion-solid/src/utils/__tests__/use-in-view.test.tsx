import { createEffect, createSignal, flush } from "solid-js"
import { render } from "../../jest.setup"
import { useInView } from "../use-in-view"
import { getActiveObserver } from "./mock-intersection-observer"

// Port note: upstream's `act()`.
const act = (callback: () => void) => {
    callback()
    flush()
}

const target = document.createElement("div")

const enter = () => getActiveObserver()?.([{ target, isIntersecting: true }])

const leave = () => getActiveObserver()?.([{ target, isIntersecting: false }])

describe("useInView", () => {
    // Port note: Solid-only. The refs are read again when the observer starts, untracked.
    test("Doesn't warn about reading signal refs untracked", () => {
        const warn = jest.spyOn(console, "warn")
        const Component = () => {
            const [ref, setRef] = createSignal<Element | null>(null)
            const [root, setRoot] = createSignal<Element | null>(null)
            useInView(ref, { root })
            return (
                <div ref={setRoot}>
                    <div ref={setRef} />
                </div>
            )
        }
        render(() => <Component />)
        expect(warn).not.toHaveBeenCalledWith(
            expect.stringContaining("STRICT_READ_UNTRACKED")
        )
        warn.mockRestore()
    })

    test("Returns false on mount", () => {
        const results: boolean[] = []

        const Component = () => {
            // Port note: a signal set by the ref callback replaces `useRef`.
            const [ref, setRef] = createSignal<Element | null>(null)
            const isInView = useInView(ref)

            createEffect(isInView, (isInView) => {
                if (results[results.length - 1] !== isInView)
                    results.push(isInView)
            })

            return <div ref={setRef} />
        }

        // Port note: upstream re-renders here 4 times, a no-op in Solid.
        render(() => <Component />)

        expect(results).toEqual([false])
    })

    test("Can change initial value", () => {
        const results: boolean[] = []

        const Component = () => {
            // Port note: a signal set by the ref callback replaces `useRef`.
            const [ref, setRef] = createSignal<Element | null>(null)
            const isInView = useInView(ref, { initial: true })

            createEffect(isInView, (isInView) => {
                if (results[results.length - 1] !== isInView)
                    results.push(isInView)
            })

            return <div ref={setRef} />
        }

        // Port note: upstream re-renders here 4 times, a no-op in Solid.
        render(() => <Component />)

        expect(results).toEqual([true])
    })

    test("Returns true when element enters the viewport", async () => {
        const results: boolean[] = []

        const Component = () => {
            // Port note: a signal set by the ref callback replaces `useRef`.
            const [ref, setRef] = createSignal<Element | null>(null)
            const isInView = useInView(ref)

            createEffect(isInView, (isInView) => {
                if (results[results.length - 1] !== isInView)
                    results.push(isInView)
            })

            return <div ref={setRef} />
        }

        render(() => <Component />)
        act(enter)
        act(enter)
        act(enter)
        act(enter)
        act(enter)

        expect(results).toEqual([false, true])
    })

    test("Returns false when element leaves the viewport", async () => {
        const results: boolean[] = []

        const Component = () => {
            // Port note: a signal set by the ref callback replaces `useRef`.
            const [ref, setRef] = createSignal<Element | null>(null)
            const isInView = useInView(ref)

            createEffect(isInView, (isInView) => {
                if (results[results.length - 1] !== isInView)
                    results.push(isInView)
            })

            return <div ref={setRef} />
        }

        render(() => <Component />)
        act(leave)
        act(enter)
        act(leave)
        act(leave)
        act(enter)
        act(leave)

        expect(results).toEqual([false, true, false, true, false])
    })

    test("Only triggers true once, if once is set", async () => {
        const results: boolean[] = []

        const Component = () => {
            // Port note: a signal set by the ref callback replaces `useRef`.
            const [ref, setRef] = createSignal<Element | null>(null)
            const isInView = useInView(ref, { once: true })

            createEffect(isInView, (isInView) => {
                if (results[results.length - 1] !== isInView)
                    results.push(isInView)
            })

            return <div ref={setRef} />
        }

        render(() => <Component />)
        act(leave)
        act(enter)
        act(leave)
        act(leave)
        act(enter)
        act(leave)

        expect(results).toEqual([false, true])
    })
})
