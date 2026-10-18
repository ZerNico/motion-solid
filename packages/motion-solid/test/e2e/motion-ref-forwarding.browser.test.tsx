/**
 * Port of upstream's `cypress/integration/motion-ref-forwarding.ts` and its page,
 * `dev/react/src/tests/motion-ref-forwarding.tsx`.
 *
 * Port note: Solid refs are callbacks (or arrays of them), called once with the element. There
 * are no ref objects, callback refs aren't called with `null` on unmount and their return value
 * isn't a cleanup. The Solid equivalents are used instead:
 * - RefObject → `ref={variable}` (Solid assigns the element to the variable),
 * - callback ref → a ref callback,
 * - React 19's callback ref cleanup → a two-phase ref (directive factory) whose setup phase
 *   registers `onCleanup`, which runs when the motion component is unmounted.
 */
import { createSignal, createStore, onCleanup, Show } from "solid-js"
import type { JSX } from "@solidjs/web"
import { motion } from "../../src"
import { query, should, trigger, visit, wait } from "./utils"

/**
 * Creates a two-phase ref in the owner of the mounted branch, so its `onCleanup` runs on unmount.
 */
function WithRef<T>(props: {
    create: () => T
    children: (ref: T) => JSX.Element
}) {
    return props.children(props.create())
}

/**
 * Test for ref forwarding behavior in motion components.
 * Tests:
 * 1. RefObject forwarding - ref.current should be set to the DOM element
 * 2. Callback ref forwarding - callback should be called with DOM element on mount, null on unmount
 * 3. Callback ref cleanup (React 19) - cleanup function should be called on unmount
 */
function App() {
    const [mounted, setMounted] = createSignal(true)
    const [results, setResults] = createStore({
        refObjectMounted: false,
        refObjectValue: "none",
        callbackRefMountCalled: false,
        callbackRefMountValue: "none",
        callbackRefUnmountCalled: false,
        callbackRefUnmountValue: "none",
        cleanupCalled: false,
    })

    // Test 1: RefObject
    let refObject: HTMLDivElement | undefined

    // Test 2: Callback ref (with a cleanup, see the port note above)
    const callbackRef = () => {
        onCleanup(() => {
            setResults((prev) => {
                prev.cleanupCalled = true
            })
        })
        return (instance: HTMLDivElement) => {
            setResults((prev) => {
                prev.callbackRefMountCalled = true
                prev.callbackRefMountValue = instance.tagName
            })
        }
    }

    // Check refObject after mount
    const checkRefObject = () => {
        setResults((prev) => {
            prev.refObjectMounted = true
            prev.refObjectValue = refObject?.tagName || "null"
        })
    }

    return (
        <div style={{ padding: "20px" }}>
            <h2>Motion Ref Forwarding Test</h2>

            <button id="toggle" onClick={() => setMounted(!mounted())}>
                {mounted() ? "Unmount" : "Mount"}
            </button>
            <button id="check-ref" onClick={checkRefObject}>
                Check RefObject
            </button>

            <Show when={mounted()}>
                <motion.div
                    id="ref-object-target"
                    ref={refObject}
                    style={{
                        width: 100,
                        height: 100,
                        background: "blue",
                        margin: 10,
                    }}
                >
                    RefObject Target
                </motion.div>

                <WithRef create={callbackRef}>
                    {(ref) => (
                        <motion.div
                            id="callback-ref-target"
                            ref={ref}
                            style={{
                                width: 100,
                                height: 100,
                                background: "green",
                                margin: 10,
                            }}
                        >
                            Callback Ref Target
                        </motion.div>
                    )}
                </WithRef>
            </Show>

            <div
                id="results"
                style={{ "margin-top": "20px", "font-family": "monospace" }}
            >
                <div
                    id="ref-object-mounted"
                    data-value={results.refObjectMounted.toString()}
                >
                    refObject checked: {results.refObjectMounted.toString()}
                </div>
                <div id="ref-object-value" data-value={results.refObjectValue}>
                    refObject.current?.tagName: {results.refObjectValue}
                </div>
                <div
                    id="callback-mount-called"
                    data-value={results.callbackRefMountCalled.toString()}
                >
                    callback ref mount called:{" "}
                    {results.callbackRefMountCalled.toString()}
                </div>
                <div
                    id="callback-mount-value"
                    data-value={results.callbackRefMountValue}
                >
                    callback ref mount value: {results.callbackRefMountValue}
                </div>
                <div
                    id="callback-unmount-called"
                    data-value={results.callbackRefUnmountCalled.toString()}
                >
                    callback ref unmount called:{" "}
                    {results.callbackRefUnmountCalled.toString()}
                </div>
                <div
                    id="cleanup-called"
                    data-value={results.cleanupCalled.toString()}
                >
                    cleanup function called: {results.cleanupCalled.toString()}
                </div>
            </div>
        </div>
    )
}

describe("Motion ref forwarding", () => {
    it("RefObject receives the DOM element", async () => {
        await visit(App)
        await wait(100)
        query("#ref-object-target")
        trigger(query("#check-ref"), "click")
        await wait(50)
        await should(() => {
            expect(query("#ref-object-value").getAttribute("data-value")).toBe(
                "DIV"
            )
        })
    })

    it("Callback ref is called with element on mount", async () => {
        await visit(App)
        await wait(100)
        await should(() => {
            expect(
                query("#callback-mount-called").getAttribute("data-value")
            ).toBe("true")
        })
        await should(() => {
            expect(
                query("#callback-mount-value").getAttribute("data-value")
            ).toBe("DIV")
        })
    })

    it("Callback ref cleanup is handled on unmount", async () => {
        await visit(App)
        await wait(100)
        // Unmount the components
        trigger(query("#toggle"), "click")
        await wait(100)
        // Either cleanup function is called (React 19 pattern)
        // OR callback ref is called with null (React 18 pattern)
        const unmountCalled =
            query("#callback-unmount-called").getAttribute("data-value") ===
            "true"
        const cleanupCalled =
            query("#cleanup-called").getAttribute("data-value") === "true"
        expect(
            unmountCalled || cleanupCalled,
            "Either unmount or cleanup should be called"
        ).toBe(true)
    })
})
