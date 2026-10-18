/**
 * Port of upstream's `cypress/integration/animate-presence-pop-ref.ts` and its page,
 * `dev/react/src/tests/animate-presence-pop-ref.tsx`.
 *
 * Port note: upstream checks that `PopChild` doesn't trigger React 19's `element.ref` warning
 * with `forwardRef` components. Solid has no `forwardRef`/`useImperativeHandle`: refs are
 * callbacks passed as props, so the components forward a `ref` prop (an imperative handle, or the
 * element directly) and the spec still checks that popping them logs no ref warning.
 */
import type { JSX } from "@solidjs/web"
import { createSignal, Show as SolidShow } from "solid-js"
import { AnimatePresence, motion, Show } from "../../src"
import { query, should, trigger, visit, wait } from "./utils"

const containerStyles = {
    position: "relative",
    display: "flex",
    "flex-direction": "column",
    padding: "100px",
} as const

const boxStyles = {
    width: "100px",
    height: "100px",
    backgroundColor: "red",
}

interface BoxHandle {
    flash: () => void
}

/**
 * Test component exposing an imperative handle through its `ref` prop
 * (upstream: forwardRef + useImperativeHandle).
 */
function Box(props: {
    id: string
    style?: Record<string, string>
    ref?: (handle: BoxHandle) => void
}) {
    let element: HTMLDivElement | undefined

    props.ref?.({
        flash: () => {
            if (element) {
                element.style.opacity = "0.5"
                setTimeout(() => {
                    if (element) {
                        element.style.opacity = "1"
                    }
                }, 100)
            }
        },
    })

    return (
        <motion.div
            ref={(el: HTMLDivElement) => (element = el)}
            id={props.id}
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.001 } }}
            exit={{ opacity: 0, transition: { duration: 10 } }}
            style={{ ...boxStyles, ...props.style }}
        />
    )
}

/**
 * Another test: Component with direct ref forwarding to motion element
 */
function BoxWithDirectRef(props: {
    id: string
    style?: Record<string, string>
    ref?: (element: HTMLDivElement) => void
}) {
    return (
        <motion.div
            ref={props.ref}
            id={props.id}
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.001 } }}
            exit={{ opacity: 0, transition: { duration: 10 } }}
            style={{ ...boxStyles, ...props.style }}
        />
    )
}

function App(props: { type?: string }) {
    const [state, setState] = createSignal(true)
    const testType = () => props.type || "imperative"

    // Upstream's `boxRef`/`directRef`.
    const refs: { box?: BoxHandle; direct?: HTMLDivElement } = {}

    return (
        <div style={containerStyles} onClick={() => setState(!state())}>
            <AnimatePresence mode="popLayout">
                <motion.div
                    id="static"
                    layout
                    style={{ ...boxStyles, backgroundColor: "gray" }}
                />
                <Show when={state()}>
                    <SolidShow
                        when={testType() === "imperative"}
                        fallback={
                            <BoxWithDirectRef
                                id="box"
                                ref={(el) => (refs.direct = el)}
                                style={{ backgroundColor: "blue" }}
                            />
                        }
                    >
                        <Box
                            id="box"
                            ref={(handle) => (refs.box = handle)}
                            style={{ backgroundColor: "green" }}
                        />
                    </SolidShow>
                </Show>
            </AnimatePresence>
            <div id="result" data-state={state() ? "shown" : "hidden"} />
        </div>
    ) as JSX.Element
}

function captureConsole() {
    const consoleErrors: string[] = []
    const error = vi
        .spyOn(console, "error")
        .mockImplementation((msg) => consoleErrors.push(String(msg)))
    const warn = vi
        .spyOn(console, "warn")
        .mockImplementation((msg) => consoleErrors.push(String(msg)))
    onTestFinished(() => {
        error.mockRestore()
        warn.mockRestore()
    })
    return consoleErrors
}

const findRefWarning = (consoleErrors: string[]) =>
    consoleErrors.find(
        (msg) =>
            msg.includes("element.ref") || msg.includes("Accessing element.ref")
    )

describe("AnimatePresence popLayout with refs", () => {
    it("does not trigger React 19 ref warning with forwardRef components using useImperativeHandle", async () => {
        const consoleErrors = captureConsole()

        await visit(App)
        await wait(200)
        // Verify at least the static element exists (always rendered)
        await should(() =>
            expect(document.querySelector("#static")).not.toBeNull()
        )
        // Click to trigger removal and popLayout behavior
        trigger(query("#static").parentElement!, "click", {
            x: 60,
            y: 60,
            force: true,
        })
        await wait(200)
        // Verify no React 19 ref warning was logged
        expect(
            findRefWarning(consoleErrors),
            "Should not have React 19 ref warning"
        ).toBeUndefined()
    })

    it("does not trigger React 19 ref warning with forwardRef components with direct ref", async () => {
        const consoleErrors = captureConsole()

        await visit(App, { type: "direct" })
        await wait(200)
        // Verify at least the static element exists (always rendered)
        await should(() =>
            expect(document.querySelector("#static")).not.toBeNull()
        )
        // Click to trigger removal
        trigger(query("#static").parentElement!, "click", {
            x: 60,
            y: 60,
            force: true,
        })
        await wait(200)
        // Verify no React 19 ref warning was logged
        expect(
            findRefWarning(consoleErrors),
            "Should not have React 19 ref warning"
        ).toBeUndefined()
    })
})
