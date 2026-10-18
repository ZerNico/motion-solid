/**
 * Port of upstream's `cypress/integration/animate-presence-exit-no-op.ts` and its page,
 * `dev/react/src/tests/animate-presence-exit-no-op.tsx`.
 *
 * Reproduction for #3078: AnimatePresence won't remove modal if a
 * child animation has a defined exit matching current values.
 *
 * Uses a Portal like the original reproduction (`createPortal`). The modal's dialog
 * uses variants for enter/exit. Children use variants for enter and
 * exit={{ opacity: 1, scale: 1 }} (same as their animated state).
 */
import { Portal, type JSX } from "@solidjs/web"
import { createSignal, For as SolidFor } from "solid-js"
import { AnimatePresence, motion, Show } from "../../src"
import { query, should, trigger, visit, wait } from "./utils"

function Modal(props: { children: JSX.Element; onClose: () => void }) {
    return (
        <Portal mount={document.body}>
            <div
                id="backdrop"
                onClick={() => props.onClose()}
                style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0,0,0,0.5)",
                }}
            />
            <motion.dialog
                id="modal"
                variants={{
                    hidden: { opacity: 0, y: -30 },
                    visible: { opacity: 1, y: 0 },
                }}
                initial="hidden"
                animate="visible"
                exit="hidden"
                transition={{ type: "tween", duration: 0.3 }}
                open
                style={{
                    position: "fixed",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                }}
            >
                {props.children}
            </motion.dialog>
        </Portal>
    )
}

function NewChallenge(props: { onDone: () => void }) {
    return (
        <Modal onClose={() => props.onDone()}>
            <h2>New Challenge</h2>
            <motion.ul
                variants={{
                    visible: {
                        transition: { staggerChildren: 0.05 },
                    },
                }}
                style={{ listStyle: "none", display: "flex", gap: 10 }}
            >
                <SolidFor each={[0, 1]}>
                    {(i) => (
                        <motion.li
                            data-testid={`item-${i}`}
                            variants={{
                                hidden: { opacity: 0, scale: 0.5 },
                                visible: { opacity: 1, scale: 1 },
                            }}
                            exit={{ opacity: 1, scale: 1 }}
                            transition={{ type: "spring", stiffness: 260 }}
                            style={{
                                width: 50,
                                height: 50,
                                background: "coral",
                            }}
                        />
                    )}
                </SolidFor>
            </motion.ul>
            <button id="cancel" onClick={() => props.onDone()}>
                Cancel
            </button>
        </Modal>
    )
}

function App() {
    const [show, setShow] = createSignal(false)

    return (
        <div style={{ padding: "20px" }}>
            <button id="toggle" onClick={() => setShow(true)}>
                Add Challenge
            </button>
            <AnimatePresence mode="wait">
                <Show when={show()}>
                    <NewChallenge onDone={() => setShow(false)} />
                </Show>
            </AnimatePresence>
        </div>
    )
}

describe("AnimatePresence exit no-op (#3078)", () => {
    it("Removes modal when child exit targets match current values", async () => {
        await visit(App)
        await wait(200)
        trigger(query("#toggle"), "click")
        await wait(200)

        // Modal should be visible
        await should(() =>
            expect(document.querySelector("#modal")).not.toBeNull()
        )

        // Wait for enter animations to complete
        await wait(2000)

        // Close the modal via the cancel button
        trigger(query("#cancel"), "click")

        // Modal should be removed promptly. The bug was that
        // value.isAnimating (property access, always truthy) prevented
        // the skip check from working, so exit animations targeting the
        // same values as the current state were never skipped.
        await wait(1000)
        await should(() => expect(document.querySelector("#modal")).toBeNull())
    })
})
