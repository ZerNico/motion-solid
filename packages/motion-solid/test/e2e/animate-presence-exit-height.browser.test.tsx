/**
 * Port of upstream's `cypress/integration/animate-presence-exit-height.ts` and its page,
 * `dev/react/src/tests/animate-presence-exit-height.tsx`.
 */
import { createSignal, For as SolidFor } from "solid-js"
import { AnimatePresence, motion, MotionConfig, Show } from "../../src"
import { query, should, trigger, visit, wait } from "./utils"

const items = [
    { id: "a", title: "Item A", content: "Content for item A" },
    { id: "b", title: "Item B", content: "Content for item B" },
    { id: "c", title: "Item C", content: "Content for item C" },
]

function AccordionItem(props: {
    item: (typeof items)[0]
    isOpen: boolean
    onToggle: () => void
}) {
    return (
        <div>
            <button
                class="trigger"
                data-id={props.item.id}
                onClick={() => props.onToggle()}
            >
                {props.item.title}
            </button>
            <AnimatePresence initial={false}>
                <Show when={props.isOpen}>
                    <motion.div
                        class="panel"
                        data-panel={props.item.id}
                        variants={{
                            open: { height: "auto", opacity: 1 },
                            closed: { height: 0, opacity: 0 },
                        }}
                        initial="closed"
                        animate="open"
                        exit="closed"
                        style={{ overflow: "hidden" }}
                        transition={{
                            type: "tween",
                            ease: "linear",
                            duration: 10,
                        }}
                    >
                        <div style={{ padding: "20px" }}>
                            {props.item.content}
                        </div>
                    </motion.div>
                </Show>
            </AnimatePresence>
        </div>
    )
}

function App() {
    const [openId, setOpenId] = createSignal<string | null>("a")

    return (
        <MotionConfig
            transition={{ type: "tween", ease: "linear", duration: 10 }}
        >
            <div id="accordion" style={{ width: "400px" }}>
                <SolidFor each={items}>
                    {(item) => (
                        <AccordionItem
                            item={item}
                            isOpen={openId() === item.id}
                            onToggle={() =>
                                setOpenId(openId() === item.id ? null : item.id)
                            }
                        />
                    )}
                </SolidFor>
            </div>
        </MotionConfig>
    )
}

const height = (selector: string) =>
    parseFloat(getComputedStyle(query(selector)).height)

describe("AnimatePresence exit with height", () => {
    it("Exit animation is not instant when closing an accordion item", async () => {
        await visit(App)
        await wait(200)
        // Item A starts open — click it to close
        trigger(query('[data-id="a"]'), "click", { force: true })
        // Wait 2s into a 10s linear exit animation (should be ~80% height)
        await wait(2000)
        // If the exit animation is working, height should still be > 0
        // at 20% through a 10s animation
        expect(height('[data-panel="a"]')).toBeGreaterThan(0)
    })

    it("Exit animation eventually removes the element", async () => {
        await visit(App)
        await wait(200)
        trigger(query('[data-id="a"]'), "click", { force: true })
        // Wait for full 10s exit + buffer
        await wait(11000)
        await should(() => {
            expect(document.querySelector('[data-panel="a"]')).toBeNull()
        })
    }, 20000)

    it("Opening a new item while another exits animates both", async () => {
        await visit(App)
        await wait(200)
        // Click item B to open it (closes item A)
        trigger(query('[data-id="b"]'), "click", { force: true })
        await wait(2000)
        // Item A should still be mid-exit (height > 0)
        expect(height('[data-panel="a"]')).toBeGreaterThan(0)
        // Item B should be mid-enter (height > 0)
        expect(height('[data-panel="b"]')).toBeGreaterThan(0)
    })

    it("Interrupting enter animation does not break exit animation", async () => {
        await visit(App)
        await wait(200)
        // Open item B (starts its enter animation, closes item A)
        trigger(query('[data-id="b"]'), "click", { force: true })
        // Wait just 500ms — item B is still mid-enter
        await wait(500)
        // Immediately close item B (interrupt the enter animation)
        trigger(query('[data-id="b"]'), "click", { force: true })
        // Wait 2s into the exit animation
        await wait(2000)
        // The exit animation should still be running, not instant
        expect(height('[data-panel="b"]')).toBeGreaterThan(0)
    })

    it("Switching items mid-enter animates the exit", async () => {
        await visit(App)
        await wait(200)
        // Open item B (starts enter, item A starts exit)
        trigger(query('[data-id="b"]'), "click", { force: true })
        // Wait 500ms — item B is mid-enter
        await wait(500)
        // Switch to item C (interrupts B's enter, B should exit)
        trigger(query('[data-id="c"]'), "click", { force: true })
        // Wait a bit for the exit animation to be in progress
        await wait(2000)
        // Item B should be mid-exit (height > 0)
        expect(height('[data-panel="b"]')).toBeGreaterThan(0)
        // Item C should be mid-enter (height > 0)
        expect(height('[data-panel="c"]')).toBeGreaterThan(0)
    })
})
