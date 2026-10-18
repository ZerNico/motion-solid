/**
 * Port of upstream's `cypress/integration/animate-presence-radix-dialog.ts` and its page,
 * `dev/react/src/tests/animate-presence-radix-dialog.tsx`.
 *
 * Upstream reproduces issue #3455 (Radix UI's `asChild` creating new callback refs on each render,
 * which remounted `motion` components and broke their exit animations).
 *
 * Port note: Radix UI is React-only. The page is translated to a plain Solid dialog with the same
 * structure: a trigger, and a `Portal` (inside `AnimatePresence`) with the overlay and the dialog
 * content (title, description, close button), the `motion` elements getting their refs and
 * handlers composed by small `asChild`-like wrappers.
 */
import { Portal, type JSX } from "@solidjs/web"
import { createSignal, createUniqueId, merge } from "solid-js"
import { AnimatePresence, motion, Show } from "../../src"
import { query, should, trigger, visit, wait } from "./utils"

/**
 * Like Radix' `asChild` parts: they pass extra props (a ref callback, attributes, handlers) to
 * their single child.
 */
function DialogOverlay(props: {
    children: (props: Record<string, any>) => JSX.Element
}) {
    return props.children({
        ref: (el: HTMLElement) => (el.dataset.state = "open"),
        "data-dialog-overlay": "",
    })
}

function DialogContent(props: {
    onEscape: () => void
    children: (props: Record<string, any>) => JSX.Element
}) {
    return props.children({
        ref: (el: HTMLElement) => (el.dataset.state = "open"),
        role: "dialog",
        onKeyDown: (event: KeyboardEvent) => {
            if (event.key === "Escape") props.onEscape()
        },
    })
}

function App() {
    const id = createUniqueId()
    const [isOpen, setIsOpen] = createSignal(false)
    const [exitComplete, setExitComplete] = createSignal(false)
    const [exitStarted, setExitStarted] = createSignal(false)

    return (
        <div class="App" style={{ padding: "20px" }}>
            <style>{`
                .overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.5);
                }
                .dialog {
                    position: fixed;
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    width: 300px;
                }
            `}</style>

            <button
                id="trigger"
                aria-controls={id}
                aria-expanded={isOpen() ? "true" : "false"}
                onClick={() => setIsOpen(!isOpen())}
            >
                {isOpen() ? "Close" : "Open"}
            </button>
            <AnimatePresence onExitComplete={() => setExitComplete(true)}>
                <Show when={isOpen()}>
                    <Portal mount={document.body}>
                        <DialogOverlay>
                            {(slotProps) => (
                                <motion.div
                                    {...merge(slotProps, {
                                        id: "overlay",
                                        class: "overlay",
                                    })}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    initial={{ opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    onAnimationStart={(definition: any) => {
                                        if (
                                            definition === "exit" ||
                                            (typeof definition === "object" &&
                                                "opacity" in definition &&
                                                definition.opacity === 0)
                                        ) {
                                            setExitStarted(true)
                                        }
                                    }}
                                />
                            )}
                        </DialogOverlay>

                        <DialogContent onEscape={() => setIsOpen(false)}>
                            {(slotProps) => (
                                <motion.div
                                    {...merge(slotProps, {
                                        id: "dialog",
                                        class: "dialog",
                                    })}
                                    animate={{
                                        left: "50%",
                                        bottom: "50%",
                                        y: "50%",
                                        x: "-50%",
                                    }}
                                    exit={{
                                        left: "50%",
                                        bottom: 0,
                                        y: "100%",
                                        x: "-50%",
                                    }}
                                    initial={{
                                        left: "50%",
                                        bottom: 0,
                                        y: "100%",
                                        x: "-50%",
                                    }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <h2 id={`${id}-title`}>Dialog Title</h2>

                                    <p id={`${id}-description`}>
                                        Dialog content here
                                    </p>

                                    <button
                                        id="close"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        Close
                                    </button>
                                </motion.div>
                            )}
                        </DialogContent>
                    </Portal>
                </Show>
            </AnimatePresence>

            <div id="status" style={{ "margin-top": "20px" }}>
                <div id="exit-started" data-value={exitStarted().toString()}>
                    Exit started: {exitStarted().toString()}
                </div>
                <div id="exit-complete" data-value={exitComplete().toString()}>
                    Exit complete: {exitComplete().toString()}
                </div>
            </div>
        </div>
    )
}

describe("AnimatePresence with Radix UI Dialog", () => {
    it("Exit animations work correctly with Radix Dialog asChild", async () => {
        await visit(App)
        await wait(100)
        // Open the dialog
        trigger(query("#trigger"), "click")
        await wait(500)
        // Verify dialog is open
        await should(() =>
            expect(document.querySelector("#dialog")).not.toBeNull()
        )
        await should(() =>
            expect(document.querySelector("#overlay")).not.toBeNull()
        )
        // Close the dialog
        trigger(query("#close"), "click")
        // Wait for exit animation to complete
        await wait(600)
        // Verify exit animation completed (onExitComplete was called)
        await should(() =>
            expect(query("#exit-complete").dataset.value).toBe("true")
        )
        // Verify the dialog elements are removed from DOM after exit
        await should(() => expect(document.querySelector("#dialog")).toBeNull())
        await should(() =>
            expect(document.querySelector("#overlay")).toBeNull()
        )
    })

    it("Exit animation actually runs (not immediately removed)", async () => {
        await visit(App)
        await wait(100)
        // Open the dialog
        trigger(query("#trigger"), "click")
        await wait(500)
        // Verify dialog is open
        await should(() =>
            expect(document.querySelector("#overlay")).not.toBeNull()
        )
        // Close the dialog
        trigger(query("#close"), "click")
        // Check immediately - overlay should still exist during exit animation
        await should(() =>
            expect(document.querySelector("#overlay")).not.toBeNull()
        )
        // Wait a small amount for animation to start but not complete
        await wait(100)
        // Overlay should still be animating out
        await should(() =>
            expect(document.querySelector("#overlay")).not.toBeNull()
        )
        // Now wait for full animation
        await wait(400)
        // Now it should be gone
        await should(() =>
            expect(document.querySelector("#overlay")).toBeNull()
        )
    })
})
